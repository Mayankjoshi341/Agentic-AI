
import { useState } from "react";

function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || disabled) return;

    onSend(message);
    setInput("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="chat-input-area">
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          className="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message your AI assistant..."
          rows={1}
          disabled={disabled}
          aria-label="Type your message"
        />

        <button
          type="submit"
          disabled={disabled || !input.trim()}
        >
          {disabled ? "Thinking..." : "Send"}
        </button>
      </form>

      <p className="input-hint">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}

export default ChatInput;
