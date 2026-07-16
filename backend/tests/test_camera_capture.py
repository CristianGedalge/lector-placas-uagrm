import threading
import unittest

import numpy as np

from app.services.camera_capture import (
    CameraCaptureAgent,
    CameraCaptureConfig,
    PlateDeduplicator,
    _build_multipart_request,
)


def make_config(**overrides):
    values = {
        "camera_index": 0,
        "rtsp_url": "",
        "api_url": "http://127.0.0.1:8000/api/v1/plates/analyze",
        "analysis_interval_seconds": 0.01,
        "duplicate_cooldown_seconds": 30.0,
        "reconnect_delay_seconds": 0.01,
        "request_timeout_seconds": 1.0,
        "request_retries": 2,
        "request_retry_delay_seconds": 0.0,
        "jpeg_quality": 85,
    }
    values.update(overrides)
    return CameraCaptureConfig(**values)


class FakeCapture:
    def __init__(self, opened=True, frames=None):
        self.opened = opened
        self.frames = list(frames or [])
        self.released = False

    def isOpened(self):
        return self.opened

    def read(self):
        if not self.frames:
            return False, None
        return True, self.frames.pop(0)

    def release(self):
        self.released = True


class CameraCaptureConfigTests(unittest.TestCase):
    def test_rtsp_source_has_priority_without_exposing_url_in_label(self):
        config = make_config(rtsp_url="rtsp://user:secret@example.test/stream")
        self.assertEqual(config.source, "rtsp://user:secret@example.test/stream")
        self.assertEqual(config.source_label, "RTSP configurado")
        self.assertNotIn("secret", config.source_label)

    def test_invalid_interval_is_rejected(self):
        with self.assertRaises(ValueError):
            make_config(analysis_interval_seconds=0)


class PlateDeduplicatorTests(unittest.TestCase):
    def test_same_plate_is_accepted_again_after_cooldown(self):
        times = iter([100.0, 101.0, 131.0])
        deduplicator = PlateDeduplicator(30.0, clock=lambda: next(times))
        self.assertTrue(deduplicator.accept("1234abc"))
        self.assertFalse(deduplicator.accept("1234ABC"))
        self.assertTrue(deduplicator.accept("1234ABC"))


class MultipartRequestTests(unittest.TestCase):
    def test_request_contains_jpeg_and_expected_form_field(self):
        request = _build_multipart_request("http://localhost/analyze", b"jpeg-data")
        content_type = request.headers["Content-type"]
        self.assertIn("multipart/form-data", content_type)
        self.assertIn(b'name="file"', request.data)
        self.assertIn(b"jpeg-data", request.data)


class CameraCaptureAgentTests(unittest.TestCase):
    def test_failed_camera_is_released(self):
        capture = FakeCapture(opened=False)
        agent = CameraCaptureAgent(make_config(), capture_factory=lambda _source: capture)
        self.assertIsNone(agent._open_capture())
        self.assertTrue(capture.released)

    def test_detected_plate_is_deduplicated(self):
        responses = []

        def sender(_url, jpeg_bytes, _timeout):
            responses.append(jpeg_bytes)
            return {"status": "DETECTED", "normalized_plate": "1234ABC"}

        agent = CameraCaptureAgent(make_config(), sender=sender)
        frame = np.zeros((20, 30, 3), dtype=np.uint8)
        self.assertTrue(agent.process_frame(frame))
        self.assertFalse(agent.process_frame(frame))
        self.assertEqual(len(responses), 2)
        self.assertTrue(all(payload.startswith(b"\xff\xd8") for payload in responses))

    def test_run_releases_camera_when_stopped_during_request(self):
        frame = np.zeros((10, 10, 3), dtype=np.uint8)
        capture = FakeCapture(frames=[frame])
        agent = None

        def sender(_url, _jpeg_bytes, _timeout):
            agent.stop()
            return {"status": "ERROR", "message": "simulado"}

        agent = CameraCaptureAgent(
            make_config(),
            capture_factory=lambda _source: capture,
            sender=sender,
            stop_event=threading.Event(),
        )
        agent.run()
        self.assertTrue(capture.released)

    def test_network_error_does_not_escape_processing_loop(self):
        attempts = []

        def sender(_url, _jpeg_bytes, _timeout):
            attempts.append(1)
            raise OSError("sin conexion")

        agent = CameraCaptureAgent(make_config(), sender=sender)
        frame = np.zeros((10, 10, 3), dtype=np.uint8)
        self.assertFalse(agent.process_frame(frame))
        self.assertEqual(len(attempts), 3)

    def test_run_reconnects_after_initial_camera_failure(self):
        frame = np.zeros((10, 10, 3), dtype=np.uint8)
        captures = [FakeCapture(opened=False), FakeCapture(frames=[frame])]
        agent = None

        def capture_factory(_source):
            return captures.pop(0)

        def sender(_url, _jpeg_bytes, _timeout):
            agent.stop()
            return {"status": "DETECTED", "normalized_plate": "1234ABC"}

        agent = CameraCaptureAgent(
            make_config(reconnect_delay_seconds=0.001),
            capture_factory=capture_factory,
            sender=sender,
        )
        agent.run()
        self.assertEqual(captures, [])


if __name__ == "__main__":
    unittest.main()
