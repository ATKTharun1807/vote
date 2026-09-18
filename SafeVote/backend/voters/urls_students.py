from django.urls import path
from . import views

urlpatterns = [
    path('verify', views.students_verify, name='students_verify'),
    path('list', views.students_list, name='students_list'),
    path('add', views.students_add, name='students_add'),
    path('reset-password', views.student_reset_password, name='student_reset_password'),
    path('<str:id>', views.student_delete, name='student_delete'),
]
