"""
SignalIQ — Face Detection Module

Uses YOLO for face detection and bounding box extraction.
This runs inside the custom SignalIQProcessor at 10fps,
separate from the ultralytics.YOLOPoseProcessor which handles body pose.

For hackathon MVP, we use DeepFace's built-in face detector as the primary
detector (backed by OpenCV/RetinaFace), with YOLO as a fallback option.
"""

import logging
from typing import Optional

import cv2
import numpy as np

from agent.storage.models import FaceBBox

logger = logging.getLogger(__name__)


class FaceDetector:
    """
    Detects and crops faces from video frames.

    Uses OpenCV's Haar cascade as a lightweight, zero-dependency detector
    for the MVP. Can be swapped to RetinaFace or dedicated YOLO-face model
    for production accuracy.
    """

    def __init__(
        self,
        min_face_size: int = 48,
        confidence_threshold: float = 0.5,
        backend: str = "opencv",
    ):
        self.min_face_size = min_face_size
        self.confidence_threshold = confidence_threshold
        self.backend = backend
        self._person_tracker: dict[str, FaceBBox] = {}
        self._next_id = 0

        # Load OpenCV's pre-trained face cascade
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self._cascade = cv2.CascadeClassifier(cascade_path)
        if self._cascade.empty():
            logger.warning("Failed to load Haar cascade, face detection may not work")

    def detect(self, frame: np.ndarray) -> list[FaceBBox]:
        """
        Detect all faces in a frame.

        Args:
            frame: RGB numpy array (H, W, 3)

        Returns:
            List of FaceBBox with bounding boxes and assigned person IDs
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)

        # Detect faces using Haar cascade
        raw_faces = self._cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(self.min_face_size, self.min_face_size),
            flags=cv2.CASCADE_SCALE_IMAGE,
        )

        faces = []
        for (x, y, w, h) in raw_faces:
            bbox = FaceBBox(
                x1=int(x),
                y1=int(y),
                x2=int(x + w),
                y2=int(y + h),
                confidence=0.9,  # Haar doesn't provide confidence; use default
                person_id=self._assign_person_id(x, y, w, h),
            )
            faces.append(bbox)

        return faces

    def crop_face(
        self, frame: np.ndarray, bbox: FaceBBox, padding: float = 0.15
    ) -> Optional[np.ndarray]:
        """
        Crop a face region from the frame with optional padding.

        Args:
            frame: RGB numpy array
            bbox: Face bounding box
            padding: Fractional padding around the face (0.15 = 15%)

        Returns:
            Cropped face as numpy array, or None if too small
        """
        h, w = frame.shape[:2]

        # Add padding
        pad_w = int(bbox.width * padding)
        pad_h = int(bbox.height * padding)

        x1 = max(0, bbox.x1 - pad_w)
        y1 = max(0, bbox.y1 - pad_h)
        x2 = min(w, bbox.x2 + pad_w)
        y2 = min(h, bbox.y2 + pad_h)

        crop = frame[y1:y2, x1:x2]

        if crop.shape[0] < self.min_face_size or crop.shape[1] < self.min_face_size:
            return None

        return crop

    def _assign_person_id(self, x: int, y: int, w: int, h: int) -> str:
        """
        Simple spatial tracking: assign persistent IDs based on face position.
        Matches detected faces to previously seen faces by proximity.
        """
        cx, cy = x + w // 2, y + h // 2
        best_id = None
        best_dist = float("inf")

        for pid, prev_bbox in self._person_tracker.items():
            prev_cx, prev_cy = prev_bbox.center
            dist = ((cx - prev_cx) ** 2 + (cy - prev_cy) ** 2) ** 0.5
            if dist < best_dist and dist < max(w, h) * 1.5:
                best_dist = dist
                best_id = pid

        if best_id is None:
            best_id = f"person_{self._next_id}"
            self._next_id += 1

        # Update tracker
        self._person_tracker[best_id] = FaceBBox(
            x1=x, y1=y, x2=x + w, y2=y + h, confidence=0.9, person_id=best_id
        )

        return best_id
