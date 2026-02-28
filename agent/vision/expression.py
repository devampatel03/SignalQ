"""
SignalIQ — Facial Expression Recognition (FER) Module

Classifies facial expressions from cropped face images.
Uses the `fer` library (backed by a Keras CNN) for the MVP.
Can be swapped to DeepFace or a custom AffectNet-trained model
for production accuracy.

This is the core ML that makes SignalIQ unique — reading what
prospects actually feel, not just what they say.
"""

import logging
from typing import Optional

import numpy as np

from agent.config import config
from agent.storage.models import Emotion, ExpressionResult

logger = logging.getLogger(__name__)


class ExpressionClassifier:
    """
    Classifies facial expressions on cropped face images.

    Uses FER library with MTCNN detector disabled (we already have
    face crops from our FaceDetector).
    """

    def __init__(self):
        self._model = None
        self._initialized = False
        self.confidence_threshold = config.vision.expression_confidence_threshold

    def _lazy_init(self):
        """Lazy initialization to avoid loading model at import time."""
        if self._initialized:
            return

        try:
            from fer import FER
            # mtcnn=False since we already have face crops
            self._model = FER(mtcnn=False)
            self._initialized = True
            logger.info("FER expression classifier initialized")
        except ImportError:
            logger.warning(
                "FER library not installed. Install with: pip install fer"
            )
            self._initialized = True  # Don't retry
        except Exception as e:
            logger.error(f"Failed to initialize FER: {e}")
            self._initialized = True

    def classify(self, face_crop: np.ndarray, timestamp: float = 0.0) -> ExpressionResult:
        """
        Classify the expression on a cropped face image.

        Args:
            face_crop: RGB numpy array of a cropped face
            timestamp: Frame timestamp for event correlation

        Returns:
            ExpressionResult with dominant emotion and confidence scores
        """
        self._lazy_init()

        if self._model is None:
            return self._fallback_result(timestamp)

        try:
            # FER expects BGR format
            import cv2
            bgr_crop = cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR)

            # Analyze expression
            result = self._model.detect_emotions(bgr_crop)

            if not result or len(result) == 0:
                return self._fallback_result(timestamp)

            # Take the first (and usually only) face result
            emotions = result[0].get("emotions", {})

            if not emotions:
                return self._fallback_result(timestamp)

            # Map FER emotion names to our Emotion enum
            mapped = self._map_emotions(emotions)

            # Find dominant emotion
            dominant = max(mapped, key=mapped.get)
            confidence = mapped[dominant]

            # Suppress low-confidence detections
            if confidence < self.confidence_threshold:
                return ExpressionResult(
                    dominant_emotion=Emotion.NEUTRAL,
                    confidence=confidence,
                    all_emotions=mapped,
                    timestamp=timestamp,
                )

            return ExpressionResult(
                dominant_emotion=Emotion(dominant),
                confidence=confidence,
                all_emotions=mapped,
                timestamp=timestamp,
            )

        except Exception as e:
            logger.debug(f"Expression classification error: {e}")
            return self._fallback_result(timestamp)

    def _map_emotions(self, fer_emotions: dict) -> dict[str, float]:
        """Map FER library emotion names to our Emotion enum values."""
        mapping = {
            "angry": Emotion.ANGRY.value,
            "disgust": Emotion.DISGUST.value,
            "fear": Emotion.FEAR.value,
            "happy": Emotion.HAPPY.value,
            "sad": Emotion.SAD.value,
            "surprise": Emotion.SURPRISE.value,
            "neutral": Emotion.NEUTRAL.value,
        }
        return {
            mapping.get(k, k): v
            for k, v in fer_emotions.items()
            if k in mapping
        }

    def _fallback_result(self, timestamp: float = 0.0) -> ExpressionResult:
        """Return neutral result when detection fails."""
        return ExpressionResult(
            dominant_emotion=Emotion.NEUTRAL,
            confidence=0.0,
            all_emotions={e.value: 0.0 for e in Emotion},
            timestamp=timestamp,
        )


class MicroExpressionDetector:
    """
    Detects micro-expressions by analyzing temporal patterns.

    Micro-expressions last 200-500ms and often contradict the
    macro expression. These are the signals that prospects can't
    fake — the truth leaks in 200ms.
    """

    def __init__(self, fps: int = 10):
        self.fps = fps
        self._history: list[ExpressionResult] = []
        self._max_history = fps * 2  # 2 seconds of history

    def update(self, expression: ExpressionResult) -> Optional[dict]:
        """
        Update with a new expression and check for micro-expressions.

        Returns:
            Dict with micro-expression info if detected, None otherwise.
        """
        self._history.append(expression)
        if len(self._history) > self._max_history:
            self._history.pop(0)

        if len(self._history) < 3:
            return None

        return self._detect_flash()

    def _detect_flash(self) -> Optional[dict]:
        """
        Detect a brief emotion flash that differs from the surrounding context.

        Pattern: [neutral...] [contempt 200-500ms] [neutral...]
        """
        if len(self._history) < 5:
            return None

        # Look at the last 5 frames
        recent = self._history[-5:]
        dominant_emotions = [r.dominant_emotion for r in recent]

        # Check for contempt flash pattern
        # Middle frame(s) differ from surrounding frames
        surrounding = [dominant_emotions[0], dominant_emotions[-1]]
        middle = dominant_emotions[1:-1]

        for i, mid_emotion in enumerate(middle):
            if mid_emotion != Emotion.NEUTRAL and mid_emotion not in surrounding:
                if mid_emotion == Emotion.CONTEMPT or mid_emotion == Emotion.DISGUST:
                    # Duration check: 200-500ms at our FPS
                    flash_frames = sum(1 for e in middle if e == mid_emotion)
                    duration_ms = (flash_frames / self.fps) * 1000

                    if 150 <= duration_ms <= 600:
                        return {
                            "type": "micro_expression",
                            "emotion": mid_emotion.value,
                            "duration_ms": duration_ms,
                            "confidence": recent[i + 1].confidence,
                        }

        return None
