import unittest
from unittest.mock import patch

import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import plates
from app.schemas.plate import PlateAnalysisResponse


class PlatesAPITests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.state.ocr_reader = object()
        app.include_router(plates.router, prefix="/api/v1/plates")
        self.client = TestClient(app)

    def test_health_reports_local_ocr_pipeline(self):
        response = self.client.get("/api/v1/plates/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "status": "ok",
                "message": "API de ALPR lista para inferencia.",
                "ocr_available": True,
                "supervision_available": True,
                "camera_capture_supported": True,
                "pipeline_mode": "OCR_SUPERVISION",
            },
        )

    def test_analyze_endpoint_keeps_response_contract(self):
        expected = {
            "status": "DETECTED",
            "detected_plate": "1234-ABC",
            "normalized_plate": "1234ABC",
            "is_valid_bolivian_format": True,
            "detection_backend": "OCR_SUPERVISION",
            "detection_confidence": 0.91,
            "ocr_confidence": 0.90,
            "combined_confidence": 0.91,
            "requires_manual_review": False,
            "annotated_image": "data:image/jpeg;base64,AA==",
            "plate_crop": "data:image/jpeg;base64,AA==",
            "message": None,
            "plate_bbox": None,
            "raw_bboxes": None,
        }
        image = np.zeros((20, 40, 3), dtype=np.uint8)
        ok, encoded = cv2.imencode(".jpg", image)
        self.assertTrue(ok)
        with patch.object(plates, "analyze_plate", return_value=expected):
            response = self.client.post(
                "/api/v1/plates/analyze",
                files={"file": ("plate.jpg", encoded.tobytes(), "image/jpeg")},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)

    def test_schema_accepts_ocr_supervision_backend(self):
        response = PlateAnalysisResponse(
            status="LOW_CONFIDENCE",
            detection_backend="OCR_SUPERVISION",
            requires_manual_review=True,
        )
        self.assertEqual(response.detection_backend, "OCR_SUPERVISION")


if __name__ == "__main__":
    unittest.main()
