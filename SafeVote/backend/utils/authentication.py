import datetime
from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from .database import get_configs_collection, get_adminaccesses_collection, get_students_collection, get_staffs_collection

def authenticate_admin(request):
    """Authenticate administrator via X-Admin-Key header."""
    key = request.headers.get('x-admin-key') or request.META.get('HTTP_X_ADMIN_KEY')
    if not key:
        return None

    configs = get_configs_collection()
    config = configs.find_one({"type": "main"})

    # 1. Master Key or Admin Session Token
    if config and (config.get("adminKey") == key or config.get("adminSessionToken") == key):
        return {
            "role": "SUPER_ADMIN",
            "permissions": ["ALL"],
            "is_super_admin": True
        }

    # 2. Shared Admin Access Key
    adminaccesses = get_adminaccesses_collection()
    shared = adminaccesses.find_one({"accessKey": key})
    if shared:
        adminaccesses.update_one(
            {"_id": shared["_id"]},
            {"$set": {"lastAccessed": datetime.datetime.now(datetime.timezone.utc)}}
        )
        return {
            "role": shared.get("role", "MODERATOR"),
            "permissions": shared.get("permissions", ["MANAGE_CANDIDATES", "MANAGE_STUDENTS"]),
            "is_super_admin": False
        }

    return None

def authenticate_student(request, reg_no_override=None):
    """Authenticate student voter session."""
    token = request.headers.get('x-student-token') or request.META.get('HTTP_X_STUDENT_TOKEN')
    reg_no = reg_no_override or request.data.get('regNo') or request.query_params.get('regNo') or request.headers.get('x-reg-no') or request.META.get('HTTP_X_REG_NO')

    if not token or not reg_no:
        return None

    try:
        reg_int = int(reg_no)
    except (ValueError, TypeError):
        return None

    students = get_students_collection()
    student = students.find_one({"regNo": reg_int, "sessionToken": token})
    return student

def authenticate_staff(request, staff_id_override=None):
    """Authenticate staff voter session."""
    token = request.headers.get('x-staff-token') or request.META.get('HTTP_X_STAFF_TOKEN')
    staff_id = staff_id_override or request.data.get('staffId') or request.query_params.get('staffId') or request.headers.get('x-staff-id') or request.META.get('HTTP_X_STAFF_ID')

    if not token or not staff_id:
        return None

    staffs = get_staffs_collection()
    staff = staffs.find_one({"staffId": str(staff_id), "sessionToken": token})
    return staff

def require_admin(view_func):
    """Decorator requiring valid admin access."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        admin_info = authenticate_admin(request)
        if not admin_info:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        request.admin_role = admin_info["role"]
        request.admin_permissions = admin_info["permissions"]
        request.is_super_admin = admin_info["is_super_admin"]
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def require_super_admin(view_func):
    """Decorator requiring SUPER_ADMIN role."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        admin_info = authenticate_admin(request)
        if not admin_info:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        if admin_info["role"] != "SUPER_ADMIN":
            return Response({"error": "Restricted to Super Admin"}, status=status.HTTP_403_FORBIDDEN)
        request.admin_role = admin_info["role"]
        request.admin_permissions = admin_info["permissions"]
        request.is_super_admin = True
        return view_func(request, *args, **kwargs)
    return _wrapped_view
