class SecurityHeadersMiddleware:
    """Security headers middleware reproducing Node.js Express server headers."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Prevent Clickjacking
        response['X-Frame-Options'] = 'SAMEORIGIN'

        # Prevent MIME sniffing
        response['X-Content-Type-Options'] = 'nosniff'

        # HSTS (Strict Transport Security)
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'

        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Content Security Policy (CSP)
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://translate.google.com https://www.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://www.gstatic.com https://translate.googleapis.com; "
            "img-src 'self' data: https://www.shutterstock.com https://translate.google.com https://www.gstatic.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
            "frame-ancestors 'none';"
        )

        # Remove Server / X-Powered-By if present
        if 'Server' in response:
            del response['Server']
        if 'X-Powered-By' in response:
            del response['X-Powered-By']

        return response
