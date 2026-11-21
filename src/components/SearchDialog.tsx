import { useEffect, useMemo, useState } from 'react'
import { Search, Star, CornerDownLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { searchIndex } from '@/lib/data'
import { href } from '@/lib/router'
import { cn } from '@/lib/utils'

// Ctrl/Cmd + K: search every question on every page.
export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)

  useEffect(() => { if (open) { setQ(''); setSel(0) } }, [open])

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const items = searchIndex()
    if (!words.length) return items.filter((i) => i.star).slice(0, 12)
    return items
      .map((i) => {
        const t = i.title.toLowerCase()
        const score = words.reduce((s, w) => s + (t.includes(w) ? 3 : i.text.includes(w) ? 1 : -99), 0)
        return { i, score }
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((r) => r.i)
  }, [q])

  const go = (idx: number) => {
    const r = results[idx]
    if (!r) return
    location.hash = href(r.page, r.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search questions</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
              if (e.key === 'Enter') go(sel)
            }}
            placeholder="Search all questions… e.g. closure, useEffect, JOIN"
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-2">
          {!q && <li className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">Must-ask questions</li>}
          {results.map((r, i) => (
            <li key={r.page + r.id}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => go(i)}
                className={cn('flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm', i === sel && 'bg-accent text-accent-foreground')}
              >
                {r.star ? <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" /> : <span className="size-3.5 shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.group === 'Most-asked (simple)' ? r.pageTitle : `${r.pageTitle} · deep dive`}</span>
                {i === sel && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
              </button>
            </li>
          ))}
          {q && !results.length && <li className="px-3 py-8 text-center text-sm text-muted-foreground">No questions found.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
