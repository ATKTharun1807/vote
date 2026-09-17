import datetime
from bson import ObjectId
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from utils.database import get_configs_collection, get_adminaccesses_collection
from utils.security import generate_session_token, generate_admin_access_key
from utils.authentication import require_super_admin
from utils.throttling import throttle_login

@api_view(['POST'])
@throttle_login
def admin_verify(request):
    """Admin verification endpoint matching /api/admin/verify."""
    key = request.data.get('key')
    if not key:
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    configs = get_configs_collection()
    config = configs.find_one({"type": "main"})

    # 1. Master Key Check
    if config and config.get("adminKey") == key:
        token = generate_session_token()
        configs.update_one(
            {"type": "main"},
            {"$set": {"adminSessionToken": token}},
            upsert=True
        )
        return Response({"token": token, "role": "SUPER_ADMIN"}, status=status.HTTP_200_OK)

    # 2. Shared Moderator Access Key Check
    adminaccesses = get_adminaccesses_collection()
    shared = adminaccesses.find_one({"accessKey": key})
    if shared:
        return Response({
            "token": shared.get("accessKey"),
            "role": shared.get("role", "MODERATOR")
        }, status=status.HTTP_200_OK)

    return Response(status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@require_super_admin
def admin_access_list(request):
    """Retrieve shared admin moderators list."""
    adminaccesses = get_adminaccesses_collection()
    cursor = adminaccesses.find({}).sort("addedAt", -1)
    results = []
    for doc in cursor:
        results.append({
            "_id": str(doc["_id"]),
            "id": str(doc["_id"]),
            "name": doc.get("name"),
            "accessKey": doc.get("accessKey"),
            "role": doc.get("role", "MODERATOR"),
            "permissions": doc.get("permissions", ["MANAGE_CANDIDATES", "MANAGE_STUDENTS"]),
            "lastAccessed": doc.get("lastAccessed"),
            "addedAt": doc.get("addedAt")
        })
    return Response(results, status=status.HTTP_200_OK)

@api_view(['POST'])
@require_super_admin
def admin_access_add(request):
    """Create a new moderator access key."""
    name = request.data.get('name')
    if not name:
        return Response({"error": "Name is required"}, status=status.HTTP_400_BAD_REQUEST)

    key = generate_admin_access_key()
    doc = {
        "name": name,
        "accessKey": key,
        "role": "MODERATOR",
        "permissions": ["MANAGE_CANDIDATES", "MANAGE_STUDENTS"],
        "addedAt": datetime.datetime.now(datetime.timezone.utc)
    }
    adminaccesses = get_adminaccesses_collection()
    result = adminaccesses.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = str(result.inserted_id)
    return Response(doc, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@require_super_admin
def admin_access_remove(request, id):
    """Remove moderator access key."""
    try:
        adminaccesses = get_adminaccesses_collection()
        adminaccesses.delete_one({"_id": ObjectId(id)})
        return Response(status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
