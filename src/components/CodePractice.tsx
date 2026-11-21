import { useState } from 'react'
import { Play, RotateCcw, Lightbulb, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/Markdown'
import { store } from '@/lib/store'

// Runs the learner's code + tests inside a Web Worker with a 3-second limit.
const WORKER_SRC = `
const logs = [];
console.log = (...a) => logs.push(a.map(x => typeof x === "string" ? x : JSON.stringify(x)).join(" "));
const results = [];
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function check(actual, expected, label) { results.push({ ok: same(actual, expected), label: label || "", actual: JSON.stringify(actual), expected: JSON.stringify(expected) }); }
onmessage = async (e) => {
  try { await (new Function("check", "return (async () => {" + e.data + "})()"))(check); postMessage({ results, logs }); }
  catch (err) { postMessage({ error: String(err), results, logs }); }
};`

type Result = { ok: boolean; label: string; actual: string; expected: string }
type Run = { error?: string; results: Result[]; logs: string[]; timeout?: boolean }

export function CodePractice({ id, starter, tests, hints, solution }: { id: string; starter: string; tests: string; hints: string[]; solution: string }) {
  const key = `ip2:code:${id}`
  const [code, setCode] = useState(() => store.get(key) ?? starter)
  const [run, setRun] = useState<Run | null>(null)
  const [busy, setBusy] = useState(false)
  const [shown, setShown] = useState(0)
  const [showSolution, setShowSolution] = useState(false)

  const save = (v: string) => { setCode(v); store.set(key, v) }

  const runTests = () => {
    setBusy(true)
    let worker: Worker
    try { worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }))) }
    catch { setRun({ error: 'This browser blocked the code runner. Try Chrome or Edge.', results: [], logs: [] }); setBusy(false); return }
    const timer = setTimeout(() => { worker.terminate(); setRun({ results: [], logs: [], timeout: true }); setBusy(false) }, 3000)
    worker.onmessage = ({ data }) => { clearTimeout(timer); worker.terminate(); setRun(data); setBusy(false) }
    worker.postMessage(code + '\n;\n' + tests)
  }

  const passed = run?.results.filter((r) => r.ok).length ?? 0

  return (
    <div className="space-y-3">
      <textarea
        value={code}
        onChange={(e) => save(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget; const s = t.selectionStart; t.setRangeText('  ', s, t.selectionEnd, 'end'); save(t.value) }
        }}
        spellCheck={false}
        aria-label="Your code"
        className="min-h-48 w-full resize-y rounded-lg border bg-zinc-950 p-3 font-mono text-[13.5px] leading-relaxed text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={runTests} disabled={busy}><Play /> {busy ? 'Running…' : 'Run tests'}</Button>
        <Button variant="outline" onClick={() => { save(starter); setRun(null) }}><RotateCcw /> Reset</Button>
        {shown < hints.length && <Button variant="ghost" onClick={() => setShown((n) => n + 1)}><Lightbulb /> Hint {shown + 1}</Button>}
        {solution && <Button variant="ghost" onClick={() => setShowSolution((v) => !v)}><CheckCircle2 /> {showSolution ? 'Hide' : 'Show'} solution</Button>}
      </div>
      {run && (
        <div className="rounded-lg border bg-muted/40 p-3 font-mono text-[13px] leading-relaxed">
          {run.timeout && <p className="text-rose-600 dark:text-rose-400">Stopped after 3 seconds. Check for an infinite loop.</p>}
          {run.logs.length > 0 && <pre className="mb-2 whitespace-pre-wrap text-muted-foreground">{run.logs.join('\n')}</pre>}
          {run.error && <p className="text-rose-600 dark:text-rose-400">Error: {run.error}</p>}
          {run.results.map((r, i) => (
            <p key={i} className={r.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
              {r.ok ? '✔' : '✘'} Test {i + 1} {r.label}
              {!r.ok && <span className="block pl-4 text-muted-foreground">expected {r.expected} · got {r.actual}</span>}
            </p>
          ))}
          {run.results.length > 0 && (
            <p className="mt-2 font-sans font-medium">{passed === run.results.length ? `🎉 All ${passed} tests passed!` : `${passed}/${run.results.length} passed.`}</p>
          )}
        </div>
      )}
      {hints.slice(0, shown).map((h, i) => (
        <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Hint {i + 1}</p>
          <Markdown md={h} className="prose-compact" />
        </div>
      ))}
      {showSolution && <div className="rounded-lg border px-4 py-3"><Markdown md={solution} className="prose-compact" /></div>}
    </div>
  )
}
