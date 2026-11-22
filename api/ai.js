// POST /api/ai: the only place the Gemini API key is used. Runs as a Vercel serverless function
// (and locally through dev-server.js). The key and passcode come from environment variables:
//   GEMINI_API_KEY  - from Google AI Studio (required)
//   APP_PASSCODE    - a password you choose; the site sends it in the x-app-passcode header (required)
//   GEMINI_MODEL    - optional, defaults to gemini-2.5-flash
import crypto from 'node:crypto';

const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const LIMIT_PER_MIN = 20;
const hits = new Map();   // best-effort rate limit per IP (resets when the function restarts)

const SYSTEM = `You are a friendly senior full-stack (MERN) interviewer and mentor in India.
You help a candidate with 3 years of experience practise interview questions.
The candidate may write or speak in English, Telugu, or a mix of both (speech-to-text can contain small errors; understand the intended meaning).
Always reply in simple, clear English that a beginner can follow. Use short bullet points. Avoid jargon; if you must use a technical term, explain it in a few words.
Use the "reference notes" (the study material for this question) as the main source of truth, but correct them if they are wrong.
Never invent experience for the candidate.`;

function evaluatePrompt({ question, reference, text }) {
  return `Interview question: "${question}"

Reference notes for this question:
"""
${reference}
"""

The candidate's answer (typed or spoken):
"""
${text}
"""

Evaluate the answer like a real interviewer. Reply in Markdown with exactly these sections:

### 📝 Summary of your answer
2-3 bullet points summarising what the candidate said (in English, even if they answered in Telugu).

### ⭐ Score: X/10
One line on why this score (accuracy, completeness, clarity).

### ✅ What you got right
Bullet points.

### ❌ What's missing or wrong
Bullet points. Be specific and kind. Say "Nothing important" if the answer is complete.

### 🎤 Better answer (say it like this)
A point-wise interview answer of 4-6 bullets that the candidate can say out loud, building on their own words.

### 💡 One tip
One short tip for delivering this answer in an interview.

Keep the whole reply under 300 words.`;
}

function doubtPrompt({ question, reference, text }) {
  return `We are studying this interview question: "${question}"

Reference notes:
"""
${reference}
"""

The candidate's doubt: "${text}"

Answer the doubt simply, like a patient teacher:
- Start with a one-line direct answer.
- Give an everyday example or analogy if it helps.
- Add a very small code example only if it makes the idea clearer.
- End with one line on how to say this in an interview.
Use Markdown. Keep it under 220 words.`;
}

const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');

function passcodeOk(given) {
  const expected = process.env.APP_PASSCODE || '';
  if (!expected) return false;
  const a = Buffer.from(String(given || '')), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > LIMIT_PER_MIN;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 5_000_000) throw new Error('Request too large'); }
  return JSON.parse(raw || '{}');
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

async function askGemini(contents, { system = SYSTEM, temperature = 0.4, maxOutputTokens = 1200 } = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL())}:generateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature, maxOutputTokens },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 429) throw Object.assign(new Error('The free Gemini limit for now has been reached. Please try again in a few minutes (or tomorrow if the daily limit is used up).'), { status: 429 });
  if (!r.ok) throw Object.assign(new Error('Gemini error: ' + (data.error?.message || r.status)), { status: 502 });
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
  if (!text) throw Object.assign(new Error('Gemini returned an empty answer (it may have been blocked). Try rephrasing.'), { status: 502 });
  return text;
}

// Speech to text: the browser sends a short 16 kHz WAV recording (base64); Gemini writes down what was said.
const TRANSCRIBE_SYSTEM = `You are an accurate speech-to-text transcriber for an Indian software developer practising interview answers.
Write down exactly what the speaker says. Do not answer, summarise, translate or correct the content.
Keep technical words in English with their usual spelling (React, useEffect, Node.js, MongoDB, API, JWT, closure, Docker…).
If the speaker uses Telugu, write those parts in Telugu script. Mixed Telugu and English is normal: keep each part in its own language.
Add normal punctuation. Leave out filler sounds like "umm" and "uh". If there is no clear speech, reply with exactly: [no speech]`;

async function transcribe(body, res) {
  const audio = typeof body.audio === 'string' ? body.audio : '';
  if (!audio || audio.length > 4_000_000 || !/^[A-Za-z0-9+/=]+$/.test(audio.slice(0, 200))) return send(res, 400, { error: 'The recording is empty or too long (max about 90 seconds).' });
  const lang = body.lang === 'te' ? 'Mostly Telugu, with English technical words.' : 'Mostly English (Indian accent), possibly with some Telugu.';
  try {
    const text = await askGemini([{ role: 'user', parts: [
      { inlineData: { mimeType: 'audio/wav', data: audio } },
      { text: `Transcribe this recording. Expected language: ${lang} Return only the transcript.` },
    ] }], { system: TRANSCRIBE_SYSTEM, temperature: 0, maxOutputTokens: 1500 });
    if (/^\[no speech\]$/i.test(text.trim())) return send(res, 422, { error: "I couldn't hear any speech. Check your mic and speak a little louder." });
    return send(res, 200, { text });
  } catch (err) {
    return send(res, err.status || 500, { error: err.message || 'Transcription failed.' });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
  if (!process.env.GEMINI_API_KEY) return send(res, 500, { error: 'Server is missing GEMINI_API_KEY.' });
  if (!process.env.APP_PASSCODE) return send(res, 500, { error: 'Server is missing APP_PASSCODE.' });
  if (!passcodeOk(req.headers['x-app-passcode'])) return send(res, 401, { error: 'Wrong passcode. Open 🤖 AI settings and check it.' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim();
  if (rateLimited(ip)) return send(res, 429, { error: 'Too many requests. Wait a minute and try again.' });

  let body;
  try { body = await readBody(req); } catch { return send(res, 400, { error: 'Invalid request.' }); }

  const mode = body.mode;
  if (mode === 'ping') return send(res, 200, { text: `AI server ready (model: ${MODEL()}).` });
  if (mode === 'transcribe') return transcribe(body, res);
  if (mode !== 'evaluate' && mode !== 'doubt') return send(res, 400, { error: 'Unknown mode.' });

  const input = { question: clip(body.question, 400), reference: clip(body.reference, 7000), text: clip(body.text, 4000) };
  if (!input.text.trim()) return send(res, 400, { error: 'Please type or speak something first.' });

  const contents = [];
  if (mode === 'doubt' && Array.isArray(body.history)) {
    for (const m of body.history.slice(-6)) {
      if ((m?.role === 'user' || m?.role === 'model') && typeof m.text === 'string') contents.push({ role: m.role, parts: [{ text: clip(m.text, 3000) }] });
    }
  }
  contents.push({ role: 'user', parts: [{ text: mode === 'evaluate' ? evaluatePrompt(input) : doubtPrompt(input) }] });

  try {
    return send(res, 200, { text: await askGemini(contents) });
  } catch (err) {
    return send(res, err.status || 500, { error: err.message || 'Something went wrong.' });
  }
}
