from django.urls import path
from . import views

urlpatterns = [
    path('vote', views.cast_vote, name='cast_vote'),
    path('blockchain/verify', views.blockchain_verify, name='blockchain_verify'),
]
