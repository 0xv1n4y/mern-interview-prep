import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Star, ListChecks, ChevronsUpDown } from 'lucide-react'
import { Accordion } from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/Markdown'
import { Callout } from '@/components/Callout'
import { QuestionItem } from '@/components/QuestionItem'
import { getPage } from '@/lib/data'
import type { Block } from '@/lib/parse'
import { doneKey, store, useStoreVersion } from '@/lib/store'
import type { PageInfo } from '@/pages'

function Blocks({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((b, i) => b.kind === 'md' ? <Markdown key={i} md={b.md} /> : b.kind === 'box' ? <Callout key={i} type={b.type} md={b.md} /> : null)}</>
}

export function TopicPage({ info, group, anchor }: { info: PageInfo; group: string; anchor: string }) {
  const page = getPage(info.slug)!
  useStoreVersion()
  const all = page.sections.flatMap((s) => s.questions)
  const hasQuestions = all.length > 0
  const done = all.filter((q) => store.get(doneKey(info.slug, q.id)) === '1').length
  const stars = all.filter((q) => q.star).length

  const [filter, setFilter] = useState<'all' | 'star' | 'todo'>('all')
  const [level, setLevel] = useState('any')
  const [open, setOpen] = useState<string[]>([])

  // Reset when switching pages; open + scroll to a linked question or section.
  useEffect(() => { setFilter('all'); setLevel('any'); setOpen([]) }, [info.slug])
  useEffect(() => {
    if (!anchor) { window.scrollTo({ top: 0 }); return }
    if (all.some((q) => q.id === anchor)) setOpen((o) => (o.includes(anchor) ? o : [...o, anchor]))
    const t = setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ block: 'start' }), 60)
    return () => clearTimeout(t)
  }, [info.slug, anchor]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => (q: (typeof all)[number]) =>
    (filter === 'all' || (filter === 'star' ? q.star : store.get(doneKey(info.slug, q.id)) !== '1'))
    && (level === 'any' || q.level === level), [filter, level, info.slug])

  let n = 0
  const numbers = new Map(all.map((q) => [q.id, ++n]))
  const intro = page.intro

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6 lg:pt-10">
      <p className="mb-2 text-sm font-medium text-muted-foreground">{group}</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{page.title || info.title}</h1>
      {intro && <Markdown md={intro} className="mt-3 text-[17px] text-muted-foreground" />}

      {hasQuestions && (
        <div className="mt-6 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground"><span className="font-medium text-foreground">{all.length}</span> questions{stars > 0 && <> · <Star className="inline size-3.5 -translate-y-px fill-amber-400 text-amber-400" /> <span className="font-medium text-foreground">{stars}</span> must-ask</>}</span>
            <span className="tabular-nums text-muted-foreground">{done}/{all.length} done</span>
          </div>
          <Progress value={all.length ? (done / all.length) * 100 : 0} className="mt-3 h-1.5" />
        </div>
      )}

      {hasQuestions && (
        <div className="sticky top-14 z-10 -mx-4 mt-6 flex flex-wrap items-center gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as typeof filter)} variant="outline" size="sm">
            <ToggleGroupItem value="all" className="px-3">All</ToggleGroupItem>
            {stars > 0 && <ToggleGroupItem value="star" className="px-3"><Star className="fill-amber-400 text-amber-400" /> Must-ask</ToggleGroupItem>}
            <ToggleGroupItem value="todo" className="px-3"><ListChecks /> Not done</ToggleGroupItem>
          </ToggleGroup>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger size="sm" className="w-36" aria-label="Level"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All levels</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="mid">Intermediate</SelectItem>
              <SelectItem value="adv">Advanced</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => setOpen((o) => (o.length ? [] : all.filter(visible).map((q) => q.id)))}>
            <ChevronsUpDown /> {open.length ? 'Collapse all' : 'Expand all'}
          </Button>
        </div>
      )}

      <div className="mt-8 space-y-12">
        {page.sections.map((s) => {
          const qs = s.questions.filter(visible)
          if (!s.questions.length) {
            // Reference sections (key terms, revision sheet) stay folded on question pages to keep things tidy.
            return hasQuestions ? (
              <details key={s.id} id={s.id} className="group scroll-mt-28 rounded-xl border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-medium">
                  {s.title}<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-4 border-t px-5 py-4"><Blocks blocks={s.intro} /></div>
              </details>
            ) : (
              <section key={s.id} id={s.id} className="scroll-mt-24 space-y-4">
                {s.title && <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>}
                <Blocks blocks={s.intro} />
              </section>
            )
          }
          if (!qs.length) return null
          return (
            <section key={s.id} id={s.id} className="scroll-mt-28 space-y-4">
              {s.title && <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{s.title}</h2>}
              {s.intro.length > 0 && <Blocks blocks={s.intro} />}
              <Accordion type="multiple" value={open} onValueChange={setOpen} className="space-y-2.5">
                {qs.map((q) => <QuestionItem key={q.id} q={q} n={numbers.get(q.id)!} pageId={info.slug} pageTitle={info.title} />)}
              </Accordion>
            </section>
          )
        })}
        {hasQuestions && page.sections.every((s) => !s.questions.length || !s.questions.some(visible)) && (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No questions match this filter.</p>
        )}
      </div>
    </article>
  )
}
