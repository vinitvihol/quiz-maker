const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateFromPrompt = async (prompt) => {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2048,
  });
  const rawText = completion.choices[0].message.content;
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');
  return JSON.parse(jsonMatch[0]);
};

const quizFormat = `Return ONLY a valid JSON object in this exact format, no other text:
{
  "questions": [
    {
      "question": "question text here",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "answer": "A) option1",
      "explanation": "brief explanation why this is correct"
    }
  ]
}`;

app.post('/api/generate-quiz', async (req, res) => {
  const { text, numQuestions = 5, difficulty = 'medium' } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });
  try {
    const quiz = await generateFromPrompt(
      `You are a quiz generator. Based on the text below, generate exactly ${numQuestions} multiple choice questions at ${difficulty} difficulty.\n\n${quizFormat}\n\nText to generate quiz from:\n${text}`
    );
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

app.post('/api/generate-quiz-topic', async (req, res) => {
  const { topic, numQuestions = 5, difficulty = 'medium' } = req.body;
  if (!topic) return res.status(400).json({ error: 'No topic provided' });
  try {
    const quiz = await generateFromPrompt(
      `You are a quiz generator. Generate exactly ${numQuestions} multiple choice questions about "${topic}" at ${difficulty} difficulty. Make the questions interesting, fun and educational.\n\n${quizFormat}`
    );
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});