import unittest
from types import SimpleNamespace
from unittest.mock import patch

import cv2
import numpy as np
from app.ai.pipeline import PIPELINE_MODE, analyze_plate
from app.config.settings import settings


def image_bytes(width=320, height=180):
    image = np.full((height, width, 3), 180, dtype=np.uint8)
    ok, encoded = cv2.imencode(".jpg", image)
    if not ok:
        raise RuntimeError("No se pudo crear la imagen de prueba.")
    return encoded.tobytes()


class MockFastALPR:
    def __init__(self, predictions):
        self.predictions = predictions

    def predict(self, image):
        return self.predictions


def prediction(text="1234ABC", ocr_confidence=0.92, detector_confidence=0.90):
    return SimpleNamespace(
        detection=SimpleNamespace(
            confidence=detector_confidence,
            bounding_box=SimpleNamespace(x1=20, y1=70, x2=230, y2=150),
        ),
        ocr=SimpleNamespace(text=text, confidence=ocr_confidence),
    )


class OCRPipelineTests(unittest.TestCase):
    def test_empty_image(self):
        result = analyze_plate(b"", plate_engine=MockFastALPR([]))
        self.assertEqual(result["error_code"], "empty_image")

    def test_invalid_image(self):
        result = analyze_plate(b"not-an-image", plate_engine=MockFastALPR([]))
        self.assertEqual(result["error_code"], "invalid_image")

    def test_ocr_unavailable(self):
        result = analyze_plate(image_bytes())
        self.assertEqual(result["http_status"], 503)

    def test_fast_plate_ocr_detects_valid_plate(self):
        with patch.object(settings, "OCR_CONFIDENCE_THRESHOLD", 0.40):
            result = analyze_plate(image_bytes(), plate_engine=MockFastALPR([prediction()]))
        self.assertEqual(result["status"], "DETECTED")
        self.assertEqual(result["normalized_plate"], "1234ABC")
        self.assertEqual(result["detection_backend"], PIPELINE_MODE)

    def test_no_prediction_requires_manual_review(self):
        result = analyze_plate(image_bytes(), plate_engine=MockFastALPR([]))
        self.assertEqual(result["status"], "LOW_CONFIDENCE")
        self.assertTrue(result["requires_manual_review"])

    def test_low_confidence_is_not_confirmed(self):
        with patch.object(settings, "OCR_CONFIDENCE_THRESHOLD", 0.55):
            result = analyze_plate(
                image_bytes(),
                realtime=True,
                plate_engine=MockFastALPR([prediction(ocr_confidence=0.20)]),
            )
        self.assertEqual(result["status"], "LOW_CONFIDENCE")
        self.assertIsNone(result["normalized_plate"])


if __name__ == "__main__":
    unittest.main()
