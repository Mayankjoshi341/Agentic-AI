from django.contrib import admin
from .models import Conversation, Message
# Register your models here.

class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("created_at",)

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "created_at", "updated_at")
    list_filter = ("user",)
    search_fields = ("title", "user__username")
    inlines = [MessageInline]

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("conversation", "role", "content", "created_at")
    list_filter = ("role",)
    search_fields = ("content", "conversation__title")
    readonly_fields = ("created_at",)
