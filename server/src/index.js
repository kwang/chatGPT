const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Store generated questions for each session
const sessionQuestions = new Map();

// Debug logging for environment variables
console.log('Current working directory:', process.cwd());
console.log('Environment variables loaded:', {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Present' : 'Missing',
  NODE_ENV: process.env.NODE_ENV
});

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

const evaluationPrompt = `You are an expert interview coach evaluating a candidate's answer to an interview question. Provide a detailed evaluation with the following structure:

1. Score the answer on a scale of 1-10
2. List 2-3 key strengths of the answer
3. List 2-3 areas for improvement
4. Provide specific suggestions for improvement

Format your response as a JSON object with the following structure:
{
  "score": number,
  "strengths": string[],
  "improvements": string[],
  "suggestions": string
}`;

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

app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const { question, answer } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    console.log('Evaluating answer:', { question, answer });

    const evaluationPrompt = `You are an expert interviewer evaluating a candidate's answer. 
    Please evaluate the following interview question and answer:
    
    Question: ${question}
    Answer: ${answer}
    
    Provide a detailed evaluation in the following format:
    {
      "score": <number between 1-10>,
      "strengths": ["strength1", "strength2", "strength3"],
      "improvements": ["improvement1", "improvement2", "improvement3"],
      "suggestions": "Detailed suggestions for improvement"
    }
    
    Focus on:
    1. Clarity and structure of the answer
    2. Technical accuracy and depth
    3. Communication skills
    4. Relevance to the question
    5. Examples and evidence provided`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an expert interviewer providing detailed feedback on interview answers." },
        { role: "user", content: evaluationPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const evaluationText = completion.choices[0].message.content;
    console.log('Raw evaluation response:', evaluationText);

    let evaluation;
    try {
      evaluation = JSON.parse(evaluationText);
    } catch (parseError) {
      console.error('Error parsing evaluation:', parseError);
      // Fallback to a structured response if JSON parsing fails
      evaluation = {
        score: 5,
        strengths: ["Answer provided"],
        improvements: ["Could not parse detailed evaluation"],
        suggestions: "Please try again for a more detailed evaluation."
      };
    }

    console.log('Sending evaluation response:', evaluation);
    res.json({ evaluation });
  } catch (error) {
    console.error('Error in evaluate-answer:', error);
    res.status(500).json({ 
      error: 'Failed to evaluate answer',
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