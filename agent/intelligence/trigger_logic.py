"""
SignalIQ — Whisper Trigger Logic

The decision engine that determines WHEN to whisper to the rep.
The core principle: whisper sparingly. Quality >> quantity.

A rep who gets 2 high-quality whispers per 45-minute call will trust
the system far more than one who gets 12 mediocre ones.
"""

import time
from typing import Optional

from agent.config import config
from agent.storage.models import SignalState, SignalType, WhisperEvent


class TriggerLogic:
    """
    Decides whether a signal is strong enough to trigger a whisper.

    Rules:
    1. Minimum 90-second cooldown between whispers
    2. Minimum 0.75 confidence threshold
    3. Prioritize: opportunity signals > warning signals
    4. Never whisper when rep is mid-sentence
    5. When in doubt, don't whisper
    """

    # Signal priority (higher = more likely to trigger)
    SIGNAL_PRIORITY = {
        SignalType.AGREEMENT_CASCADE: 5,   # Opportunity — push now!
        SignalType.INTEREST_SPIKE: 4,      # Opportunity — go deeper
        SignalType.CONTEMPT_FLASH: 3,      # Warning — pivot topic
        SignalType.CONFUSION: 2,           # Warning — clarify
        SignalType.DISENGAGEMENT: 2,       # Warning — re-engage
        SignalType.STRESS: 1,              # Info — slow down
        SignalType.ENGAGEMENT_DROP: 1,     # Info — general decline
        SignalType.ENGAGEMENT_RISE: 0,     # Positive — no action needed
    }

    def __init__(self):
        self._last_whisper_time: float = 0.0
        self._whisper_count: int = 0
        self._rep_is_speaking: bool = False
        self.cooldown = config.intelligence.whisper_cooldown_seconds
        self.min_confidence = config.intelligence.whisper_trigger_confidence

    @property
    def whisper_count(self) -> int:
        return self._whisper_count

    def set_rep_speaking(self, is_speaking: bool):
        """Update whether the rep is currently mid-sentence."""
        self._rep_is_speaking = is_speaking

    def evaluate(self, state: SignalState) -> Optional[WhisperEvent]:
        """
        Evaluate whether the current signal state should trigger a whisper.

        Args:
            state: Current signal aggregator state

        Returns:
            WhisperEvent if a whisper should be triggered, None otherwise
        """
        now = time.time()

        # Rule 1: Cooldown check
        if now - self._last_whisper_time < self.cooldown:
            return None

        # Rule 4: Never interrupt rep mid-sentence
        if self._rep_is_speaking:
            return None

        # Must have active signals
        if not state.should_trigger_whisper or not state.active_signals:
            return None

        # Find the highest priority signal
        best_signal = self._find_best_signal(state)
        if best_signal is None:
            return None

        # Rule 2: Confidence threshold
        if state.confidence < self.min_confidence:
            return None

        # Trigger the whisper
        self._last_whisper_time = now
        self._whisper_count += 1

        return WhisperEvent(
            text=state.whisper_context,
            trigger_signal=best_signal,
            confidence=state.confidence,
            timestamp=now,
            topic_context=state.whisper_context,
        )

    def _find_best_signal(self, state: SignalState) -> Optional[SignalType]:
        """Find the highest priority active signal."""
        best_priority = -1
        best_signal = None

        for signal_str in state.active_signals:
            try:
                signal = SignalType(signal_str)
                priority = self.SIGNAL_PRIORITY.get(signal, 0)
                if priority > best_priority:
                    best_priority = priority
                    best_signal = signal
            except ValueError:
                continue

        return best_signal

    def reset(self):
        """Reset for a new session."""
        self._last_whisper_time = 0.0
        self._whisper_count = 0
        self._rep_is_speaking = False
