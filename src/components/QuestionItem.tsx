import { useState } from 'react'
import { Check, Star, BookOpenText, Mic2, Dumbbell, Eye } from 'lucide-react'
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/Callout'
import { Markdown } from '@/components/Markdown'
import { CodePractice } from '@/components/CodePractice'
import { AiCoach } from '@/components/AiCoach'
import type { Block, Question } from '@/lib/parse'
import { doneKey, useStored } from '@/lib/store'
import { cn } from '@/lib/utils'

const LEVEL: Record<string, { label: string; dot: string }> = {
  basic: { label: 'Basic', dot: 'bg-emerald-500' },
  mid: { label: 'Intermediate', dot: 'bg-amber-500' },
  adv: { label: 'Advanced', dot: 'bg-rose-500' },
}
const INTERVIEW = new Set(['say', 'warn', 'tip', 'hint2', 'proj'])

function BlockView({ b, qid, i }: { b: Block; qid: string; i: number }) {
  if (b.kind === 'md') return <Markdown md={b.md} />
  if (b.kind === 'box') return <Callout type={b.type} md={b.md} />
  return <CodePractice id={`${qid}-${i}`} starter={b.starter} tests={b.tests} hints={b.hints} solution={b.solution} />
}

export function QuestionItem({ q, n, pageId, pageTitle }: { q: Question; n: number; pageId: string; pageTitle: string }) {
  const [doneVal, setDone] = useStored(doneKey(pageId, q.id))
  const done = doneVal === '1'
  const [tab, setTab] = useState('learn')
  const [peek, setPeek] = useState(false)

  const quick = q.blocks.find((b) => b.kind === 'box' && b.type === 'quick')
  const learn = q.blocks.filter((b) => b !== quick && !(b.kind === 'box' && INTERVIEW.has(b.type)) && b.kind !== 'practice')
  const interview = q.blocks.filter((b) => b.kind === 'box' && INTERVIEW.has(b.type))
  const practice = q.blocks.filter((b) => b.kind === 'practice')
  const hideQuick = tab === 'practice' && !peek
  const level = LEVEL[q.level]

  return (
    <AccordionItem value={q.id} id={q.id} className={cn('scroll-mt-24 rounded-xl border border-border/70 bg-card px-0 transition-colors last:border-b', done && 'bg-muted/30')}>
      <AccordionTrigger className="items-center gap-3 px-4 py-3.5 hover:no-underline sm:px-5">
        <span className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-medium tabular-nums text-muted-foreground', done && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')}>
            {done ? <Check className="size-3.5" /> : n}
          </span>
          <span className={cn('min-w-0 text-[15.5px] font-medium leading-snug', done && 'text-muted-foreground')}>
            <Markdown md={q.title} className="prose-inline" />
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          {q.star && <Star className="size-4 fill-amber-400 text-amber-400" aria-label="Must-ask" />}
          {level && <span className={cn('size-2 rounded-full', level.dot)} title={level.label} aria-label={level.label} />}
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 px-4 pb-5 sm:px-5">
        {quick && quick.kind === 'box' && (hideQuick
          ? <button onClick={() => setPeek(true)} className="flex w-full items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50"><Eye className="size-4" /> Short answer hidden while you practise. Click to show.</button>
          : <Callout type="quick" md={quick.md} className="text-[15.5px]" />)}

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setPeek(false) }}>
          <TabsList className="w-full sm:w-auto">
            {learn.length > 0 && <TabsTrigger value="learn"><BookOpenText /> Learn</TabsTrigger>}
            {interview.length > 0 && <TabsTrigger value="interview"><Mic2 /> Interview</TabsTrigger>}
            <TabsTrigger value="practice"><Dumbbell /> Practice</TabsTrigger>
          </TabsList>
          {learn.length > 0 && <TabsContent value="learn" className="mt-4 space-y-4">{learn.map((b, i) => <BlockView key={i} b={b} qid={q.id} i={i} />)}</TabsContent>}
          {interview.length > 0 && <TabsContent value="interview" className="mt-4 space-y-4">{interview.map((b, i) => <BlockView key={i} b={b} qid={q.id} i={i} />)}</TabsContent>}
          <TabsContent value="practice" className="mt-4 space-y-6">
            {practice.map((b, i) => (
              <div key={i}>
                <p className="mb-2 text-sm font-medium">Coding exercise</p>
                <BlockView b={b} qid={q.id} i={i} />
              </div>
            ))}
            <AiCoach pageId={pageId} qid={q.id} question={q.title.replace(/`/g, '')} reference={q.text.slice(0, 7000)} pageTitle={pageTitle} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end border-t border-border/60 pt-3">
          <Button variant={done ? 'secondary' : 'outline'} size="sm" onClick={() => setDone(done ? '0' : '1')}>
            <Check /> {done ? 'Done' : 'Mark as done'}
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
