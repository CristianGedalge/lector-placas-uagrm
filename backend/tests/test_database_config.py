import unittest

from app.db.session import database_target


class DatabaseTargetTests(unittest.TestCase):
    def test_local_target_does_not_expose_credentials(self):
        target = database_target(
            "postgresql+psycopg://private-user:private-password@localhost:5433/plates"
        )

        self.assertEqual(
            target,
            {
                "provider": "PostgreSQL",
                "host": "localhost",
                "database": "plates",
            },
        )
        self.assertNotIn("private-user", str(target))
        self.assertNotIn("private-password", str(target))

    def test_neon_pooler_is_identified(self):
        target = database_target(
            "postgresql+psycopg://user:password@ep-example-pooler.neon.tech/neondb"
            "?sslmode=require"
        )

        self.assertEqual(target["provider"], "Neon")


if __name__ == "__main__":
    unittest.main()
