// Local test server: serves the site and the /api/ai backend together.
// 1. Copy .env.example to .env.local and fill in your values.
// 2. node dev-server.js   → open http://localhost:5173
// Set MOCK_AI=1 in .env.local to test the screens without calling Gemini.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5173;

// Load .env.local (simple KEY=value lines) without extra packages.
for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { default: aiHandler } = await import('./api/ai.js');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

async function mockAi(req, res) {
  let raw = ''; for await (const c of req) raw += c;
  const body = JSON.parse(raw || '{}');
  const text = body.mode === 'ping' ? 'Mock AI server ready (no Gemini calls).'
    : body.mode === 'evaluate'
      ? `### 📝 Summary of your answer\n- (mock) You said: "${String(body.text).slice(0, 80)}…"\n\n### ⭐ Score: 7/10\nGood start; a few points missing.\n\n### ✅ What you got right\n- Explained the main idea\n\n### ❌ What's missing or wrong\n- Add a real example from your project\n\n### 🎤 Better answer (say it like this)\n- Point one\n- Point two\n\n### 💡 One tip\nKeep it under 60 seconds.`
      : `(mock) Here is a simple answer to your doubt: **"${String(body.text).slice(0, 60)}"**\n\n- One-line answer\n- Example: \`const x = 1;\``;
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ text }));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/ai') {
    if (process.env.MOCK_AI === '1') return mockAi(req, res);
    return aiHandler(req, res);
  }
  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (/[\\/]\.env/.test(file) || !fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Interview Prep running at http://localhost:${PORT}  (AI: ${process.env.MOCK_AI === '1' ? 'mock' : 'Gemini ' + (process.env.GEMINI_MODEL || 'gemini-2.5-flash')})`));
