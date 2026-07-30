import io
import os
import time
import unittest

from app.services.cloudinary_storage import CloudinaryStorage
from app.services.image_processing import ImageProcessingService
from PIL import Image


@unittest.skipUnless(
    os.getenv("RUN_CLOUDINARY_TESTS") == "1",
    "requiere credenciales y acceso real a Cloudinary",
)
class CloudinaryIntegrationTests(unittest.TestCase):
    def test_upload_signed_url_and_delete(self):
        source = io.BytesIO()
        Image.new("RGB", (1600, 900), "steelblue").save(source, format="JPEG", quality=95)
        original = source.getvalue()

        conversion_started = time.perf_counter()
        processed = ImageProcessingService().process(original, "ACCESS_ENTRY")
        conversion_seconds = time.perf_counter() - conversion_started

        storage = CloudinaryStorage()
        upload_started = time.perf_counter()
        uploaded = storage.upload(processed.content, "ACCESS_ENTRY")
        upload_seconds = time.perf_counter() - upload_started
        try:
            self.assertEqual(uploaded.format, "webp")
            self.assertEqual((uploaded.width, uploaded.height), (1600, 900))
            self.assertGreater(uploaded.bytes, 0)
            self.assertTrue(uploaded.asset_id)
            self.assertTrue(uploaded.public_id)
            self.assertTrue(storage.exists(uploaded.public_id))
            self.assertTrue(
                storage.get_temporary_url(uploaded.public_id, uploaded.format).url
            )
            print(
                {
                    "original_bytes": len(original),
                    "webp_bytes": processed.bytes,
                    "conversion_seconds": round(conversion_seconds, 4),
                    "upload_seconds": round(upload_seconds, 4),
                }
            )
        finally:
            self.assertTrue(storage.delete(uploaded.public_id))
        self.assertFalse(storage.exists(uploaded.public_id))


if __name__ == "__main__":
    unittest.main()
