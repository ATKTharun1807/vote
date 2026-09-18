import re
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings

from elections import views as election_views
from voting import views as voting_views
from . import spa_views

FRONTEND_DIR = settings.BASE_DIR.parent

urlpatterns = [
    # Top-Level Election & Session Endpoints
    path('api/health', election_views.health_check, name='health_check'),
    path('api/v1/session', election_views.session_check, name='session_check'),
    path('api/config/update', election_views.config_update, name='config_update'),
    path('api/reset-all', election_views.reset_all, name='reset_all'),

    # Modular Domain APIs
    path('api/admin/', include('accounts.urls')),
    path('api/students/', include('voters.urls_students')),
    path('api/staff/', include('voters.urls_staff')),
    path('api/candidates/', include('candidates.urls')),
    path('api/vote', voting_views.cast_vote, name='cast_vote'),
    path('api/blockchain/verify', voting_views.blockchain_verify, name='blockchain_verify'),

    # Static Assets Serving for Frontend SPA
    re_path(r'^css/(?P<path>.*)$', serve, {'document_root': FRONTEND_DIR / 'css'}),
    re_path(r'^js/(?P<path>.*)$', serve, {'document_root': FRONTEND_DIR / 'js'}),
    path('voting.jpg', spa_views.serve_voting_image, name='serve_voting_image'),

    # SPA Entry & Fallback
    path('', spa_views.serve_index, name='serve_index'),
    re_path(r'^(?!api/).*$', spa_views.serve_index, name='spa_fallback'),
]
