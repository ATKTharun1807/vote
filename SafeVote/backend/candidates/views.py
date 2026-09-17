import re
import datetime
from bson import ObjectId
from pymongo import ReturnDocument
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from utils.database import get_candidates_collection, get_configs_collection
from utils.security import encode_payload
from utils.authentication import authenticate_admin, require_admin

@api_view(['GET'])
def candidates_list(request):
    """Candidates list matching /api/candidates/list wrapped in base64 envelope."""
    try:
        candidates_col = get_candidates_collection()
        candidates = list(candidates_col.find({}).sort("addedAt", 1))

        configs = get_configs_collection()
        config = configs.find_one({"type": "main"}) or {}

        admin_info = authenticate_admin(request)
        is_admin = bool(admin_info)
        election_ended = config.get("electionStatus") == "ENDED"
        has_privileged_access = is_admin or election_ended

        safe_candidates = []
        for idx, c in enumerate(candidates):
            obj = {
                "id": str(c["_id"]) if has_privileged_access else f"cnd_{idx + 1}",
                "name": c.get("name"),
                "party": c.get("party"),
                "photo": c.get("photo") or None,
                "partySymbol": c.get("partySymbol") or None,
            }
            if has_privileged_access:
                obj["votes"] = c.get("votes", 0)
            safe_candidates.append(obj)

        return Response(encode_payload(safe_candidates), status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": "Access Error", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@require_admin
def candidates_add(request):
    """Add candidate matching /api/candidates/add."""
    name = request.data.get('name', '').strip()
    party = request.data.get('party', '').strip()
    photo = request.data.get('photo')
    symbol = request.data.get('symbol')

    if not name or not party:
        return Response({"error": "Name and party are required"}, status=status.HTTP_400_BAD_REQUEST)

    candidates_col = get_candidates_collection()
    exists = candidates_col.find_one({
        "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
        "party": {"$regex": f"^{re.escape(party)}$", "$options": "i"}
    })

    if exists:
        return Response({"error": "Candidate with this name and party already exists"}, status=status.HTTP_400_BAD_REQUEST)

    candidates_col.insert_one({
        "name": name,
        "party": party,
        "photo": photo,
        "partySymbol": symbol,
        "votes": 0,
        "addedAt": datetime.datetime.now(datetime.timezone.utc)
    })
    return Response(status=status.HTTP_200_OK)

@api_view(['PUT', 'DELETE'])
@require_admin
def candidate_detail(request, id):
    """Update or delete candidate matching /api/candidates/:id."""
    candidates_col = get_candidates_collection()

    if request.method == 'PUT':
        try:
            update_data = {}
            if 'name' in request.data:
                update_data['name'] = request.data['name']
            if 'party' in request.data:
                update_data['party'] = request.data['party']
            if 'photo' in request.data:
                update_data['photo'] = request.data['photo']
            if 'symbol' in request.data:
                update_data['partySymbol'] = request.data['symbol']

            updated = candidates_col.find_one_and_update(
                {"_id": ObjectId(id)},
                {"$set": update_data},
                return_document=ReturnDocument.AFTER
            )

            if not updated:
                return Response({"error": "Candidate not found"}, status=status.HTTP_404_NOT_FOUND)

            return Response({
                "id": str(updated["_id"]),
                "_id": str(updated["_id"]),
                "name": updated.get("name"),
                "party": updated.get("party"),
                "photo": updated.get("photo"),
                "partySymbol": updated.get("partySymbol"),
                "votes": updated.get("votes", 0)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    elif request.method == 'DELETE':
        try:
            candidates_col.delete_one({"_id": ObjectId(id)})
            return Response(status=status.HTTP_200_OK)
        except Exception as e:
            return Response(str(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
