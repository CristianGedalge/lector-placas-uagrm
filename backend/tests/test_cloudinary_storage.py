import unittest
from unittest.mock import patch

from app.services.cloudinary_storage import CloudinaryStorage


class CloudinaryStorageTests(unittest.TestCase):
    def setUp(self):
        self.settings = patch.multiple(
            "app.services.cloudinary_storage.settings",
            CLOUDINARY_CLOUD_NAME="academic",
            CLOUDINARY_API_KEY="example-key",
            CLOUDINARY_API_SECRET="super-secret-value",
        )
        self.settings.start()
        self.addCleanup(self.settings.stop)

    @patch("cloudinary.config")
    @patch("cloudinary.uploader.upload")
    def test_upload_is_authenticated_webp(self, upload, _config):
        upload.return_value = {
            "asset_id": "asset",
            "public_id": "uuid",
            "resource_type": "image",
            "type": "authenticated",
            "format": "webp",
            "width": 512,
            "height": 512,
            "bytes": 1234,
        }
        result = CloudinaryStorage().upload(b"webp", "USER_PROFILE")
        self.assertEqual(result.asset_id, "asset")
        kwargs = upload.call_args.kwargs
        self.assertEqual(kwargs["type"], "authenticated")
        self.assertEqual(kwargs["format"], "webp")
        self.assertEqual(kwargs["asset_folder"], "placas-academico/users")
        self.assertNotIn("super-secret-value", str(upload.call_args))

    @patch("cloudinary.config")
    @patch("cloudinary.uploader.destroy")
    def test_delete_uses_authenticated_type(self, destroy, _config):
        destroy.return_value = {"result": "ok"}
        self.assertTrue(CloudinaryStorage().delete("uuid"))
        self.assertEqual(destroy.call_args.kwargs["type"], "authenticated")

    @patch("cloudinary.config")
    @patch("cloudinary.api.resource")
    def test_exists(self, resource, _config):
        resource.return_value = {"public_id": "uuid"}
        self.assertTrue(CloudinaryStorage().exists("uuid"))

    @patch("cloudinary.config")
    @patch("cloudinary.utils.private_download_url")
    def test_temporary_url_has_expiration(self, signed_url, _config):
        signed_url.return_value = "https://example.invalid/signed"
        result = CloudinaryStorage().get_temporary_url("uuid", "webp")
        self.assertIn("expires_at", signed_url.call_args.kwargs)
        self.assertEqual(result.url, signed_url.return_value)


if __name__ == "__main__":
    unittest.main()
