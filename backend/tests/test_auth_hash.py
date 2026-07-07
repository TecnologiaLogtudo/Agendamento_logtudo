import unittest

from app.auth import hash_password, verify_password


class HashPasswordTests(unittest.TestCase):
    def test_hash_password_generates_hash_and_verify(self):
        hashed = hash_password("senha123")

        self.assertTrue(verify_password("senha123", hashed))
        self.assertNotEqual(hashed, "senha123")


if __name__ == "__main__":
    unittest.main()
