require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { CohereClient } = require('cohere-ai');

const User = require('./models/User');
const Chat = require('./models/Chat');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// Auth Middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token missing' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Cohere AI
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

// DSA Keywords
const dsaKeywords = [
  "sort", "stack", "queue", "tree", "graph", "heap", "hash",
  "search", "traversal", "linked list", "recursion", "algorithm",
  "binary", "complexity", "heap sort", "dsa", "data structure"
];

function isDSARelated(text) {
  const lower = text.toLowerCase();
  return dsaKeywords.some(keyword => lower.includes(keyword));
}

// Multer Setup for File Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Dynamic Prompt Generator
function enhancePrompt(rawInput) {
  const lower = rawInput.toLowerCase();
  const sections = [];

  const possibleSections = {
    introduction: ['introduction', 'intro'],
    advantages: ['advantages', 'pros', 'benefits'],
    disadvantages: ['disadvantages', 'cons', 'limitations'],
    pseudocode: ['pseudocode', 'pseudo code', 'algorithm'],
    applications: ['applications', 'uses', 'use cases']
  };

  // Detect mentioned sections
  for (const [section, keywords] of Object.entries(possibleSections)) {
    if (keywords.some(word => lower.includes(word))) {
      sections.push(capitalize(section));
    }
  }

  // Remove known words to extract concept
  const cleaned = rawInput.replace(
    /(introduction|intro|advantages|pros|benefits|disadvantages|cons|limitations|pseudocode|pseudo code|algorithm|applications|uses|use cases)/gi,
    ''
  ).replace(/[^a-zA-Z0-9\s]/g, '').trim();

  const topic = cleaned || "this concept";
  const allSections = ["Introduction", "Advantages", "Disadvantages", "Pseudocode", "Applications"];
  const finalSections = sections.length ? sections : allSections;

  return `You are a helpful DSA tutor. Explain the concept "${topic}" with focus on:
${finalSections.join('\n')}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Routes

// Register
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ error: "Username taken" });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();

  const token = jwt.sign({ id: user._id, username }, process.env.JWT_SECRET);
  res.json({ token, username });
});

// Login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user._id, username }, process.env.JWT_SECRET);
  res.json({ token, username });
});

// New Chat
app.post('/chat/new', verifyToken, async (req, res) => {
  const chat = new Chat({
    userId: req.user.id,
    title: null,
    messages: [{ type: 'bot', text: '🤖 Hello! I am your DSA Tutor.' }]
  });
  await chat.save();
  res.json(chat);
});

// Chat Message (without file)
app.post('/chat', verifyToken, async (req, res) => {
  const { message, chatId } = req.body;
  if (!isDSARelated(message)) {
    return res.json({ reply: '⚠️ Please ask only Data Structures & Algorithms related questions.' });
  }

  try {
    const response = await cohere.chat({
      model: "command-r",
      message: enhancePrompt(message)
    });

    const text = response.text;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ reply: "❌ Chat not found" });

    chat.messages.push({ type: 'user', text: message });
    chat.messages.push({ type: 'bot', text });
    await chat.save();

    res.json({ reply: text });
  } catch (err) {
    console.error("❌ Cohere API error:", err.message);
    res.status(500).json({ reply: "❌ Cohere API error" });
  }
});

// Chat Message with File Upload
app.post('/chat/file', verifyToken, upload.single('file'), async (req, res) => {
  const { message, chatId } = req.body;
  const filePath = req.file?.path;

  if (!filePath || !message) {
    return res.status(400).json({ reply: '⚠️ File or message missing' });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const combined = `${message}\n\nFile Content:\n${content}`;

    if (!isDSARelated(message) || !isDSARelated(content)) {
      return res.json({ reply: '⚠️ The prompt or file is not related to Data Structures & Algorithms.' });
    }

    const response = await cohere.chat({
      model: "command-r",
      message: enhancePrompt(combined)
    });

    const text = response.text;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ reply: "❌ Chat not found" });

    chat.messages.push({ type: 'user', text: message });
    chat.messages.push({ type: 'bot', text });
    await chat.save();

    res.json({ reply: text });
  } catch (err) {
    console.error("❌ File processing error:", err.message);
    res.status(500).json({ reply: '❌ Internal server error' });
  }
});

// Get All Chats
app.get('/chats', verifyToken, async (req, res) => {
  const chats = await Chat.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(chats);
});

// Rename Chat
app.post('/chat/rename', verifyToken, async (req, res) => {
  const { chatId, title } = req.body;
  const chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
  if (!chat) return res.status(404).json({ error: 'Chat not found' });

  chat.title = title;
  await chat.save();
  res.json({ message: 'Renamed successfully' });
});

// Delete Chat
app.delete('/chat/:id', verifyToken, async (req, res) => {
  await Chat.deleteOne({ _id: req.params.id, userId: req.user.id });
  res.json({ message: 'Deleted successfully' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
