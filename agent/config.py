"""
SignalIQ — Centralized Configuration

All tunable thresholds, model paths, and settings live here.
Never hardcode thresholds in other modules — import from config.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class VisionConfig:
    """Face detection and expression analysis settings."""
    # YOLO face detection
    yolo_model_path: str = "yolo11n-pose.pt"
    yolo_confidence_threshold: float = 0.5
    yolo_device: str = "cpu"  # "cuda" for GPU

    # FER expression classification
    expression_confidence_threshold: float = 0.72
    temporal_smoothing_frames: int = 5  # Rolling average window
    min_face_size: int = 48  # Minimum face crop size in pixels

    # Processor FPS
    processor_fps: int = 10  # FER analysis frame rate


@dataclass
class IntelligenceConfig:
    """Signal aggregation and engagement scoring settings."""
    # Engagement scoring
    engagement_window_seconds: int = 30  # Rolling window for engagement score
    engagement_weights: dict = field(default_factory=lambda: {
        "expression": 0.40,
        "head_movement": 0.25,
        "gaze": 0.20,
        "lean": 0.15,
    })

    # Whisper trigger logic
    whisper_cooldown_seconds: int = 90  # Minimum gap between whispers
    whisper_trigger_confidence: float = 0.75  # Minimum confidence to trigger
    whisper_max_words: int = 15  # Maximum words per whisper

    # Signal thresholds
    interest_spike_duration_seconds: float = 3.0
    confusion_duration_seconds: float = 5.0
    disengagement_trend_seconds: float = 60.0
    contempt_flash_max_ms: int = 500
    contempt_flash_min_ms: int = 200


@dataclass
class LLMConfig:
    """LLM integration settings."""
    # Gemini Live (real-time reasoning)
    gemini_model: str = "gemini-2.5-flash"
    gemini_fps: int = 1  # Frames sent to Gemini per second
    gemini_signal_interval_seconds: int = 15  # Signal summary interval

    # Debrief generation
    debrief_model: str = "gemini-2.5-flash"  # Or claude-3-5-sonnet if Anthropic key available


@dataclass
class AudioConfig:
    """STT and TTS settings."""
    # Deepgram STT
    stt_model: str = "nova-3"
    stt_language: str = "en"

    # ElevenLabs TTS
    tts_voice_id: str = "VR6AewLTigWG4xSOukaG"  # Default calm voice
    tts_model_id: str = "eleven_multilingual_v2"


@dataclass
class StorageConfig:
    """Database and storage settings."""
    db_path: str = "signaliq_sessions.db"


@dataclass
class SignalIQConfig:
    """Root configuration object."""
    vision: VisionConfig = field(default_factory=VisionConfig)
    intelligence: IntelligenceConfig = field(default_factory=IntelligenceConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    audio: AudioConfig = field(default_factory=AudioConfig)
    storage: StorageConfig = field(default_factory=StorageConfig)

    # Agent identity
    agent_name: str = "SignalIQ"
    agent_id: str = "signaliq-agent"


# Global singleton — import this in other modules
config = SignalIQConfig()
