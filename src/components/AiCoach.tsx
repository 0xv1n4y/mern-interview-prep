import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Send, Trash2, Bot, History, MessageCircleQuestion, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Markdown } from '@/components/Markdown'
import { callAi, createRecognizer, type ChatMsg } from '@/lib/ai'
import { store } from '@/lib/store'

type Attempt = { when: string; score: string; answer: string }

export function AiCoach({ pageId, qid, question, reference, pageTitle }: { pageId: string; qid: string; question: string; reference: string; pageTitle: string }) {
  const histKey = `ip:ai:${pageId}:${qid}`
  const [mode, setMode] = useState<'evaluate' | 'doubt'>('evaluate')
  const [text, setText] = useState('')
  const [lang, setLang] = useState('en-IN')
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [history, setHistory] = useState<Attempt[]>(() => store.json(histKey, [] as Attempt[]))
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null)

  useEffect(() => () => recRef.current?.stop(), [])

  const toggleMic = () => {
    if (recRef.current) { recRef.current.stop(); return }
    const rec = createRecognizer()
    if (!rec) { setStatus('Voice input works in Chrome or Edge. In this browser, please type your answer.'); return }
    rec.lang = lang; rec.continuous = true; rec.interimResults = true
    const before = text ? text.replace(/\s*$/, ' ') : ''
    let finalText = ''
    rec.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t + ' '; else live += t
      }
      setText(before + finalText); setInterim(live)
    }
    rec.onerror = (e) => setStatus(e.error === 'not-allowed' ? 'Microphone is blocked. Allow mic access from the address bar.' : 'Mic error: ' + e.error)
    rec.onend = () => { recRef.current = null; setListening(false); setInterim(''); setStatus((s) => (s.startsWith('Listening') ? 'Done. Edit the text if needed, then press Send.' : s)) }
    rec.start(); recRef.current = rec; setListening(true); setStatus('Listening… press Stop when you finish.')
  }

  const send = async () => {
    const t = text.trim()
    if (!t) { setStatus(mode === 'evaluate' ? 'Type or speak your answer first.' : 'Type your doubt first.'); return }
    recRef.current?.stop()
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
          value={text + (interim ? ' ' + interim : '')}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={mode === 'evaluate'
            ? 'Type your answer, or press Speak and answer out loud (English or Telugu)…'
            : 'What is your doubt about this question? (English or Telugu)'}
          className="min-h-28 text-[15px] leading-relaxed"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={listening ? 'destructive' : 'outline'} size="sm" onClick={toggleMic}>
            {listening ? <><Square /> Stop</> : <><Mic /> Speak</>}
          </Button>
          <Select value={lang} onValueChange={setLang} disabled={listening}>
            <SelectTrigger size="sm" className="w-32" aria-label="Speaking language"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en-IN">English</SelectItem>
              <SelectItem value="te-IN">తెలుగు Telugu</SelectItem>
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
