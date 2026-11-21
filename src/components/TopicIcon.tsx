import type { LucideIcon } from 'lucide-react'
import { Atom, Braces, Container, Database, FileCode2, FolderKanban, Handshake, Leaf, Server, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

// One line-icon per topic, in a small tinted square (shadcn style, works in light and dark).
const ICONS: Record<string, { icon: LucideIcon; cls: string }> = {
  plan: { icon: Target, cls: 'text-rose-600 bg-rose-500/10 dark:text-rose-400' },
  js: { icon: Braces, cls: 'text-amber-600 bg-amber-500/10 dark:text-amber-400' },
  ts: { icon: FileCode2, cls: 'text-blue-600 bg-blue-500/10 dark:text-blue-400' },
  react: { icon: Atom, cls: 'text-sky-600 bg-sky-500/10 dark:text-sky-400' },
  node: { icon: Server, cls: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400' },
  mongo: { icon: Leaf, cls: 'text-green-600 bg-green-500/10 dark:text-green-400' },
  sql: { icon: Database, cls: 'text-indigo-600 bg-indigo-500/10 dark:text-indigo-400' },
  devops: { icon: Container, cls: 'text-cyan-600 bg-cyan-500/10 dark:text-cyan-400' },
  projects: { icon: FolderKanban, cls: 'text-violet-600 bg-violet-500/10 dark:text-violet-400' },
  hr: { icon: Handshake, cls: 'text-orange-600 bg-orange-500/10 dark:text-orange-400' },
}

export function TopicIcon({ name, className }: { name: string; className?: string }) {
  const it = ICONS[name] ?? ICONS.plan
  const Icon = it.icon
  return (
    <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-md', it.cls, className)}>
      <Icon className="size-3.5" strokeWidth={2} />
    </span>
  )
}
