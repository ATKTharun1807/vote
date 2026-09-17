import datetime
from bson import ObjectId
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from utils.database import get_students_collection, get_staffs_collection
from utils.security import (
    hash_password,
    verify_password,
    generate_session_token,
    encode_payload
)
from utils.authentication import authenticate_admin, require_admin
from utils.throttling import throttle_login

# ----------------- STUDENT ENDPOINTS ----------------- #

@api_view(['POST'])
@throttle_login
def students_verify(request):
    """Student login matching /api/students/verify."""
    reg_no = request.data.get('regNo')
    password = request.data.get('password')

    if reg_no is None or password is None:
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    try:
        reg_int = int(reg_no)
    except (ValueError, TypeError):
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    students_col = get_students_collection()
    student = students_col.find_one({"regNo": reg_int})
    if not student:
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    stored_password = student.get('password', '')
    if not verify_password(password, stored_password):
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    # Auto-migrate plaintext password to PBKDF2 hash on successful login
    if ':' not in stored_password:
        new_hash = hash_password(password)
        students_col.update_one({"_id": student["_id"]}, {"$set": {"password": new_hash}})

    token = generate_session_token()
    students_col.update_one({"_id": student["_id"]}, {"$set": {"sessionToken": token}})

    return Response({
        "id": str(student["_id"]),
        "_id": str(student["_id"]),
        "regNo": student.get("regNo"),
        "name": student.get("name"),
        "department": student.get("department"),
        "hasVoted": student.get("hasVoted", False),
        "token": token
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@require_admin
def students_list(request):
    """Admin-only student list matching /api/students/list."""
    try:
        students_col = get_students_collection()
        students = list(students_col.find({}))
        safe_students = []
        for s in students:
            safe_students.append({
                "id": str(s["_id"]),
                "_id": str(s["_id"]),
                "regNo": s.get("regNo"),
                "name": s.get("name"),
                "department": s.get("department"),
                "hasVoted": s.get("hasVoted", False)
            })
        return Response(encode_payload(safe_students), status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": "Access Error", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@require_admin
def students_add(request):
    """Add student matching /api/students/add."""
    reg_no = request.data.get('regNo')
    name = request.data.get('name')
    password = request.data.get('password')
    department = request.data.get('department', 'CYBER SECURITY')

    if reg_no is None or not name:
        return Response({"error": "Roll Number and Name are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reg_int = int(reg_no)
    except (ValueError, TypeError):
        return Response({"error": "Roll Number must be numeric"}, status=status.HTTP_400_BAD_REQUEST)

    students_col = get_students_collection()
    exists = students_col.find_one({"regNo": reg_int})
    if exists:
        return Response({"error": "Student ID already exists"}, status=status.HTTP_400_BAD_REQUEST)

    hashed_password = hash_password(password or 'REPLACE_ME')
    students_col.insert_one({
        "regNo": reg_int,
        "name": name,
        "department": department or 'CYBER SECURITY',
        "password": hashed_password,
        "hasVoted": False,
        "addedAt": datetime.datetime.now(datetime.timezone.utc),
        "sessionToken": None
    })
    return Response(status=status.HTTP_200_OK)

@api_view(['DELETE'])
@require_admin
def student_delete(request, id):
    """Delete student matching /api/students/:id."""
    try:
        students_col = get_students_collection()
        students_col.delete_one({"_id": ObjectId(id)})
        return Response(status=status.HTTP_200_OK)
    except Exception as e:
        return Response(str(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def student_reset_password(request):
    """Reset student password matching /api/students/reset-password."""
    reg_no = request.data.get('regNo')
    new_password = request.data.get('newPassword')
    current_password = request.data.get('currentPassword')
    token = request.data.get('token')

    if not reg_no or not new_password:
        return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reg_int = int(reg_no)
    except (ValueError, TypeError):
        return Response({"error": "Invalid Registration Number"}, status=status.HTTP_400_BAD_REQUEST)

    students_col = get_students_collection()
    admin_info = authenticate_admin(request)

    if admin_info:
        # Admin can reset password directly
        hashed = hash_password(new_password)
        students_col.update_one({"regNo": reg_int}, {"$set": {"password": hashed}})
        return Response(status=status.HTTP_200_OK)

    elif current_password and token:
        # Student self reset with valid current password and session token
        student = students_col.find_one({"regNo": reg_int, "sessionToken": token})
        if not student:
            return Response({"error": "Authorization failed"}, status=status.HTTP_401_UNAUTHORIZED)

        if not verify_password(current_password, student.get('password', '')):
            return Response({"error": "Current password incorrect"}, status=status.HTTP_401_UNAUTHORIZED)

        hashed = hash_password(new_password)
        students_col.update_one({"regNo": reg_int}, {"$set": {"password": hashed}})
        return Response(status=status.HTTP_200_OK)

    return Response({"error": "Unauthorized: Admin key or student session required"}, status=status.HTTP_401_UNAUTHORIZED)

# ----------------- STAFF ENDPOINTS ----------------- #

@api_view(['POST'])
@throttle_login
def staff_verify(request):
    """Staff login matching /api/staff/verify."""
    staff_id = request.data.get('staffId')
    password = request.data.get('password')

    if not staff_id or password is None:
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    staffs_col = get_staffs_collection()
    staff = staffs_col.find_one({"staffId": str(staff_id)})
    if not staff:
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    stored_password = staff.get('password', '')
    if not verify_password(password, stored_password):
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    if ':' not in stored_password:
        new_hash = hash_password(password)
        staffs_col.update_one({"_id": staff["_id"]}, {"$set": {"password": new_hash}})

    token = generate_session_token()
    staffs_col.update_one({"_id": staff["_id"]}, {"$set": {"sessionToken": token}})

    return Response({
        "id": str(staff["_id"]),
        "_id": str(staff["_id"]),
        "staffId": staff.get("staffId"),
        "name": staff.get("name"),
        "department": staff.get("department"),
        "hasVoted": staff.get("hasVoted", False),
        "token": token
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@require_admin
def staff_list(request):
    """Admin-only staff list matching /api/staff/list."""
    try:
        staffs_col = get_staffs_collection()
        staffs = list(staffs_col.find({}))
        safe_staff = []
        for s in staffs:
            safe_staff.append({
                "id": str(s["_id"]),
                "_id": str(s["_id"]),
                "staffId": s.get("staffId"),
                "name": s.get("name"),
                "department": s.get("department"),
                "hasVoted": s.get("hasVoted", False)
            })
        return Response(encode_payload(safe_staff), status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": "Access Error", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@require_admin
def staff_add(request):
    """Add staff matching /api/staff/add."""
    staff_id = request.data.get('staffId')
    name = request.data.get('name')
    password = request.data.get('password')
    department = request.data.get('department', 'STAFF')

    if not staff_id or not name:
        return Response({"error": "Staff ID and Name are required"}, status=status.HTTP_400_BAD_REQUEST)

    staffs_col = get_staffs_collection()
    exists = staffs_col.find_one({"staffId": str(staff_id)})
    if exists:
        return Response({"error": "Staff ID already exists"}, status=status.HTTP_400_BAD_REQUEST)

    hashed_password = hash_password(password or 'REPLACE_ME')
    staffs_col.insert_one({
        "staffId": str(staff_id),
        "name": name,
        "department": department or 'STAFF',
        "password": hashed_password,
        "hasVoted": False,
        "addedAt": datetime.datetime.now(datetime.timezone.utc),
        "sessionToken": None
    })
    return Response(status=status.HTTP_200_OK)

@api_view(['DELETE'])
@require_admin
def staff_delete(request, id):
    """Delete staff matching /api/staff/:id."""
    try:
        staffs_col = get_staffs_collection()
        staffs_col.delete_one({"_id": ObjectId(id)})
        return Response(status=status.HTTP_200_OK)
    except Exception as e:
        return Response(str(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
