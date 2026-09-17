from django.urls import path
from . import views

urlpatterns = [
    path('verify', views.admin_verify, name='admin_verify'),
    path('access-list', views.admin_access_list, name='admin_access_list'),
    path('access-add', views.admin_access_add, name='admin_access_add'),
    path('access-remove/<str:id>', views.admin_access_remove, name='admin_access_remove'),
]
