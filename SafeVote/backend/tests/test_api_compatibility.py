import os
import json
import base64
from django.test import TestCase, Client
from utils.database import get_configs_collection, get_candidates_collection, get_students_collection
from utils.security import decode_payload, hash_password

class SafeVoteAPICompatibilityTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.configs = get_configs_collection()
        self.candidates = get_candidates_collection()
        self.students = get_students_collection()

    def test_health_endpoint(self):
        """Test GET /api/health returns UP, database status, and uptime."""
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get('status'), 'UP')
        self.assertIn('database', data)
        self.assertIn('uptime', data)

    def test_session_endpoint(self):
        """Test GET /api/v1/session returns base64 envelope { p: ... }."""
        response = self.client.get('/api/v1/session')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('p', data)
        decoded = decode_payload(data['p'])
        self.assertIsNotNone(decoded)
        self.assertIn('config', decoded)
        self.assertIn('authenticated', decoded)
        self.assertIn('adminRole', decoded)
        self.assertIn('isVoter', decoded)

    def test_admin_verify_invalid(self):
        """Test POST /api/admin/verify with invalid key returns 401."""
        response = self.client.post(
            '/api/admin/verify',
            data=json.dumps({"key": "wrong_key"}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)

    def test_admin_verify_valid(self):
        """Test POST /api/admin/verify with valid master key."""
        config = self.configs.find_one({"type": "main"})
        admin_key = config.get("adminKey", "admin123") if config else "admin123"

        response = self.client.post(
            '/api/admin/verify',
            data=json.dumps({"key": admin_key}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('token', data)
        self.assertEqual(data.get('role'), 'SUPER_ADMIN')

    def test_candidates_list(self):
        """Test GET /api/candidates/list returns base64 envelope."""
        response = self.client.get('/api/candidates/list')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('p', data)
        candidates = decode_payload(data['p'])
        self.assertIsInstance(candidates, list)

    def test_blockchain_verify_requires_auth(self):
        """Test GET /api/blockchain/verify requires admin authentication."""
        response = self.client.get('/api/blockchain/verify')
        self.assertEqual(response.status_code, 401)

    def test_blockchain_verify_with_auth(self):
        """Test GET /api/blockchain/verify with admin authentication."""
        config = self.configs.find_one({"type": "main"})
        admin_key = config.get("adminKey", "admin123") if config else "admin123"

        response = self.client.get(
            '/api/blockchain/verify',
            HTTP_X_ADMIN_KEY=admin_key
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('isValid', data)
        self.assertIn('totalBlocks', data)
        self.assertIn('issues', data)

    def test_spa_index_serving(self):
        """Test GET / serves index.html."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/html')
