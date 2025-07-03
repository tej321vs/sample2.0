// src/components/Sidebar.jsx
import React from 'react';

function Sidebar({ chats, setCurrentChatIndex, onNewChat, onRename, onDelete, hidden }) {
  return (
    <div className={`sidebar ${hidden ? 'hidden' : ''}`}>
      <button className="new-chat" onClick={onNewChat}>＋ New Chat</button>
      <div className="chat-history">
        {chats.map((chat, i) => (
          <div key={chat._id} className="chat-item">
            <span style={{ flex: 1 }} onClick={() => setCurrentChatIndex(i)}>
              {chat.title || `Chat ${i + 1}`}
            </span>
            <span onClick={(e) => {
              e.stopPropagation();
              const newTitle = prompt("Rename chat:", chat.title || `Chat ${i + 1}`);
              if (newTitle) onRename(i, newTitle);
            }}>📝</span>
            <span onClick={(e) => {
              e.stopPropagation();
              onDelete(i);
            }}>🗑</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
