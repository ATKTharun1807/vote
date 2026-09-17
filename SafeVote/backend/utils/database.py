import os
import logging
from pymongo import MongoClient
from django.conf import settings

logger = logging.getLogger(__name__)

_mongo_client = None
_db = None

def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        mongo_uri = getattr(settings, 'MONGO_URI', os.getenv('MONGO_URI'))
        if not mongo_uri:
            raise ValueError("MONGO_URI not configured in environment or settings.")
        logger.info("Connecting to MongoDB via PyMongo...")
        _mongo_client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=5000,
            socketTimeoutMS=45000,
            connect=False  # Fork-safe lazy connection
        )
    return _mongo_client

def get_db():
    global _db
    if _db is None:
        client = get_mongo_client()
        # Parse default db name from URI if present, otherwise default to 'safevote'
        try:
            _db = client.get_default_database()
        except Exception:
            _db = client['safevote']
        if _db is None or _db.name in ('test', 'admin', None):
            _db = client['safevote']
    return _db

def get_collection(name: str):
    return get_db()[name]

# Helper accessors for collections
def get_students_collection():
    return get_collection('students')

def get_staffs_collection():
    return get_collection('staffs')

def get_candidates_collection():
    return get_collection('candidates')

def get_blockchains_collection():
    return get_collection('blockchains')

def get_configs_collection():
    return get_collection('configs')

def get_voteddevices_collection():
    return get_collection('voteddevices')

def get_adminaccesses_collection():
    return get_collection('adminaccesses')

def check_db_connection() -> bool:
    try:
        client = get_mongo_client()
        client.admin.command('ping')
        return True
    except Exception as e:
        logger.error(f"MongoDB connection check failed: {e}")
        return False
