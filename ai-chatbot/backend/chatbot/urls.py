
from django.urls import path
from .views import (
    health_check,
    chat,
    register,
    login,
    conversation_list,
    conversation_detail,
)

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("chat/", chat, name="chat"),
    path("auth/register/", register, name="register"),
    path("auth/login/", login, name="login"),
    path("conversations/", conversation_list, name="conversation-list"),
    path(
        "conversations/<int:conversation_id>/",
        conversation_detail,
        name="conversation-detail",
    ),
]
