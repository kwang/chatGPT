require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = 3001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Store conversation history
const conversations = new Map();

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Initialize or get conversation history
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, [
        {
          role: 'system',
          content: `You are an AI interviewer conducting a voice interview. 
          Keep your responses concise and natural-sounding for voice interaction.
          Ask one question at a time and wait for the candidate's response.
          Focus on making the conversation flow naturally as if it were a real interview.
          Keep responses under 2-3 sentences for better voice interaction.`
        }
      ]);
    }
    
    const conversationHistory = conversations.get(sessionId);
    
    // Add user message to history
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 100,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });

    const aiResponse = completion.choices[0].message;
    
    // Add AI response to history
    conversationHistory.push(aiResponse);
    
    // Keep only last 10 messages to manage context window
    if (conversationHistory.length > 10) {
      conversationHistory.splice(1, 2);
    }

    res.json({ response: aiResponse.content });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to get response from ChatGPT' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
}); 