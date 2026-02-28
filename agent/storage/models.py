"""
SignalIQ — Data Models

All data structures used across the pipeline: signal events, sessions,
expression results, engagement states, and database models.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


# ─────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────

class Emotion(str, Enum):
    """Primary emotions tracked by FER classifier."""
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    SURPRISE = "surprise"
    FEAR = "fear"
    DISGUST = "disgust"
    NEUTRAL = "neutral"
    CONTEMPT = "contempt"      # Derived: asymmetric lip detection
    CONFUSION = "confusion"    # Derived: brow furrow + head tilt


class EnergyTrajectory(str, Enum):
    """Prospect's energy direction over time."""
    RISING = "rising"
    STABLE = "stable"
    DECLINING = "declining"


class SignalType(str, Enum):
    """Types of actionable signals detected."""
    INTEREST_SPIKE = "interest_spike"
    CONTEMPT_FLASH = "contempt_flash"
    CONFUSION = "confusion"
    DISENGAGEMENT = "disengagement"
    STRESS = "stress"
    AGREEMENT_CASCADE = "agreement_cascade"
    ENGAGEMENT_DROP = "engagement_drop"
    ENGAGEMENT_RISE = "engagement_rise"


class Speaker(str, Enum):
    """Speaker identification for transcript segments."""
    REP = "rep"
    PROSPECT = "prospect"
    UNKNOWN = "unknown"


# ─────────────────────────────────────────────
# Vision Pipeline Models
# ─────────────────────────────────────────────

@dataclass
class FaceBBox:
    """Bounding box for a detected face."""
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float
    person_id: Optional[str] = None

    @property
    def width(self) -> int:
        return self.x2 - self.x1

    @property
    def height(self) -> int:
        return self.y2 - self.y1

    @property
    def center(self) -> tuple[int, int]:
        return ((self.x1 + self.x2) // 2, (self.y1 + self.y2) // 2)


@dataclass
class ExpressionResult:
    """Result from FER expression classification on a single face."""
    dominant_emotion: Emotion
    confidence: float
    all_emotions: dict[str, float]  # emotion_name -> confidence score
    timestamp: float = 0.0


@dataclass
class HeadPose:
    """Head orientation estimation."""
    pitch: float = 0.0  # Up/down (nodding)
    yaw: float = 0.0    # Left/right (head shake)
    roll: float = 0.0   # Tilt
    is_nodding: bool = False
    is_shaking: bool = False
    lean_direction: str = "neutral"  # "forward", "backward", "neutral"


@dataclass
class FaceAnalysis:
    """Complete analysis result for a single face in a frame."""
    bbox: FaceBBox
    expression: ExpressionResult
    head_pose: Optional[HeadPose] = None
    gaze_on_screen: bool = True
    blink_rate: Optional[float] = None  # Blinks per minute


# ─────────────────────────────────────────────
# Intelligence Layer Models
# ─────────────────────────────────────────────

@dataclass
class SignalState:
    """Current state of the prospect signal aggregator."""
    engagement_score: float = 50.0
    dominant_emotion: str = "neutral"
    confidence: float = 0.0
    energy_trajectory: EnergyTrajectory = EnergyTrajectory.STABLE
    should_trigger_whisper: bool = False
    whisper_context: Optional[str] = None
    active_signals: list[str] = field(default_factory=list)
    last_whisper_time: float = 0.0

    def to_dict(self) -> dict:
        """Serialize for Gemini context injection."""
        return {
            "engagement_score": round(self.engagement_score, 1),
            "dominant_emotion": self.dominant_emotion,
            "confidence": round(self.confidence, 2),
            "energy_trajectory": self.energy_trajectory.value,
            "active_signals": self.active_signals,
        }


@dataclass
class WhisperEvent:
    """A triggered whisper recommendation."""
    text: Optional[str] = None
    trigger_signal: SignalType = SignalType.INTEREST_SPIKE
    confidence: float = 0.0
    timestamp: float = 0.0
    topic_context: Optional[str] = None


# ─────────────────────────────────────────────
# Session / Storage Models
# ─────────────────────────────────────────────

@dataclass
class Session:
    """A recorded call session."""
    id: str = ""
    rep_name: str = ""
    prospect_name: str = ""
    prospect_title: str = ""
    prospect_company: str = ""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    avg_engagement: float = 0.0
    total_whispers: int = 0


@dataclass
class StoredSignalEvent:
    """A signal event persisted to the database."""
    id: int = 0
    session_id: str = ""
    timestamp: float = 0.0
    emotion: str = ""
    confidence: float = 0.0
    engagement_score: float = 0.0
    signal_type: Optional[str] = None
    metadata_json: Optional[str] = None


@dataclass
class TranscriptSegment:
    """A segment of transcribed speech."""
    session_id: str = ""
    timestamp: float = 0.0
    speaker: Speaker = Speaker.UNKNOWN
    text: str = ""
    duration_seconds: float = 0.0
