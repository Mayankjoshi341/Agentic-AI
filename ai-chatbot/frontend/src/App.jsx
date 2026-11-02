
import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import AuthForm from "./components/AuthForm";

import {
  streamMessage,
  getConversations,
  getConversation,
} from "./api";


function getSavedAuth() {
  try {
    return JSON.parse(localStorage.getItem("chatbot_auth")) || null;
  } catch {
    return null;
  }
}


function App() {
  const [auth, setAuth] = useState(getSavedAuth);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Load saved conversations when a user is logged in.
  useEffect(() => {
    if (!auth?.token) {
      setConversations([]);
      return;
    }

    let cancelled = false;

    getConversations(auth.token)
      .then((data) => {
        if (!cancelled) {
          setConversations(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Could not load chat history.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth?.token]);


  // Called after successful login or registration.
  function handleAuthSuccess(authData) {
    localStorage.setItem("chatbot_auth", JSON.stringify(authData));

    setAuth(authData);
    setMessages([]);
    setCurrentConversationId(null);
    setError("");
  }


  // Log out without deleting previously saved database conversations.
  function handleLogout() {
    localStorage.removeItem("chatbot_auth");

    setAuth(null);
    setMessages([]);
    setConversations([]);
    setCurrentConversationId(null);
    setError("");
  }


  // Start a new temporary or saved conversation.
  function handleNewChat() {
    if (isLoading) return;

    setMessages([]);
    setCurrentConversationId(null);
    setError("");
  }


  // Load a conversation belonging to the logged-in user.
  async function handleSelectConversation(conversationId) {
    if (!auth?.token || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const conversation = await getConversation(
        conversationId,
        auth.token
      );

      setMessages(conversation.messages);
      setCurrentConversationId(conversation.id);
    } catch (err) {
      setError(err.message || "Could not load this conversation.");
    } finally {
      setIsLoading(false);
    }
  }


  // Send a message and render the AI response chunk by chunk.
  async function handleSend(message) {
    if (isLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    const assistantId = crypto.randomUUID();

    // Guests retain their conversation in React memory only.
    const guestHistory = auth?.token
      ? []
      : messages
          .filter(
            (item) =>
              item.content &&
              (item.role === "user" || item.role === "assistant")
          )
          .map(({ role, content }) => ({ role, content }));

    // Display the user message and an empty assistant placeholder.
    setMessages((previous) => [
      ...previous,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
      },
    ]);

    setIsLoading(true);
    setError("");

    try {
      await streamMessage(
        message,
        auth?.token,
        currentConversationId,
        {
          onConversationId: (id) => {
            setCurrentConversationId(id);
          },

          onChunk: (chunk) => {
            setMessages((previous) =>
              previous.map((item) =>
                item.id === assistantId
                  ? {
                      ...item,
                      content: item.content + chunk,
                    }
                  : item
              )
            );
          },
        },
        guestHistory
      );

      // Refresh the sidebar after an authenticated chat is saved.
      if (auth?.token) {
        const history = await getConversations(auth.token);
        setConversations(history);
      }
    } catch (err) {
      setError(err.message || "Could not complete your request.");

      // Keep any partial response but remove an empty placeholder.
      setMessages((previous) =>
        previous.filter(
          (item) => item.id !== assistantId || item.content
        )
      );
    } finally {
      setIsLoading(false);
    }
  }


  return (
    <div className="app">
      <Sidebar
        user={auth?.user}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onLogout={handleLogout}
      />

      <main className="main-panel">
        {!auth && (
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        )}

        <ChatWindow messages={messages} />

        {isLoading && (
          <p className="loading-message">AI is thinking...</p>
        )}

        {error && (
          <p className="error-message">{error}</p>
        )}

        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
        />
      </main>
    </div>
  );
}

export default App;
