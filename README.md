# MERN + TypeScript Interview Prep

Interview notes for a full-stack (React, Node.js, Express, MongoDB, PostgreSQL, TypeScript) developer, with quick answers, point-by-point interview answers, diagrams and runnable practice problems.

Plain HTML + JavaScript, no build step. Markdown is rendered in the browser with marked and Mermaid.

## AI practice (Gemini)

Every question has a **Practice with AI** panel: answer by typing or by voice (English / Telugu) and get a summary, score and better answer, or ask a doubt. The browser calls `/api/ai` (a Vercel serverless function in `api/ai.js`), which holds the Gemini key. The key is never in this repository.

### Deploy on Vercel

1. Import this repository in Vercel (Framework preset: **Other**, no build command).
2. Add environment variables: `GEMINI_API_KEY` (from https://aistudio.google.com/apikey) and `APP_PASSCODE` (a password you choose). Optional: `GEMINI_MODEL`.
3. Deploy, open the site, click **🤖 AI** and enter the same passcode.

### Run locally

Copy `.env.example` to `.env.local`, fill it in, then `node dev-server.js` and open http://localhost:5173 (set `MOCK_AI=1` to test without Gemini).
