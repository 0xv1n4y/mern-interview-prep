import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, BookOpen, Code2, FolderGit2, Lightbulb, MessageSquareQuote, Sparkles, Terminal, Zap, RefreshCw } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import { cn } from '@/lib/utils'

type Tone = { label: string; icon: LucideIcon; cls: string; iconCls: string }

// Calm, readable callouts: soft tint, thin border, one icon colour.
export const TONES: Record<string, Tone> = {
  quick: { label: 'Short answer', icon: Zap, cls: 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-500/[0.06] dark:border-emerald-500/20', iconCls: 'text-emerald-600 dark:text-emerald-400' },
  simple: { label: 'In simple words', icon: Sparkles, cls: 'bg-violet-50/70 border-violet-200 dark:bg-violet-500/[0.06] dark:border-violet-500/20', iconCls: 'text-violet-600 dark:text-violet-400' },
  say: { label: 'Say it like this', icon: MessageSquareQuote, cls: 'bg-sky-50/70 border-sky-200 dark:bg-sky-500/[0.06] dark:border-sky-500/20', iconCls: 'text-sky-600 dark:text-sky-400' },
  output: { label: 'Output and why', icon: Terminal, cls: 'bg-teal-50/70 border-teal-200 dark:bg-teal-500/[0.06] dark:border-teal-500/20', iconCls: 'text-teal-600 dark:text-teal-400' },
  warn: { label: 'Common mistake', icon: AlertTriangle, cls: 'bg-rose-50/70 border-rose-200 dark:bg-rose-500/[0.06] dark:border-rose-500/20', iconCls: 'text-rose-600 dark:text-rose-400' },
  tip: { label: 'Follow-ups they ask', icon: RefreshCw, cls: 'bg-amber-50/70 border-amber-200 dark:bg-amber-500/[0.06] dark:border-amber-500/20', iconCls: 'text-amber-600 dark:text-amber-400' },
  hint2: { label: 'Tip', icon: Lightbulb, cls: 'bg-amber-50/70 border-amber-200 dark:bg-amber-500/[0.06] dark:border-amber-500/20', iconCls: 'text-amber-600 dark:text-amber-400' },
  proj: { label: 'Where I used it', icon: FolderGit2, cls: 'bg-fuchsia-50/60 border-fuchsia-200 dark:bg-fuchsia-500/[0.06] dark:border-fuchsia-500/20', iconCls: 'text-fuchsia-600 dark:text-fuchsia-400' },
  ts: { label: 'TypeScript angle', icon: Code2, cls: 'bg-blue-50/70 border-blue-200 dark:bg-blue-500/[0.06] dark:border-blue-500/20', iconCls: 'text-blue-600 dark:text-blue-400' },
  note: { label: 'Remember', icon: BookOpen, cls: 'bg-muted/60 border-border', iconCls: 'text-muted-foreground' },
}

export function Callout({ type, md, className }: { type: string; md: string; className?: string }) {
  const tone = TONES[type] ?? TONES.note
  const Icon = tone.icon
  return (
    <div className={cn('rounded-lg border px-4 py-3', tone.cls, className)}>
      <div className={cn('mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', tone.iconCls)}>
        <Icon className="size-3.5" /> {tone.label}
      </div>
      <Markdown md={md} className="prose-compact" />
    </div>
  )
}
