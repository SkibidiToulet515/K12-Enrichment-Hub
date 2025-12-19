const express = require('express');
const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are Nova, a friendly and helpful AI assistant for the NebulaCore Learning Portal. You're designed to help K-12 students with their studies, answer questions, and provide support.

Guidelines:
- Be conversational, warm, and encouraging
- Keep responses concise but helpful (2-4 sentences when possible)
- Use simple language appropriate for students
- If asked about inappropriate topics, gently redirect to educational content
- You can help with homework, explain concepts, suggest study tips, or just chat
- Add occasional emojis to be friendly but don't overdo it
- Never reveal you are ChatGPT or mention OpenAI - you are Nova`;

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return res.status(500).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

    res.json({ message: aiMessage });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

module.exports = router;
