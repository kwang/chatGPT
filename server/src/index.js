const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Store generated questions for each session
const sessionQuestions = new Map();

// Verify API key is present
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const systemPrompt = `You are a friendly and engaging AI interviewer conducting a casual conversation. Your goal is to make the candidate feel comfortable and at ease while gathering information about their experience and skills.

Key traits:
- Warm and conversational tone
- Use natural language and occasional light humor
- Show genuine interest in the candidate's responses
- Ask follow-up questions based on their answers
- Provide positive reinforcement and encouragement
- Keep responses concise and engaging
- Use a mix of open-ended questions and specific follow-ups
- Maintain a professional but friendly demeanor

Example style:
- "That's really interesting! Could you tell me more about..."
- "I love how you handled that situation. What did you learn from it?"
- "That's a great point! How did that experience shape your approach to..."
- "I'm curious to hear more about your journey with..."

Remember to:
- Be conversational and natural
- Show empathy and understanding
- Keep the tone light but professional
- Make the candidate feel valued and heard
- Adapt your style based on the candidate's responses

Start by introducing yourself warmly and asking about their background or experience.`;

const questionGeneratorPrompt = `You are an expert interviewer tasked with generating relevant interview questions based on a job description. Your questions should:

1. Cover key technical skills and requirements
2. Assess problem-solving abilities
3. Evaluate soft skills and cultural fit
4. Include behavioral questions
5. Be specific to the role and industry
6. Progress from basic to more complex topics
7. Include both open-ended and specific questions

Format your response as a JSON array of strings, with each string being a question.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    // Get stored questions for this session
    const questions = sessionQuestions.get(sessionId) || [];
    
    // Create a dynamic system prompt that includes the questions
    const dynamicPrompt = questions.length > 0 
      ? `${systemPrompt}\n\nUse these specific questions in your interview, but ask them naturally in conversation:\n${questions.join('\n')}`
      : systemPrompt;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: dynamicPrompt },
        { role: "user", content: message }
      ],
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to get response from OpenAI' });
  }
});

app.post('/api/generate-questions', async (req, res) => {
  try {
    const { jobDescription, sessionId } = req.body;
    
    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    console.log('Generating questions for job description:', jobDescription);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: `${questionGeneratorPrompt}\n\nPlease format your response as a JSON array of questions. Example: ["Question 1?", "Question 2?", "Question 3?"]`
        },
        { role: "user", content: `Generate 5 interview questions for this job description:\n\n${jobDescription}` }
      ]
    });

    console.log('OpenAI response:', completion.choices[0].message.content);

    try {
      const response = JSON.parse(completion.choices[0].message.content);
      const questions = Array.isArray(response) ? response : 
                       Array.isArray(response.questions) ? response.questions :
                       [response.content || response.text || "No questions generated"];
      
      // Store questions for this session
      if (sessionId) {
        sessionQuestions.set(sessionId, questions);
      }
      
      res.json({ questions });
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      // If parsing fails, try to extract questions from the text
      const text = completion.choices[0].message.content;
      const questions = text
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
      
      // Store questions for this session
      if (sessionId) {
        sessionQuestions.set(sessionId, questions);
      }
      
      res.json({ questions });
    }
  } catch (error) {
    console.error('Error in generate-questions:', error);
    res.status(500).json({ 
      error: 'Failed to generate questions',
      details: error.message 
    });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 