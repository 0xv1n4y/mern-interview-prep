import { GROUPS } from '@/pages'
import { pageStats } from '@/lib/data'
import { href } from '@/lib/router'
import { useStoreVersion } from '@/lib/store'
import { cn } from '@/lib/utils'
import { TopicIcon } from '@/components/TopicIcon'

export function Sidebar({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  useStoreVersion()
  return (
    <nav className="space-y-6 px-3 py-6" aria-label="Topics">
      {GROUPS.map((g) => (
        <div key={g.name}>
          <p className="mb-1.5 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{g.name}</p>
          <ul className="space-y-0.5">
            {g.pages.map((p) => {
              const s = pageStats(p.slug)
              const active = p.slug === current
              return (
                <li key={p.slug}>
                  <a
                    href={href(p.slug)}
                    onClick={onNavigate}
                    className={cn('flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[14.5px] transition-colors',
                      active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground')}
                  >
                    <TopicIcon name={p.icon} />
                    <span className="flex-1 truncate">{p.title}</span>
                    {s.total > 0 && (
                      <span className={cn('text-xs tabular-nums', s.done === s.total ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/70')}>
                        {s.done}/{s.total}
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
