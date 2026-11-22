import { useState } from 'react'
import { Play, RotateCcw, Lightbulb, CheckCircle2, Sparkles, Loader2, Database, Eye, EyeOff, Terminal, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeEditor } from '@/components/CodeEditor'
import { Markdown } from '@/components/Markdown'
import { runJs, type JsRun } from '@/lib/run-js'
import { runSql, sqlReady, SAMPLE_TABLES, type SqlRun } from '@/lib/run-sql'
import { callAi } from '@/lib/ai'
import { store } from '@/lib/store'
import { cn } from '@/lib/utils'

export type PlaygroundProps = {
  id: string                 // storage key (unique per question + exercise)
  language: 'js' | 'sql'
  starter: string
  tests?: string             // JS only: check(actual, expected, label) calls
  hints?: string[]
  solution?: string
  question: string
  intro?: string             // e.g. "Predict the output first, then run it."
}

const cell = (v: unknown) => (v === null || v === undefined ? 'NULL' : v instanceof Date ? v.toISOString().replace('T', ' ').slice(0, 19) : typeof v === 'object' ? JSON.stringify(v) : String(v))

export default function Playground({ id, language, starter, tests, hints = [], solution, question, intro }: PlaygroundProps) {
  const key = `ip2:code:${id}`
  const [code, setCode] = useState(() => store.get(key) ?? starter)
  const [busy, setBusy] = useState(false)
  const [js, setJs] = useState<JsRun | null>(null)
  const [sqlRes, setSqlRes] = useState<SqlRun | null>(null)
  const [shown, setShown] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [showTables, setShowTables] = useState(false)
  const [review, setReview] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewErr, setReviewErr] = useState('')

  const save = (v: string) => { setCode(v); store.set(key, v) }

  const run = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (language === 'js') setJs(await runJs(code, tests))
      else setSqlRes(await runSql(code))
    } finally { setBusy(false) }
  }

  const outputText = () => {
    if (language === 'js' && js) {
      return [js.timedOut ? 'TIMED OUT' : '', ...js.logs.map((l) => l.text), js.error || '',
        ...js.tests.map((t, i) => `Test ${i + 1}: ${t.ok ? 'passed' : `failed (expected ${t.expected}, got ${t.actual})`}`)].filter(Boolean).join('\n')
    }
    if (language === 'sql' && sqlRes) {
      if (sqlRes.error) return 'ERROR: ' + sqlRes.error
      const last = [...sqlRes.results].reverse().find((r) => r.fields.length)
      return last ? `${last.rows.length} rows; first rows: ${JSON.stringify(last.rows.slice(0, 5))}` : 'No rows returned.'
    }
    return 'Not run yet.'
  }

  const askReview = async () => {
    setReviewBusy(true); setReviewErr('')
    try {
      setReview(await callAi({ mode: 'review', question, language, code, output: outputText().slice(0, 3000) }))
    } catch (e) { setReviewErr((e as Error).message) } finally { setReviewBusy(false) }
  }

  const passed = js?.tests.filter((t) => t.ok).length ?? 0
  const firstSqlLoad = language === 'sql' && !sqlReady()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          {language === 'sql' ? <Database className="size-4" /> : <Terminal className="size-4" />}
          {language === 'sql' ? 'SQL playground (PostgreSQL)' : tests ? 'Coding exercise' : 'JavaScript playground'}
        </p>
        <span className="text-xs text-muted-foreground">Ctrl + Enter to run</span>
      </div>
      {intro && <p className="text-sm text-muted-foreground">{intro}</p>}

      <CodeEditor value={code} onChange={save} language={language} onRun={run} />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={run} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Play />} {busy ? (firstSqlLoad ? 'Starting database…' : 'Running…') : tests ? 'Run tests' : 'Run'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { save(starter); setJs(null); setSqlRes(null); setReview('') }}><RotateCcw /> Reset</Button>
        {language === 'sql' && (
          <Button size="sm" variant="ghost" onClick={() => setShowTables((v) => !v)}>
            {showTables ? <EyeOff /> : <Eye />} Sample tables
          </Button>
        )}
        {shown < hints.length && <Button size="sm" variant="ghost" onClick={() => setShown((n) => n + 1)}><Lightbulb /> Hint {shown + 1}</Button>}
        {solution && <Button size="sm" variant="ghost" onClick={() => setShowSolution((v) => !v)}><CheckCircle2 /> {showSolution ? 'Hide' : 'Show'} solution</Button>}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={askReview} disabled={reviewBusy}>
          {reviewBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} Review my code with AI
        </Button>
      </div>

      {showTables && (
        <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-sm">
          <p className="mb-2 text-muted-foreground">Every run starts from this sample data, so you can INSERT, UPDATE or DROP freely.</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {SAMPLE_TABLES.map((t) => <li key={t.name}><code className="font-mono text-[12.5px] font-semibold">{t.name}</code> <span className="text-muted-foreground">({t.columns})</span></li>)}
          </ul>
        </div>
      )}

      {/* JavaScript output */}
      {language === 'js' && js && (
        <div className="rounded-lg border border-border/70 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-200">
          <div className="mb-1.5 flex items-center justify-between font-sans text-xs text-zinc-400">
            <span>Output</span><span>{js.ms} ms</span>
          </div>
          {js.timedOut && <p className="text-rose-400">Stopped after 4 seconds. Check for an infinite loop.</p>}
          {!js.timedOut && js.logs.length === 0 && !js.error && js.tests.length === 0 && <p className="text-zinc-500">(no console output: add console.log(...) to see values)</p>}
          {js.logs.map((l, i) => (
            <pre key={i} className={cn('whitespace-pre-wrap', l.kind === 'error' && 'text-rose-400', l.kind === 'warn' && 'text-amber-300')}>{l.text}</pre>
          ))}
          {js.error && <pre className="whitespace-pre-wrap text-rose-400">{js.error}</pre>}
          {js.tests.length > 0 && (
            <div className="mt-2 border-t border-white/10 pt-2">
              {js.tests.map((t, i) => (
                <p key={i} className={t.ok ? 'text-emerald-400' : 'text-rose-400'}>
                  {t.ok ? '✔' : '✘'} Test {i + 1} {t.label}
                  {!t.ok && <span className="block pl-4 text-zinc-400">expected {t.expected} · got {t.actual}</span>}
                </p>
              ))}
              <p className="mt-1 flex items-center gap-1.5 font-sans font-medium text-zinc-100">
                <ListChecks className="size-4" /> {passed === js.tests.length ? `All ${passed} tests passed! 🎉` : `${passed}/${js.tests.length} tests passed`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* SQL output */}
      {language === 'sql' && sqlRes && (
        <div className="space-y-2">
          {sqlRes.error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-sm dark:border-rose-500/20 dark:bg-rose-500/[0.06]">
              <p className="font-mono text-[13px] text-rose-700 dark:text-rose-300">ERROR: {sqlRes.error}</p>
              {sqlRes.hint && <p className="mt-1 text-muted-foreground">{sqlRes.hint}</p>}
            </div>
          )}
          {sqlRes.results.map((r, i) => r.fields.length ? (
            <div key={i} className="overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/60"><tr>{r.fields.map((f, j) => <th key={j} className="px-3 py-2 text-left font-medium">{f}</th>)}</tr></thead>
                <tbody>
                  {r.rows.slice(0, 200).map((row, k) => (
                    <tr key={k} className="border-t border-border/60">{r.fields.map((f, j) => <td key={j} className="whitespace-nowrap px-3 py-1.5 font-mono">{cell(row[f])}</td>)}</tr>
                  ))}
                  {r.rows.length === 0 && <tr><td colSpan={r.fields.length} className="px-3 py-3 text-center text-muted-foreground">0 rows</td></tr>}
                </tbody>
              </table>
              <p className="border-t border-border/60 px-3 py-1.5 text-xs text-muted-foreground">{r.rows.length} row{r.rows.length === 1 ? '' : 's'}{r.rows.length > 200 ? ' (showing 200)' : ''}</p>
            </div>
          ) : null)}
          {!sqlRes.error && (
            <p className="text-xs text-muted-foreground">
              ✓ Ran in {sqlRes.ms} ms{sqlRes.results.some((r) => !r.fields.length && r.affected) ? ` · ${sqlRes.results.reduce((n, r) => n + (r.fields.length ? 0 : r.affected || 0), 0)} row(s) changed` : ''}
              {sqlRes.results.every((r) => !r.fields.length) && ' · add a SELECT to see rows'}
            </p>
          )}
        </div>
      )}

      {hints.slice(0, shown).map((h, i) => (
        <div key={i} className="rounded-lg border border-amber-200/70 bg-amber-50/70 px-4 py-3 dark:border-amber-500/15 dark:bg-amber-500/[0.06]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Hint {i + 1}</p>
          <Markdown md={h} className="prose-compact" />
        </div>
      ))}
      {showSolution && solution && <div className="rounded-lg border border-border/70 px-4 py-3"><Markdown md={solution} className="prose-compact" /></div>}

      {reviewErr && <p className="text-sm text-rose-600 dark:text-rose-400">{reviewErr}</p>}
      {review && (
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4" /> AI code review</div>
          <Markdown md={review} className="prose-compact" />
        </div>
      )}
    </div>
  )
}
