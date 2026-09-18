from django.urls import path
from . import views

urlpatterns = [
    path('list', views.candidates_list, name='candidates_list'),
    path('add', views.candidates_add, name='candidates_add'),
    path('<str:id>', views.candidate_detail, name='candidate_detail'),
]
