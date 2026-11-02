
import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

function ChatWindow({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      block: "end",
      behavior: "auto",
    });
  }, [messages]);

  return (
    <section className="chat-window">
      {messages.length === 0 ? (
        <div className="empty-state">
          <h1>How can I help you?</h1>
          <p>Ask a question to start a conversation.</p>
        </div>
      ) : (
        messages.map((item) => (
          <MessageBubble
            key={item.id}
            message={item.content}
            role={item.role}
          />
        ))
      )}

      <div ref={bottomRef} />
    </section>
  );
}

export default ChatWindow;
