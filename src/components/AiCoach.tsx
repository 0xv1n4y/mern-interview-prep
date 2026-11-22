import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Send, Trash2, Bot, History, MessageCircleQuestion, GraduationCap, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Markdown } from '@/components/Markdown'
import { callAi, type ChatMsg } from '@/lib/ai'
import { MAX_SECONDS, startRecording, type Recording } from '@/lib/audio'
import { store } from '@/lib/store'

type Attempt = { when: string; score: string; answer: string }

export function AiCoach({ pageId, qid, question, reference, pageTitle }: { pageId: string; qid: string; question: string; reference: string; pageTitle: string }) {
  const histKey = `ip:ai:${pageId}:${qid}`
  const [mode, setMode] = useState<'evaluate' | 'doubt'>('evaluate')
  const [text, setText] = useState('')
  const [lang, setLang] = useState<'en' | 'te'>('en')
  const [mic, setMic] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [history, setHistory] = useState<Attempt[]>(() => store.json(histKey, [] as Attempt[]))
  const recRef = useRef<Recording | null>(null)
  const timerRef = useRef<number>(0)

  useEffect(() => () => { recRef.current?.cancel(); clearInterval(timerRef.current) }, [])

  // Record → Stop → Gemini transcribes (works in every browser, good with Telugu + English).
  const stopMic = async () => {
    const rec = recRef.current
    if (!rec) return
    recRef.current = null
    clearInterval(timerRef.current)
    setMic('transcribing'); setLevel(0); setStatus('Turning your speech into text…')
    try {
      const { base64, seconds: secs } = await rec.stop()
      if (secs < 1) { setStatus('That was too short. Press Speak and talk for a few seconds.'); return }
      const spoken = (await callAi({ mode: 'transcribe', audio: base64, lang })).trim()
      setText((t) => (t.trim() ? t.replace(/\s*$/, ' ') : '') + spoken)
      setStatus('Done. Check the text, edit if needed, then press Send.')
    } catch (err) {
      setStatus((err as Error).message)
    } finally { setMic('idle') }
  }

  const startMic = async () => {
    setStatus('')
    try {
      recRef.current = await startRecording(setLevel)
    } catch (err) { setStatus((err as Error).message); return }
    setMic('recording'); setSeconds(0)
    setStatus('Recording… speak your answer, then press Stop.')
    const t0 = Date.now()
    timerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000)
      setSeconds(s)
      if (s >= MAX_SECONDS) stopMic()   // auto-stop at the limit
    }, 250)
  }

  const cancelMic = () => { recRef.current?.cancel(); recRef.current = null; clearInterval(timerRef.current); setMic('idle'); setLevel(0); setStatus('Recording discarded.') }
  const clock = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`

  const send = async () => {
    const t = text.trim()
    if (!t) { setStatus(mode === 'evaluate' ? 'Type or speak your answer first.' : 'Type your doubt first.'); return }
    if (mic !== 'idle') { setStatus('Stop the recording first.'); return }
    setBusy(true); setStatus(mode === 'evaluate' ? 'Checking your answer…' : 'Thinking…')
    try {
      if (mode === 'evaluate') {
        const reply = await callAi({ mode: 'evaluate', question, reference, text: t, page: pageTitle })
        setFeedback(reply)
        const score = (reply.match(/(\d{1,2})\s*\/\s*10/) || [])[0] || ''
        const next = [{ when: new Date().toLocaleString(), score, answer: t.slice(0, 600) }, ...history].slice(0, 5)
        setHistory(next); store.set(histKey, JSON.stringify(next))
        setStatus('Here is your feedback. Try again to improve your score.')
      } else {
        const prior = chat.slice(-6)
        setChat((c) => [...c, { role: 'user', text: t }]); setText('')
        const reply = await callAi({ mode: 'doubt', question, reference, text: t, history: prior, page: pageTitle })
        setChat((c) => [...c, { role: 'model', text: reply }])
        setStatus('Ask a follow-up if anything is still unclear.')
      }
    } catch (err) {
      if (mode === 'doubt') { setChat((c) => c.slice(0, -1)); setText(t) }
      setStatus((err as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <ToggleGroup type="single" value={mode} onValueChange={(v) => { if (v) { setMode(v as typeof mode); setStatus(''); setFeedback('') } }} variant="outline" size="sm">
        <ToggleGroupItem value="evaluate" className="px-3"><GraduationCap /> Answer like an interview</ToggleGroupItem>
        <ToggleGroupItem value="doubt" className="px-3"><MessageCircleQuestion /> Ask a doubt</ToggleGroupItem>
      </ToggleGroup>

      {mode === 'doubt' && chat.length > 0 && (
        <div className="space-y-3">
          {chat.map((m, i) => m.role === 'user'
            ? <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</div>
            : <div key={i} className="max-w-[92%] rounded-2xl rounded-bl-sm border bg-card px-4 py-3"><Markdown md={m.text} className="prose-compact" /></div>)}
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={mode === 'evaluate'
            ? 'Type your answer, or press Speak and answer out loud (English or Telugu)…'
            : 'What is your doubt about this question? (English or Telugu)'}
          className="min-h-28 text-[15px] leading-relaxed"
          disabled={mic === 'transcribing'}
        />
        <div className="flex flex-wrap items-center gap-2">
          {mic === 'idle' && <Button variant="outline" size="sm" onClick={startMic}><Mic /> Speak</Button>}
          {mic === 'recording' && (
            <>
              <Button variant="destructive" size="sm" onClick={stopMic}><Square /> Stop</Button>
              <Button variant="ghost" size="icon-sm" onClick={cancelMic} aria-label="Discard recording"><X /></Button>
              <span className="flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
                <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500 opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-rose-500" /></span>
                {clock(seconds)} / {clock(MAX_SECONDS)}
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-emerald-500 transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} /></span>
              </span>
            </>
          )}
          {mic === 'transcribing' && <Button variant="outline" size="sm" disabled><Loader2 className="animate-spin" /> Transcribing…</Button>}
          <Select value={lang} onValueChange={(v) => setLang(v as 'en' | 'te')} disabled={mic !== 'idle'}>
            <SelectTrigger size="sm" className="w-32" aria-label="Speaking language"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="te">తెలుగు Telugu</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => { setText(''); setFeedback(''); setStatus(''); if (mode === 'doubt') setChat([]) }}><Trash2 /> Clear</Button>
          <Button size="sm" onClick={send} disabled={busy}><Send /> {busy ? 'Sending…' : 'Send'}</Button>
        </div>
        {status && <p className="text-sm text-muted-foreground" aria-live="polite">{status}</p>}
      </div>

      {mode === 'evaluate' && feedback && (
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Bot className="size-4" /> AI feedback</div>
          <Markdown md={feedback} className="prose-compact" />
        </div>
      )}

      {mode === 'evaluate' && history.length > 0 && (
        <details className="group rounded-lg border px-4 py-2 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 text-muted-foreground"><History className="size-4" /> Previous attempts ({history.length})</summary>
          <ul className="mt-2 divide-y">
            {history.map((a, i) => (
              <li key={i} className="py-2">
                <p className="text-xs text-muted-foreground">{a.when}{a.score && ` · ${a.score}`}</p>
                <p className="mt-1 whitespace-pre-wrap">{a.answer}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
