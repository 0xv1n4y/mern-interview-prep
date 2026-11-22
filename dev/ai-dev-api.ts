// Vite dev-server plugin: serves POST /api/ai locally using the same handler Vercel runs.
// Values come from .env.local (GEMINI_API_KEY, APP_PASSCODE, GEMINI_MODEL, MOCK_AI).
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'

const MOCK_EVAL = (text: string) => `### 📝 Summary of your answer
- (mock) You said: "${text.slice(0, 80)}…"

### ⭐ Score: 7/10
Good start; a few points are missing.

### ✅ What you got right
- You explained the main idea

### ❌ What's missing or wrong
- Add a real example from your project

### 🎤 Better answer (say it like this)
- Point one
- Point two

### 💡 One tip
Keep it under 60 seconds.`

export function aiDevApi(): Plugin {
  return {
    name: 'ai-dev-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      for (const k of ['GEMINI_API_KEY', 'APP_PASSCODE', 'GEMINI_MODEL']) if (env[k] && !process.env[k]) process.env[k] = env[k]
      const mock = env.MOCK_AI === '1' || !env.GEMINI_API_KEY
      server.config.logger.info(`  AI api: ${mock ? 'MOCK mode (no Gemini calls). Fill .env.local and set MOCK_AI=0 for real answers.' : 'Gemini ' + (env.GEMINI_MODEL || 'gemini-2.5-flash')}`)

      server.middlewares.use('/api/ai', async (req, res) => {
        if (mock) {
          let raw = ''
          for await (const c of req) raw += c
          const body = JSON.parse(raw || '{}') as { mode?: string; text?: string }
          const text = body.mode === 'ping' ? 'Mock AI server ready (no Gemini calls).'
            : body.mode === 'transcribe' ? '(mock transcript) A closure is a function that remembers the variables from where it was created.'
            : body.mode === 'evaluate' ? MOCK_EVAL(String(body.text || ''))
              : `(mock) A simple answer to: **"${String(body.text || '').slice(0, 60)}"**\n\n- One-line answer\n- Example: \`const x = 1;\``
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ text }))
          return
        }
        const mod = await server.ssrLoadModule('/api/ai.js')
        await mod.default(req, res)
      })
    },
  }
}
