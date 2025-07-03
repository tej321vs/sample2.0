// src/components/Chat.jsx
import React, { useState } from 'react';

function Chat({
  chat, onSend, status,
  showMicOptions, setShowMicOptions,
  voiceInput, setVoiceInput, voiceOutput, setVoiceOutput,
  onToggleSidebar
}) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <div className="main">
      <button className="sidebar-toggle" onClick={onToggleSidebar}>☰</button>
      <div className="chat-container">
        {chat?.messages.map((m, i) => (
          <div key={i} className={`message ${m.type}`}>{m.text}</div>
        ))}
      </div>
      <div id="status">{status}</div>
      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
        />
        <button onClick={() => setShowMicOptions(true)}>🎤</button>
        <button onClick={handleSend}>➤</button>
        <button onClick={() => window.speechSynthesis.cancel()}>🛑</button>
      </div>
    </div>
  );
}

export default Chat;
