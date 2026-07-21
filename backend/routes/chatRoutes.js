const express = require('express');
const OpenAI = require('openai');
const { authenticate } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(authenticate);

// ---------------------------------------------------------------------------
// Groq AI — pure search assistant (OpenAI-compatible API)
// Configure via GROQ_API_KEY environment variable.
// Docs: https://console.groq.com/docs
// ---------------------------------------------------------------------------
const GROQ_API_KEY = process.env.GROQ_API_KEY || null;

const openai = GROQ_API_KEY
  ? new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function callGroq(userMessage) {
  if (!openai) {
    console.warn('[ChatBackend] Groq API key not configured (GROQ_API_KEY)');
    return null;
  }
  try {
    const completion = await openai.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim();
    return reply || null;
  } catch (err) {
    console.error('[ChatBackend] Groq API error:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST /api/chat/message
// Every message goes directly to Groq AI for a response.
// No intent detection, no static replies, no HR mode — pure AI search.
// ---------------------------------------------------------------------------
router.post('/message', async (req, res) => {
  try {
    const message = (req.body && req.body.message) || '';
    if (!message.trim()) {
      return res.status(400).json({ success: false, message: 'Empty message' });
    }

    console.log('[ChatBackend] message=', message?.slice(0, 100));

    const reply = await callGroq(message);

    if (reply) {
      return res.json({ success: true, source: 'ai', reply });
    }

    return res.json({
      success: true,
      source: 'fallback',
      reply: "The assistant is currently unavailable. Please check the API configuration or try again in a moment.",
    });
  } catch (err) {
    console.error('[ChatBackend] Chat error:', err);
    return res.status(500).json({ success: false, message: 'Assistant error', error: err.message });
  }
});

module.exports = router;
