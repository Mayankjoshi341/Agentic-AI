
function Sidebar({
  user,
  conversations,
  currentConversationId,
  onNewChat,
  onSelectConversation,
  onLogout,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>AI Chatbot</h2>
        <button className="new-chat-btn" onClick={onNewChat}>
          + New chat
        </button>
      </div>

      <div className="history-section">
        <h3>Chat history</h3>

        {!user && (
          <p className="history-empty">
            Log in to save and revisit your conversations.
          </p>
        )}

        {user && conversations.length === 0 && (
          <p className="history-empty">No saved conversations yet.</p>
        )}

        {user && (
          <div className="history-list">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`history-item ${
                  currentConversationId === conversation.id
                    ? "active"
                    : ""
                }`}
                onClick={() => onSelectConversation(conversation.id)}
                title={conversation.title}
              >
                {conversation.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        {user ? (
          <>
            <div className="user-info">
              <span className="user-avatar">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <div>
                <strong>{user.username}</strong>
                <small>Logged in</small>
              </div>
            </div>

            <button className="logout-btn" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <p>Guest mode · Chats aren't saved</p>
        )}

        <small>Powered by Groq</small>
      </div>
    </aside>
  );
}

export default Sidebar;
