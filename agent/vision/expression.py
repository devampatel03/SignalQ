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
        """Lazy initialization — tries FER, then DeepFace, then basic fallback."""
        if self._initialized:
            return

        # Attempt 1: FER library (Keras CNN)
        try:
            from fer import FER
            self._model = FER(mtcnn=False)
            self._backend = "fer"
            self._initialized = True
            logger.info("FER expression classifier initialized (fer backend)")
            return
        except Exception as e:
            logger.warning(f"FER backend failed: {type(e).__name__}: {e}")

        # Attempt 2: DeepFace — pre-download weights then test
        try:
            from deepface import DeepFace
            self._ensure_deepface_weights()

            import time
            _test = np.zeros((48, 48, 3), dtype=np.uint8)

            # Retry up to 2 times (DeepFace lazy-downloads on first call)
            for attempt in range(2):
                try:
                    DeepFace.analyze(
                        _test,
                        actions=["emotion"],
                        enforce_detection=False,
                        silent=True,
                    )
                    self._model = DeepFace
                    self._backend = "deepface"
                    self._initialized = True
                    logger.info("FER expression classifier initialized (deepface backend)")
                    return
                except Exception as retry_err:
                    if attempt == 0:
                        logger.info(f"DeepFace init attempt 1 failed, retrying: {retry_err}")
                        time.sleep(2)
                    else:
                        raise retry_err
        except Exception as e:
            logger.warning(f"DeepFace backend failed: {type(e).__name__}: {e}")

        # Attempt 3: No ML model available — use basic heuristic fallback
        logger.warning(
            "No FER backend available. Using basic fallback. "
            "Install with: pip install fer  OR  pip install deepface"
        )
        self._model = None
        self._backend = "none"
        self._initialized = True

    @staticmethod
    def _ensure_deepface_weights():
        """Pre-download DeepFace emotion model weights if missing."""
        import os
        weights_dir = os.path.join(os.path.expanduser("~"), ".deepface", "weights")
        weights_file = os.path.join(weights_dir, "facial_expression_model_weights.h5")

        if os.path.exists(weights_file):
            return

        os.makedirs(weights_dir, exist_ok=True)
        url = "https://github.com/serengil/deepface_models/releases/download/v1.0/facial_expression_model_weights.h5"

        logger.info(f"Downloading DeepFace emotion model to {weights_file}...")
        try:
            import urllib.request
            urllib.request.urlretrieve(url, weights_file)
            logger.info("DeepFace emotion model downloaded successfully")
        except Exception as e:
            logger.warning(f"Failed to download DeepFace weights: {e}")
            # Try with requests as fallback
            try:
                import requests
                resp = requests.get(url, timeout=60)
                resp.raise_for_status()
                with open(weights_file, "wb") as f:
                    f.write(resp.content)
                logger.info("DeepFace emotion model downloaded via requests")
            except Exception as e2:
                logger.warning(f"Requests download also failed: {e2}")

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
            if self._backend == "deepface":
                return self._classify_deepface(face_crop, timestamp)
            else:
                return self._classify_fer(face_crop, timestamp)
        except Exception as e:
            logger.debug(f"Expression classification error: {e}")
            return self._fallback_result(timestamp)

    def _classify_deepface(self, face_crop: np.ndarray, timestamp: float) -> ExpressionResult:
        """Classify using DeepFace backend."""
        import cv2
        bgr_crop = cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR)

        result = self._model.analyze(
            bgr_crop,
            actions=["emotion"],
            enforce_detection=False,
            silent=True,
        )

        if isinstance(result, list):
            result = result[0]

        emotions = result.get("emotion", {})
        if not emotions:
            return self._fallback_result(timestamp)

        # DeepFace returns percentages (0-100), normalize to 0-1
        mapped = {}
        for k, v in emotions.items():
            emotion_key = k.lower()
            try:
                mapped[Emotion(emotion_key).value] = v / 100.0
            except ValueError:
                pass

        if not mapped:
            return self._fallback_result(timestamp)

        dominant = max(mapped, key=mapped.get)
        confidence = mapped[dominant]

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

    def _classify_fer(self, face_crop: np.ndarray, timestamp: float) -> ExpressionResult:
        """Classify using FER library backend."""
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
