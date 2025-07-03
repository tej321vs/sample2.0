// src/components/AuthModal.jsx
import React, { useState } from 'react';

const API_BASE = "http://localhost:3000";

function AuthModal({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (type) => {
    try {
      const res = await fetch(`${API_BASE}/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${type} failed`);

      localStorage.setItem('token', data.token);
      setToken(data.token);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div id="authModal">
      <form onSubmit={e => e.preventDefault()}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button onClick={() => handleAuth("login")}>Login</button>
        <button onClick={() => handleAuth("register")}>Register</button>
      </form>
    </div>
  );
}

export default AuthModal;
