
from django.contrib.auth import authenticate
from django.db import transaction

from rest_framework import status # type: ignore
from rest_framework.authentication import TokenAuthentication # type: ignore
from rest_framework.authtoken.models import Token # type: ignore
from rest_framework.decorators import ( # type: ignore
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated # type: ignore
from rest_framework.response import Response # type: ignore

from .models import Conversation, Message
from .serializers import RegisterSerializer
import logging

from django.http import StreamingHttpResponse
from .services import create_ai_stream

@api_view(["GET"])
def health_check(request):
    return Response({
        "status": "success",
        "message": "Django backend is running!",
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "message": "Registration successful.",
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")

    if not isinstance(username, str) or not isinstance(password, str):
        return Response(
            {"error": "Username and password must be strings."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(
        request,
        username=username,
        password=password,
    )

    if user is None:
        return Response(
            {"error": "Invalid username or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "message": "Login successful.",
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    })



logger = logging.getLogger(__name__)


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def chat(request):
    message = request.data.get("message", "")
    conversation_id = request.data.get("conversation_id")

    if not isinstance(message, str) or not message.strip():
        return Response(
            {"error": "Message cannot be empty."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    message = message.strip()
    user = request.user
    authenticated = user.is_authenticated
    conversation = None
    history = []

    if conversation_id is not None:
        if not authenticated:
            return Response(
                {"error": "Log in to access saved conversations."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            conversation_id = int(conversation_id)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid conversation ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation = Conversation.objects.filter(
            id=conversation_id,
            user=user,
        ).first()

        if conversation is None:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        history = [
            {"role": item.role, "content": item.content}
            for item in conversation.messages.all()
        ]

    # Guest history comes from React because guest chats are not stored.
    if not authenticated:
        supplied_history = request.data.get("history", [])

        if not isinstance(supplied_history, list):
            return Response(
                {"error": "Invalid conversation history."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in supplied_history:
            if (
                not isinstance(item, dict)
                or item.get("role") not in ("user", "assistant")
                or not isinstance(item.get("content"), str)
            ):
                return Response(
                    {"error": "Invalid conversation history."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        history = [
            {"role": item["role"], "content": item["content"]}
            for item in supplied_history[-20:]
        ]

    # Connect to Groq before writing the new user message.
    try:
        completion = create_ai_stream(message, history)
    except Exception:
        logger.exception("Could not start the Groq stream")
        return Response(
            {"error": "The AI service is temporarily unavailable."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # Only authenticated conversations are stored in the database.
    if authenticated:
        with transaction.atomic():
            if conversation is None:
                conversation = Conversation.objects.create(
                    user=user,
                    title=message[:200],
                )

            Message.objects.create(
                conversation=conversation,
                role=Message.Role.USER,
                content=message,
            )

            conversation.save()

    def generate():
        answer_parts = []
        completed = False

        try:
            for chunk in completion:
                text = chunk.choices[0].delta.content or ""

                if text:
                    answer_parts.append(text)
                    yield text

            completed = True

        except Exception:
            logger.exception("Groq stream interrupted")
            yield "\n\n[The response was interrupted. Please try again.]"

        finally:
            # Save the full AI answer only after generation completes.
            if completed and authenticated and answer_parts:
                try:
                    answer = "".join(answer_parts)

                    with transaction.atomic():
                        Message.objects.create(
                            conversation=conversation,
                            role=Message.Role.ASSISTANT,
                            content=answer,
                        )

                        conversation.save()

                except Exception:
                    logger.exception(
                        "Could not save the completed assistant message"
                    )

    response = StreamingHttpResponse(
        generate(),
        content_type="text/plain; charset=utf-8",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"

    if authenticated:
        response["X-Conversation-ID"] = str(conversation.id)
        response["Access-Control-Expose-Headers"] = "X-Conversation-ID"

    return response

@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def conversation_list(request):
    conversations = Conversation.objects.filter(
        user=request.user
    ).order_by("-updated_at")

    return Response([
        {
            "id": conversation.id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
        }
        for conversation in conversations
    ])


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def conversation_detail(request, conversation_id):
    conversation = Conversation.objects.filter(
        id=conversation_id,
        user=request.user,
    ).first()

    if conversation is None:
        return Response(
            {"error": "Conversation not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    messages = conversation.messages.all()

    return Response({
        "id": conversation.id,
        "title": conversation.title,
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at,
            }
            for message in messages
        ],
    })
