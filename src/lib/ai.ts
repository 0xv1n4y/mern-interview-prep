// Talks to our backend (/api/ai). The Gemini key never reaches the browser.
import { store } from '@/lib/store'

export const aiBase = () => (store.get('ip:aiBase') || '').replace(/\/$/, '')
export const aiPass = () => store.get('ip:aiPass') || ''
export const openAiSettings = (message = '') => window.dispatchEvent(new CustomEvent('open-ai-settings', { detail: message }))

export type ChatMsg = { role: 'user' | 'model'; text: string }
export type AiRequest =
  | { mode: 'ping' }
  | { mode: 'transcribe'; audio: string; lang: 'en' | 'te' }
  | { mode: 'review'; question: string; language: 'js' | 'sql'; code: string; output: string }
  | { mode: 'evaluate'; question: string; reference: string; text: string; page: string }
  | { mode: 'doubt'; question: string; reference: string; text: string; history: ChatMsg[]; page: string }

export async function callAi(payload: AiRequest, base = aiBase(), pass = aiPass()): Promise<string> {
  if (!pass) { openAiSettings('Enter your passcode first.'); throw new Error('Passcode needed: open AI settings (robot icon, top right).') }
  let res: Response
  try {
    res = await fetch(base + '/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-app-passcode': pass },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error("Can't reach the AI server. Check your internet or the server address in AI settings.")
  }
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string }
  if (!res.ok) throw new Error(data.error || `AI server error (${res.status})`)
  return data.text || ''
}
