import os
from pathlib import Path
from django.http import HttpResponse, FileResponse, Http404
from django.conf import settings

FRONTEND_DIR = settings.BASE_DIR.parent

def serve_index(request):
    """Serve index.html for root and client-side SPA routing."""
    index_path = FRONTEND_DIR / 'index.html'
    if index_path.exists():
        return FileResponse(open(index_path, 'rb'), content_type='text/html')
    return HttpResponse("SafeVote Frontend index.html not found.", status=404)

def serve_voting_image(request):
    """Serve voting.jpg image."""
    img_path = FRONTEND_DIR / 'voting.jpg'
    if img_path.exists():
        return FileResponse(open(img_path, 'rb'), content_type='image/jpeg')
    raise Http404("Image not found")
