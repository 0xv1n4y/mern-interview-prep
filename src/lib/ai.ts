// Talks to our backend (/api/ai). The Gemini key never reaches the browser.
import { store } from '@/lib/store'

export const aiBase = () => (store.get('ip:aiBase') || '').replace(/\/$/, '')
export const aiPass = () => store.get('ip:aiPass') || ''
export const openAiSettings = (message = '') => window.dispatchEvent(new CustomEvent('open-ai-settings', { detail: message }))

export type ChatMsg = { role: 'user' | 'model'; text: string }
export type AiRequest =
  | { mode: 'ping' }
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

// Browser speech-to-text (Chrome / Edge). Typed loosely because the API isn't in the TS DOM lib.
type SpeechRec = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null }
export function createRecognizer(): SpeechRec | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
  const Rec = w.SpeechRecognition || w.webkitSpeechRecognition
  return Rec ? new Rec() : null
}
