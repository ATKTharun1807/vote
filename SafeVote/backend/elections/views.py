import time
import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from utils.database import (
    get_configs_collection,
    get_adminaccesses_collection,
    get_students_collection,
    get_staffs_collection,
    get_candidates_collection,
    get_blockchains_collection,
    get_voteddevices_collection,
    check_db_connection
)
from utils.security import encode_payload
from utils.authentication import require_admin, require_super_admin

SERVER_START_TIME = time.time()

def parse_iso_datetime(dt_val):
    if not dt_val:
        return None
    if isinstance(dt_val, datetime.datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=datetime.timezone.utc)
        return dt_val
    if isinstance(dt_val, str):
        try:
            # Handle ISO string with trailing Z
            clean = dt_val.replace('Z', '+00:00')
            dt = datetime.datetime.fromisoformat(clean)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=datetime.timezone.utc)
            return dt
        except Exception:
            return None
    return None

@api_view(['GET'])
def health_check(request):
    """Health check endpoint matching /api/health."""
    db_connected = check_db_connection()
    uptime = round(time.time() - SERVER_START_TIME, 2)
    return Response({
        "status": "UP",
        "database": "Connected" if db_connected else "Disconnected",
        "uptime": uptime
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
def session_check(request):
    """Obfuscated session sync endpoint matching /api/v1/session."""
    key = request.headers.get('x-admin-key') or request.META.get('HTTP_X_ADMIN_KEY')
    student_token = request.headers.get('x-student-token') or request.META.get('HTTP_X_STUDENT_TOKEN')
    reg_no = request.headers.get('x-reg-no') or request.META.get('HTTP_X_REG_NO')
    staff_token = request.headers.get('x-staff-token') or request.META.get('HTTP_X_STAFF_TOKEN')
    staff_id = request.headers.get('x-staff-id') or request.META.get('HTTP_X_STAFF_ID')

    try:
        configs = get_configs_collection()
        config = configs.find_one({"type": "main"})
        if not config:
            configs.insert_one({"type": "main", "electionStatus": "NOT_STARTED", "adminKey": "admin123"})
            config = configs.find_one({"type": "main"})

        # AUTO-TRANSITION LOGIC: Start/End election based on schedule
        now = datetime.datetime.now(datetime.timezone.utc)
        needs_update = False
        updates = {}

        current_status = config.get("electionStatus", "NOT_STARTED")
        start_time = parse_iso_datetime(config.get("startTime"))
        end_time = parse_iso_datetime(config.get("endTime"))

        if current_status == "NOT_STARTED" and start_time and now >= start_time:
            candidates_count = get_candidates_collection().count_documents({})
            if candidates_count >= 2:
                updates["electionStatus"] = "ONGOING"
                needs_update = True
        elif current_status == "ONGOING" and end_time and now >= end_time:
            updates["electionStatus"] = "ENDED"
            needs_update = True

        if needs_update:
            configs.update_one({"type": "main"}, {"$set": updates})
            config.update(updates)

        # Admin Auth Resolution
        is_admin = bool(key and (config.get("adminKey") == key or config.get("adminSessionToken") == key))
        admin_role = "NONE"

        if is_admin:
            admin_role = "SUPER_ADMIN"
        elif key:
            adminaccesses = get_adminaccesses_collection()
            shared = adminaccesses.find_one({"accessKey": key})
            if shared:
                admin_role = shared.get("role", "MODERATOR")

        # Voter Resolution
        is_student_valid = False
        if student_token and reg_no:
            try:
                student = get_students_collection().find_one({"regNo": int(reg_no), "sessionToken": student_token})
                if student:
                    is_student_valid = True
            except (ValueError, TypeError):
                pass

        is_staff_valid = False
        if staff_token and staff_id:
            staff = get_staffs_collection().find_one({"staffId": str(staff_id), "sessionToken": staff_token})
            if staff:
                is_staff_valid = True

        election_ended = config.get("electionStatus") == "ENDED"

        safe_config = {
            "electionName": config.get("electionName", "Student Council Election"),
            "electionStatus": config.get("electionStatus", "NOT_STARTED"),
            "startTime": config.get("startTime"),
            "endTime": config.get("endTime"),
            "allowedDepartments": config.get("allowedDepartments", [])
        }

        response_data = {
            "config": safe_config,
            "authenticated": admin_role != "NONE",
            "adminRole": admin_role,
            "isVoter": is_student_valid or is_staff_valid
        }

        if admin_role != "NONE" or election_ended:
            response_data["totalStudents"] = get_students_collection().count_documents({})
            response_data["votedCount"] = get_students_collection().count_documents({"hasVoted": True})
            response_data["totalStaff"] = get_staffs_collection().count_documents({})
            response_data["staffVotedCount"] = get_staffs_collection().count_documents({"hasVoted": True})

            candidates_cursor = get_candidates_collection().find({}).sort("addedAt", 1)
            candidates_list = []
            has_privileged_access = (admin_role != "NONE" or election_ended)
            for idx, c in enumerate(candidates_cursor):
                candidates_list.append({
                    "id": str(c["_id"]) if has_privileged_access else f"cnd_{idx + 1}",
                    "name": c.get("name"),
                    "party": c.get("party"),
                    "photo": c.get("photo") or None,
                    "partySymbol": c.get("partySymbol") or None,
                    "votes": c.get("votes", 0)
                })
            response_data["candidates"] = candidates_list

            blockchain_cursor = get_blockchains_collection().find({}).sort("index", 1)
            blocks_list = []
            for b in blockchain_cursor:
                b_data = b.get("data") or {}
                blocks_list.append({
                    "index": b.get("index"),
                    "timestamp": b.get("timestamp"),
                    "hash": b.get("hash"),
                    "previousHash": b.get("previousHash"),
                    "data": {
                        "voterHash": b_data.get("voterHash"),
                        "candidateId": b_data.get("candidateId") if (admin_role == "SUPER_ADMIN" or election_ended) else "HIDDEN"
                    }
                })
            response_data["blockchain"] = blocks_list

        return Response(encode_payload(response_data), status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": "Internal Error", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@require_admin
def config_update(request):
    """Update election configuration matching /api/config/update."""
    updates = request.data
    configs = get_configs_collection()
    current_config = configs.find_one({"type": "main"}) or {}

    if updates.get("adminKey") and request.admin_role != "SUPER_ADMIN":
        return Response({"error": "Only Super Admin can change the master key."}, status=status.HTTP_403_FORBIDDEN)

    if updates.get("electionStatus") == "ONGOING":
        start_time = updates.get("startTime") or current_config.get("startTime")
        end_time = updates.get("endTime") or current_config.get("endTime")

        if not start_time or not end_time:
            return Response({"error": "Cannot start election without a schedule. Please apply a schedule first."}, status=status.HTTP_400_BAD_REQUEST)

        candidates_count = get_candidates_collection().count_documents({})
        if candidates_count < 2:
            return Response({"error": "Cannot start election: Minimum 2 candidates required."}, status=status.HTTP_400_BAD_REQUEST)

    configs.update_one({"type": "main"}, {"$set": updates}, upsert=True)
    return Response(status=status.HTTP_200_OK)

@api_view(['POST'])
@require_super_admin
def reset_all(request):
    """Reset election data matching /api/reset-all."""
    try:
        get_candidates_collection().update_many({}, {"$set": {"votes": 0}})
        get_blockchains_collection().delete_many({})
        get_students_collection().update_many({}, {"$set": {"hasVoted": False, "sessionToken": None}})
        get_staffs_collection().update_many({}, {"$set": {"hasVoted": False, "sessionToken": None}})
        get_voteddevices_collection().delete_many({})
        get_configs_collection().update_one(
            {"type": "main"},
            {"$set": {
                "electionStatus": "NOT_STARTED",
                "startTime": None,
                "endTime": None,
                "allowedDepartments": [],
                "electionName": "Student Council Election"
            }}
        )
        return Response(status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
