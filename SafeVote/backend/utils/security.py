import os
import json
import base64
import hashlib
import secrets
from django.conf import settings

BLOCKCHAIN_SALT = getattr(settings, 'BLOCKCHAIN_SALT', os.getenv('BLOCKCHAIN_SALT', "safevote_secret_salt_2024"))

def hash_password(password: str) -> str:
    """Hash password using PBKDF2 with SHA-512 matching Node.js implementation."""
    salt = secrets.token_hex(16)
    hash_val = hashlib.pbkdf2_hmac(
        'sha512',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        1000,
        dklen=64
    ).hex()
    return f"{salt}:{hash_val}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash or fallback plaintext."""
    if not stored_hash:
        return False
    if ':' not in stored_hash:
        return password == stored_hash
    try:
        salt, expected_hash = stored_hash.split(':', 1)
        computed_hash = hashlib.pbkdf2_hmac(
            'sha512',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            1000,
            dklen=64
        ).hex()
        return secrets.compare_digest(expected_hash, computed_hash)
    except Exception:
        return False

def calculate_block_hash(index: int, timestamp: str, data: dict, previous_hash: str) -> str:
    """Calculate block hash matching Node.js compact JSON formatting."""
    compact_json = json.dumps(data, separators=(',', ':'))
    string_to_hash = f"{index}{timestamp}{compact_json}{previous_hash}{BLOCKCHAIN_SALT}"
    return hashlib.sha256(string_to_hash.encode('utf-8')).hexdigest()

def encode_payload(data) -> dict:
    """Wrap response in Base64 obfuscated payload { p: base64_str } expected by frontend."""
    # Custom serializer to handle ObjectId, datetime, etc.
    json_bytes = json.dumps(data, default=str, separators=(',', ':')).encode('utf-8')
    masked = base64.b64encode(json_bytes).decode('utf-8')
    return {"p": masked}

def decode_payload(p: str):
    """Decode Base64 payload."""
    try:
        decoded_bytes = base64.b64decode(p.encode('utf-8'))
        return json.loads(decoded_bytes.decode('utf-8'))
    except Exception:
        return None

def generate_session_token() -> str:
    """Generate 32-byte hex secure session token."""
    return secrets.token_hex(32)

def generate_admin_access_key() -> str:
    """Generate ADM-XXXXXXXX key."""
    return f"ADM-{secrets.token_hex(4).upper()}"
