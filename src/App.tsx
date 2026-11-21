import { useEffect, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen, Menu, Moon, Search, Sun, Bot, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/Sidebar'
import { TopicPage } from '@/components/TopicPage'
import { SearchDialog } from '@/components/SearchDialog'
import { AiSettings } from '@/components/AiSettings'
import { ALL_PAGES } from '@/pages'
import { getPage } from '@/lib/data'
import { useRoute, href } from '@/lib/router'
import { store } from '@/lib/store'
import { openAiSettings } from '@/lib/ai'

function useTheme(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    const saved = store.get('ip:theme')
    return saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  })
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  return [dark, () => setDark((d) => { store.set('ip:theme', d ? 'light' : 'dark'); return !d })]
}

export default function App() {
  const route = useRoute()
  const [dark, toggleTheme] = useTheme()
  const [menu, setMenu] = useState(false)
  const [search, setSearch] = useState(false)
  // Desktop sidebar can be hidden for more reading space; the choice is remembered.
  const [sidebar, setSidebar] = useState(() => store.get('ip:sidebar') !== 'closed')
  const toggleSidebar = () => {
    if (matchMedia('(min-width: 1024px)').matches) {
      setSidebar((s) => { store.set('ip:sidebar', s ? 'closed' : 'open'); return !s })
    } else setMenu(true)
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true) } }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const info = ALL_PAGES.find((p) => p.slug === route.page && getPage(p.slug)) ?? ALL_PAGES[0]
  useEffect(() => { document.title = `${info.title} · Interview Prep` }, [info.title])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-dvh bg-background text-foreground">
        <header className="sticky top-0 z-30 h-14 border-b border-border/60 bg-background/85 backdrop-blur">
          <div className="flex h-full items-center gap-2 px-3 sm:px-5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label={sidebar ? 'Hide menu' : 'Show menu'} aria-expanded={sidebar}>
                  <Menu className="lg:hidden" />
                  {sidebar ? <PanelLeftClose className="hidden lg:block" /> : <PanelLeftOpen className="hidden lg:block" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{sidebar ? 'Hide menu' : 'Show menu'}</TooltipContent>
            </Tooltip>
            <a href={href('index')} className="mr-2 flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><GraduationCap className="size-4" /></span>
              <span className="hidden sm:inline">Interview Prep</span>
            </a>
            <button
              onClick={() => setSearch(true)}
              className="mx-auto flex h-9 w-full max-w-md items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Search className="size-4" /><span className="flex-1 text-left">Search questions…</span><Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
            </button>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => openAiSettings()} aria-label="AI settings"><Bot /></Button></TooltipTrigger>
              <TooltipContent>AI practice settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</Button></TooltipTrigger>
              <TooltipContent>{dark ? 'Light mode' : 'Dark mode'}</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="flex">
          <aside
            aria-hidden={!sidebar}
            className={`sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 overflow-hidden transition-[width] duration-200 lg:block ${sidebar ? 'w-64 border-r border-border/60' : 'w-0'}`}
          >
            <div className="h-full w-64 overflow-y-auto"><Sidebar current={info.slug} /></div>
          </aside>
          <main className="min-w-0 flex-1">
            <TopicPage key={info.slug} info={info} group={info.group} anchor={route.page === info.slug ? route.anchor : ''} />
          </main>
        </div>

        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetContent side="left" className="w-72 overflow-y-auto p-0">
            <SheetTitle className="sr-only">Topics</SheetTitle>
            <Sidebar current={info.slug} onNavigate={() => setMenu(false)} />
          </SheetContent>
        </Sheet>
        <SearchDialog open={search} onOpenChange={setSearch} />
        <AiSettings />
      </div>
    </TooltipProvider>
  )
}
