from django.urls import path
from . import views

urlpatterns = [
    path('health', views.health_check, name='health_check'),
    path('v1/session', views.session_check, name='session_check'),
    path('config/update', views.config_update, name='config_update'),
    path('reset-all', views.reset_all, name='reset_all'),
]
