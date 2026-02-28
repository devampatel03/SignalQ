"""
SignalIQ — Signal Aggregator (State Machine)

The intelligence layer that converts raw face detections into actionable
signals. This is where individual expression readings become meaningful
patterns: interest spikes, contempt flashes, confusion periods, and
disengagement trends.

This is the brain of SignalIQ — it decides WHAT is happening, while
the trigger logic decides WHETHER to whisper about it.
"""

import time
from collections import deque
from typing import Optional

from agent.config import config
from agent.intelligence.engagement_scorer import EngagementScorer
from agent.storage.models import (
    Emotion,
    EnergyTrajectory,
    ExpressionResult,
    FaceAnalysis,
    SignalState,
    SignalType,
)
from agent.vision.expression import MicroExpressionDetector


class SignalAggregator:
    """
    State machine that tracks prospect signals over time.

    Maintains per-participant state including:
    - Emotion timeline (last N expressions)
    - Engagement score (rolling 30s window)
    - Micro-expression detection
    - Signal event queue for trigger evaluation
    """

    def __init__(self):
        self.engagement_scorer = EngagementScorer()
        self.micro_detector = MicroExpressionDetector(
            fps=config.vision.processor_fps
        )

        # Temporal state
        self._expression_history: deque[ExpressionResult] = deque(
            maxlen=config.vision.processor_fps * 10  # 10 seconds
        )
        self._smoothing_window: deque[ExpressionResult] = deque(
            maxlen=config.vision.temporal_smoothing_frames
        )
        self._active_signals: list[dict] = []
        self._signal_events: deque[dict] = deque(maxlen=100)

        # Current state
        self._current_state = SignalState()
        self._last_dominant_emotion: Optional[Emotion] = None
        self._emotion_start_time: float = 0.0

    @property
    def state(self) -> SignalState:
        return self._current_state

    def update(
        self,
        expressions: list[ExpressionResult],
        timestamp: float = 0.0,
    ) -> SignalState:
        """
        Update the signal state with new expression data from all detected faces.

        Args:
            expressions: Expression results for each detected face
            timestamp: Current frame timestamp

        Returns:
            Updated SignalState
        """
        if not expressions:
            return self._current_state

        # Use the primary prospect face (first detected)
        primary = expressions[0]

        # Apply temporal smoothing
        smoothed = self._smooth_expression(primary)

        # Update engagement score
        engagement = self.engagement_scorer.update(smoothed)

        # Check for micro-expressions
        micro = self.micro_detector.update(smoothed)
        if micro:
            self._signal_events.append({
                "type": SignalType.CONTEMPT_FLASH,
                "timestamp": timestamp,
                "confidence": micro["confidence"],
                "emotion": micro["emotion"],
                "duration_ms": micro["duration_ms"],
            })

        # Track emotion duration for sustained signal detection
        self._track_emotion_duration(smoothed, timestamp)

        # Detect actionable signals
        signals = self._detect_signals(smoothed, engagement, timestamp)

        # Update current state
        self._current_state = SignalState(
            engagement_score=engagement,
            dominant_emotion=smoothed.dominant_emotion.value,
            confidence=smoothed.confidence,
            energy_trajectory=self.engagement_scorer.trajectory,
            should_trigger_whisper=len(signals) > 0,
            whisper_context=signals[0]["context"] if signals else None,
            active_signals=[s["type"].value for s in signals],
        )

        # Store in history
        self._expression_history.append(smoothed)

        return self._current_state

    def _smooth_expression(self, expression: ExpressionResult) -> ExpressionResult:
        """
        Apply temporal smoothing to reduce flickering false positives.
        Uses a rolling average over the smoothing window.
        """
        self._smoothing_window.append(expression)

        if len(self._smoothing_window) < 2:
            return expression

        # Average confidence scores across window for each emotion
        avg_emotions: dict[str, float] = {}
        for e_name in expression.all_emotions:
            values = [
                ex.all_emotions.get(e_name, 0.0)
                for ex in self._smoothing_window
            ]
            avg_emotions[e_name] = sum(values) / len(values)

        # Find dominant from smoothed scores
        dominant_key = max(avg_emotions, key=avg_emotions.get)
        try:
            dominant = Emotion(dominant_key)
        except ValueError:
            dominant = Emotion.NEUTRAL

        return ExpressionResult(
            dominant_emotion=dominant,
            confidence=avg_emotions.get(dominant_key, 0.0),
            all_emotions=avg_emotions,
            timestamp=expression.timestamp,
        )

    def _track_emotion_duration(
        self, expression: ExpressionResult, timestamp: float
    ):
        """Track how long the current dominant emotion has been sustained."""
        if expression.dominant_emotion != self._last_dominant_emotion:
            self._last_dominant_emotion = expression.dominant_emotion
            self._emotion_start_time = timestamp

    def _detect_signals(
        self,
        expression: ExpressionResult,
        engagement: float,
        timestamp: float,
    ) -> list[dict]:
        """
        Detect actionable signals from current state.

        Returns list of signal dicts with type, confidence, and context.
        """
        signals = []
        duration = timestamp - self._emotion_start_time if self._emotion_start_time else 0

        # Interest spike: surprise/happy sustained for 3+ seconds
        if (
            expression.dominant_emotion in (Emotion.SURPRISE, Emotion.HAPPY)
            and expression.confidence > config.intelligence.whisper_trigger_confidence
            and duration >= config.intelligence.interest_spike_duration_seconds
        ):
            signals.append({
                "type": SignalType.INTEREST_SPIKE,
                "confidence": expression.confidence,
                "context": "Strong interest signal detected — go deeper on current topic",
            })

        # Confusion: brow furrow for 5+ seconds
        if (
            expression.dominant_emotion == Emotion.CONFUSION
            and duration >= config.intelligence.confusion_duration_seconds
        ):
            signals.append({
                "type": SignalType.CONFUSION,
                "confidence": expression.confidence,
                "context": "Prospect looks uncertain — clarify current point",
            })

        # Disengagement: engagement below 35 for 60+ seconds
        if (
            engagement < 35
            and self.engagement_scorer.trajectory == EnergyTrajectory.DECLINING
        ):
            signals.append({
                "type": SignalType.DISENGAGEMENT,
                "confidence": 0.8,
                "context": "Engagement dropping — ask a direct question",
            })

        # Agreement cascade: engagement above 80 and rising
        if (
            engagement > 80
            and self.engagement_scorer.trajectory == EnergyTrajectory.RISING
        ):
            signals.append({
                "type": SignalType.AGREEMENT_CASCADE,
                "confidence": 0.85,
                "context": "Strong momentum — this is your moment to push",
            })

        return signals

    def reset(self):
        """Reset for a new session."""
        self.engagement_scorer.reset()
        self._expression_history.clear()
        self._smoothing_window.clear()
        self._active_signals.clear()
        self._signal_events.clear()
        self._current_state = SignalState()
        self._last_dominant_emotion = None
        self._emotion_start_time = 0.0
