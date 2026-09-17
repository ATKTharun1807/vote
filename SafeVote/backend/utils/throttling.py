import time
from collections import defaultdict
from functools import wraps
from rest_framework.response import Response
from rest_framework import status

# In-memory IP-based rate limiting matching Node.js implementation
class InMemoryLimiter:
    def __init__(self, window_seconds: int, max_requests: int, error_message: str):
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.error_message = error_message
        self.requests = defaultdict(list)

    def is_allowed(self, ip: str) -> bool:
        now = time.time()
        # Clean older timestamps
        self.requests[ip] = [t for t in self.requests[ip] if now - t < self.window_seconds]
        if len(self.requests[ip]) >= self.max_requests:
            return False
        self.requests[ip].append(now)
        return True

# 20 requests per 15 minutes
login_limiter = InMemoryLimiter(
    window_seconds=15 * 60,
    max_requests=20,
    error_message="Too many login attempts. Please try again after 15 minutes."
)

# 5 requests per 1 hour
vote_limiter = InMemoryLimiter(
    window_seconds=60 * 60,
    max_requests=5,
    error_message="Security limit reached. Please contact admin if this is an error."
)

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip

def throttle_login(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        ip = get_client_ip(request)
        if not login_limiter.is_allowed(ip):
            return Response({"error": login_limiter.error_message}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        return view_func(request, *args, **kwargs)
    return _wrapped

def throttle_vote(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        ip = get_client_ip(request)
        if not vote_limiter.is_allowed(ip):
            return Response({"error": vote_limiter.error_message}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        return view_func(request, *args, **kwargs)
    return _wrapped
