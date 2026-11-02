
const API_BASE_URL = "http://127.0.0.1:8000/api";

async function apiRequest(path, options = {}) {
  const { token, headers: customHeaders, ...fetchOptions } = options;

  const headers = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const details =
      data.error ||
      data.detail ||
      Object.values(data).flat().join(" ");

    throw new Error(details || `Request failed: ${response.status}`);
  }

  return data;
}

// Register a new account
export function registerUser(username, email, password) {
  return apiRequest("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

// Log in to an existing account
export function loginUser(username, password) {
  return apiRequest("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// Stream the AI response chunk by chunk
export async function streamMessage(
  message,
  token,
  conversationId,
  callbacks = {},
  guestHistory = []
) {
  const body = { message };

  if (conversationId !== null && conversationId !== undefined) {
    body.conversation_id = conversationId;
  }

  if (!token) {
    body.history = guestHistory;
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/chat/`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    throw new Error(
      data.error || data.detail || `Request failed: ${response.status}`
    );
  }

  const conversationHeader = response.headers.get("X-Conversation-ID");

  if (conversationHeader) {
    callbacks.onConversationId?.(Number(conversationHeader));
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      if (chunk) {
        callbacks.onChunk?.(chunk);
      }
    }

    const remaining = decoder.decode();

    if (remaining) {
      callbacks.onChunk?.(remaining);
    }
  } finally {
    reader.releaseLock();
  }
}

// List the logged-in user's saved conversations
export function getConversations(token) {
  return apiRequest("/conversations/", { token });
}

// Load one saved conversation and its messages
export function getConversation(conversationId, token) {
  return apiRequest(`/conversations/${conversationId}/`, { token });
}
