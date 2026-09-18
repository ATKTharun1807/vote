import datetime
from bson import ObjectId
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from utils.database import (
    get_configs_collection,
    get_students_collection,
    get_staffs_collection,
    get_candidates_collection,
    get_blockchains_collection,
    get_voteddevices_collection
)
from utils.security import calculate_block_hash
from utils.authentication import (
    authenticate_student,
    authenticate_staff,
    require_admin
)
from utils.throttling import throttle_vote

@api_view(['POST'])
@throttle_vote
def cast_vote(request):
    """Cast vote endpoint matching /api/vote."""
    student_token = request.headers.get('x-student-token') or request.META.get('HTTP_X_STUDENT_TOKEN')
    staff_token = request.headers.get('x-staff-token') or request.META.get('HTTP_X_STAFF_TOKEN')

    is_student = False
    voter = None

    if student_token:
        voter = authenticate_student(request)
        if not voter:
            return Response({"error": "Invalid student session"}, status=status.HTTP_401_UNAUTHORIZED)
        is_student = True
    elif staff_token:
        voter = authenticate_staff(request)
        if not voter:
            return Response({"error": "Invalid staff session"}, status=status.HTTP_401_UNAUTHORIZED)
        is_student = False
    else:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    candidate_id = request.data.get('candidateId')
    voter_hash = request.data.get('voterHash')
    device_fingerprint = request.data.get('deviceFingerprint')

    configs = get_configs_collection()
    config = configs.find_one({"type": "main"})
    if not config or config.get("electionStatus") != "ONGOING":
        return Response({"error": "Election is not active."}, status=status.HTTP_400_BAD_REQUEST)

    if voter.get("hasVoted"):
        return Response({"error": "Already voted"}, status=status.HTTP_400_BAD_REQUEST)

    # Device-based check
    if not device_fingerprint:
        return Response({"error": "Device identification missing."}, status=status.HTTP_400_BAD_REQUEST)

    voteddevices = get_voteddevices_collection()
    if voteddevices.find_one({"fingerprint": device_fingerprint}):
        return Response({"error": "This device has already been used to cast a vote."}, status=status.HTTP_400_BAD_REQUEST)

    # Department restriction check
    allowed_depts = config.get("allowedDepartments") or []
    if is_student and allowed_depts and len(allowed_depts) > 0:
        if voter.get("department") not in allowed_depts:
            return Response({"error": "Election restricted to specific departments."}, status=status.HTTP_403_FORBIDDEN)

    # Candidate Lookup
    candidates_col = get_candidates_collection()
    candidate = None
    if not candidate_id:
        return Response({"error": "Candidate ID is required."}, status=status.HTTP_400_BAD_REQUEST)

    if str(candidate_id).startswith('cnd_'):
        try:
            idx = int(str(candidate_id).replace('cnd_', '')) - 1
            all_candidates = list(candidates_col.find({}).sort("addedAt", 1))
            if 0 <= idx < len(all_candidates):
                candidate = all_candidates[idx]
        except Exception:
            candidate = None
    else:
        try:
            candidate = candidates_col.find_one({"_id": ObjectId(candidate_id)})
        except Exception:
            candidate = None

    if not candidate:
        return Response({"error": "Candidate not found"}, status=status.HTTP_404_NOT_FOUND)

    # Blockchain Block Generation
    blockchains_col = get_blockchains_collection()
    last_block = blockchains_col.find_one(sort=[("index", -1)])
    next_index = (last_block["index"] + 1) if last_block else 0
    previous_hash = last_block["hash"] if last_block else "0x0000000000000000000000000000000000000000000000000000000000000000"
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

    block_data = {
        "voterHash": voter_hash or "unknown",
        "candidateId": str(candidate["_id"]),
        "candidateName": candidate.get("name")
    }
    block_hash = calculate_block_hash(next_index, timestamp, block_data, previous_hash)

    # Atomic state updates
    if is_student:
        get_students_collection().update_one(
            {"_id": voter["_id"]},
            {"$set": {"hasVoted": True, "sessionToken": None}}
        )
    else:
        get_staffs_collection().update_one(
            {"_id": voter["_id"]},
            {"$set": {"hasVoted": True, "sessionToken": None}}
        )

    candidates_col.update_one({"_id": candidate["_id"]}, {"$inc": {"votes": 1}})
    voteddevices.insert_one({
        "fingerprint": device_fingerprint,
        "votedAt": datetime.datetime.now(datetime.timezone.utc)
    })

    blockchains_col.insert_one({
        "index": next_index,
        "timestamp": timestamp,
        "data": block_data,
        "previousHash": previous_hash,
        "hash": block_hash
    })

    return Response(status=status.HTTP_200_OK)

@api_view(['GET'])
@require_admin
def blockchain_verify(request):
    """Verify blockchain integrity matching /api/blockchain/verify."""
    try:
        blockchains_col = get_blockchains_collection()
        chain = list(blockchains_col.find({}).sort("index", 1))

        report = {
            "isValid": True,
            "totalBlocks": len(chain),
            "issues": []
        }

        for i, block in enumerate(chain):
            previous_hash = "0x0000000000000000000000000000000000000000000000000000000000000000" if i == 0 else chain[i - 1]["hash"]
            recalculated_hash = calculate_block_hash(
                block["index"],
                block["timestamp"],
                block.get("data", {}),
                previous_hash
            )

            if block.get("hash") != recalculated_hash:
                report["isValid"] = False
                report["issues"].append(f"Block #{block['index']} tampered.")

            if i > 0 and block.get("previousHash") != chain[i - 1]["hash"]:
                report["isValid"] = False
                report["issues"].append(f"Chain broken at Block #{block['index']}.")

        return Response(report, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": "Verification Failed", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
