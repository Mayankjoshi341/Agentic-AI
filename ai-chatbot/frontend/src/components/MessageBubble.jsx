
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MessageBubble({ message, role }) {
  const isUser = role === "user";

  return (
    <div className={isUser ? "user-row" : "ai-row"}>
      <div className="message-bubble">
        {isUser ? (
          message
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message || ""}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
