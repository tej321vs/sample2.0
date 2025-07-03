// src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import AuthModal from './components/AuthModal';
import MicOptions from './components/MicOptions';
import './App.css';

const API_BASE = "http://localhost:3000";

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [chats, setChats] = useState([]);
  const [currentChatIndex, setCurrentChatIndex] = useState(-1);
  const [voiceInput, setVoiceInput] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [status, setStatus] = useState('');
  const [showMicOptions, setShowMicOptions] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchChats();
  }, [token]);

  const fetchChats = async () => {
    const res = await fetch(`${API_BASE}/chats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setChats(data);
    setCurrentChatIndex(data.length - 1);
  };

  const handleNewChat = async () => {
    const res = await fetch(`${API_BASE}/chat/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const chat = await res.json();
    setChats([...chats, chat]);
    setCurrentChatIndex(chats.length);
  };

  const handleRename = async (index, newTitle) => {
    if (!newTitle) return;
    const chatId = chats[index]._id;
    const updated = chats.map((chat, i) =>
      i === index ? { ...chat, title: newTitle } : chat
    );
    setChats(updated);

    await fetch(`${API_BASE}/chat/rename`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ chatId, title: newTitle })
    });
  };

  const handleDelete = async (index) => {
    const chatId = chats[index]._id;
    await fetch(`${API_BASE}/chat/${chatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const updated = [...chats];
    updated.splice(index, 1);
    setChats(updated);
    setCurrentChatIndex(updated.length - 1);
  };

  const handleSend = async (msg) => {
    if (!msg || currentChatIndex === -1 || status === "Thinking...") return;
    const chatId = chats[currentChatIndex]._id;

    const userMsg = { type: 'user', text: msg };
    const updatedChats = chats.map((chat, index) =>
      index === currentChatIndex
        ? { ...chat, messages: [...chat.messages, userMsg] }
        : chat
    );
    setChats(updatedChats);
    setStatus("Thinking...");

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: msg, chatId })
      });
      const data = await res.json();
      const botMsg = { type: 'bot', text: data.reply };

      const updatedWithReply = updatedChats.map((chat, index) =>
        index === currentChatIndex
          ? { ...chat, messages: [...chat.messages, botMsg] }
          : chat
      );
      setChats(updatedWithReply);

      if (voiceOutput) speak(data.reply);
    } catch {
      const errorMsg = { type: 'bot', text: '❌ Server error.' };
      const updatedWithError = updatedChats.map((chat, index) =>
        index === currentChatIndex
          ? { ...chat, messages: [...chat.messages, errorMsg] }
          : chat
      );
      setChats(updatedWithError);
    }

    setStatus('');
  };

  const speak = (text) => {
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    window.location.reload();
  };

  return (
    <div className="app">
      {!token && <AuthModal setToken={setToken} />}
      {token && (
        <>
          {sidebarVisible && (
            <Sidebar
              chats={chats}
              setCurrentChatIndex={(i) => status !== "Thinking..." && setCurrentChatIndex(i)}
              onNewChat={handleNewChat}
              onRename={handleRename}
              onDelete={handleDelete}
              token={token}
              hidden={!sidebarVisible}
            />
          )}
          <Chat
            chat={chats[currentChatIndex]}
            onSend={handleSend}
            status={status}
            showMicOptions={showMicOptions}
            setShowMicOptions={setShowMicOptions}
            voiceInput={voiceInput}
            setVoiceInput={setVoiceInput}
            voiceOutput={voiceOutput}
            setVoiceOutput={setVoiceOutput}
            onToggleSidebar={() => setSidebarVisible(prev => !prev)}
          />
          <button className="logout-btn" onClick={logout}>Logout</button>
          <button className="back-btn" onClick={() => window.location.href = '/launcher.html'}>← Back</button>
          {showMicOptions && (
            <MicOptions
              setVoiceInput={setVoiceInput}
              setVoiceOutput={setVoiceOutput}
              setShowMicOptions={setShowMicOptions}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
