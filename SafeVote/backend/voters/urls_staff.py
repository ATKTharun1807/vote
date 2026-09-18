from django.urls import path
from . import views

urlpatterns = [
    path('verify', views.staff_verify, name='staff_verify'),
    path('list', views.staff_list, name='staff_list'),
    path('add', views.staff_add, name='staff_add'),
    path('<str:id>', views.staff_delete, name='staff_delete'),
]
