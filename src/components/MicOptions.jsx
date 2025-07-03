// src/components/MicOptions.jsx
import React from 'react';

let recognition;

function MicOptions({ setVoiceInput, setVoiceOutput, setShowMicOptions }) {
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert("❌ Voice input not supported in this browser.");
      return;
    }

    setVoiceInput(true);
    setShowMicOptions(false);

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.start();

    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      const inputBox = document.querySelector('input[type="text"]');
      if (inputBox) inputBox.value = transcript;
    };

    recognition.onerror = function (event) {
      alert("🎤 Voice input error: " + event.error);
    };
  };

  const handleVoiceOutput = () => {
    setVoiceOutput(true);
    alert("🔊 Voice output enabled");
    setShowMicOptions(false);
  };

  const disableMic = () => {
    setVoiceInput(false);
    setVoiceOutput(false);
    setShowMicOptions(false);

    // Stop voice input
    try {
      if (recognition) recognition.abort();
    } catch (e) {}

    // Stop voice output
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    alert("❌ Mic disabled");
  };

  return (
    <div id="micOptions">
      <button onClick={handleVoiceInput}>🎙 Take Voice Input</button>
      <button onClick={handleVoiceOutput}>🔊 Read Response</button>
      <button onClick={disableMic}>❌ Disable Mic</button>
    </div>
  );
}

export default MicOptions;
