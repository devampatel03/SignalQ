"""
SignalIQ — Engagement Scorer

Computes a rolling 0-100 engagement score for a prospect based on
multiple signal inputs: facial expressions, head movement, gaze, and lean.

The engagement score is the single most visible metric on the rep's
overlay — it needs to be responsive but not jittery.
"""

import time
from collections import deque
from dataclasses import dataclass

from agent.config import config
from agent.storage.models import Emotion, ExpressionResult, EnergyTrajectory


@dataclass
class EngagementSample:
    """A single engagement data point."""
    timestamp: float
    expression_score: float  # 0-100 from expression data
    head_movement_score: float = 50.0
    gaze_score: float = 50.0
    lean_score: float = 50.0


class EngagementScorer:
    """
    Computes rolling engagement score using weighted inputs.

    Engagement Formula:
        score = (expression * 0.40) + (head_movement * 0.25)
              + (gaze * 0.20) + (lean * 0.15)

    Uses a rolling window (default 30s) with exponential decay
    to weight recent samples more heavily.
    """

    # Expression → engagement score mapping
    EMOTION_ENGAGEMENT = {
        Emotion.HAPPY: 85,
        Emotion.SURPRISE: 75,
        Emotion.NEUTRAL: 50,
        Emotion.CONFUSION: 40,
        Emotion.SAD: 30,
        Emotion.FEAR: 35,
        Emotion.ANGRY: 25,
        Emotion.DISGUST: 20,
        Emotion.CONTEMPT: 25,
    }

    def __init__(self):
        self.window_seconds = config.intelligence.engagement_window_seconds
        self.weights = config.intelligence.engagement_weights
        self._samples: deque[EngagementSample] = deque()
        self._current_score: float = 50.0
        self._score_history: deque[float] = deque(maxlen=300)  # ~30s at 10fps

    @property
    def current_score(self) -> float:
        return self._current_score

    @property
    def trajectory(self) -> EnergyTrajectory:
        """Determine if engagement is rising, stable, or declining."""
        if len(self._score_history) < 20:
            return EnergyTrajectory.STABLE

        recent = list(self._score_history)
        # Compare last 3 seconds vs previous 3 seconds
        recent_avg = sum(recent[-30:]) / max(len(recent[-30:]), 1)
        earlier_avg = sum(recent[-60:-30]) / max(len(recent[-60:-30]), 1)

        diff = recent_avg - earlier_avg
        if diff > 5:
            return EnergyTrajectory.RISING
        elif diff < -5:
            return EnergyTrajectory.DECLINING
        return EnergyTrajectory.STABLE

    def update(self, expression: ExpressionResult) -> float:
        """
        Update engagement score with new expression data.

        Args:
            expression: Latest expression classification result

        Returns:
            Updated engagement score (0-100)
        """
        now = time.time()

        # Convert expression to engagement score component
        expr_score = self.EMOTION_ENGAGEMENT.get(
            expression.dominant_emotion, 50
        )
        # Scale by confidence
        expr_score = expr_score * expression.confidence + 50 * (1 - expression.confidence)

        sample = EngagementSample(
            timestamp=now,
            expression_score=expr_score,
        )
        self._samples.append(sample)

        # Prune old samples outside window
        cutoff = now - self.window_seconds
        while self._samples and self._samples[0].timestamp < cutoff:
            self._samples.popleft()

        # Compute weighted average with exponential decay
        self._current_score = self._compute_weighted_score(now)
        self._score_history.append(self._current_score)

        return self._current_score

    def _compute_weighted_score(self, now: float) -> float:
        """Compute engagement using exponential decay weighting."""
        if not self._samples:
            return 50.0

        total_weight = 0.0
        weighted_sum = 0.0
        decay_rate = 0.1  # Higher = more weight on recent

        for sample in self._samples:
            age = now - sample.timestamp
            weight = 2.718 ** (-decay_rate * age)  # e^(-λt)

            # Weighted combination of all input signals
            score = (
                sample.expression_score * self.weights.get("expression", 0.4)
                + sample.head_movement_score * self.weights.get("head_movement", 0.25)
                + sample.gaze_score * self.weights.get("gaze", 0.2)
                + sample.lean_score * self.weights.get("lean", 0.15)
            )

            weighted_sum += score * weight
            total_weight += weight

        if total_weight == 0:
            return 50.0

        return max(0.0, min(100.0, weighted_sum / total_weight))

    def reset(self):
        """Reset scorer for a new session."""
        self._samples.clear()
        self._score_history.clear()
        self._current_score = 50.0
