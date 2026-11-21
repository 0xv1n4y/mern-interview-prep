// Navigation: one entry per Markdown file in src/content.
export type PageInfo = { slug: string; title: string; icon: string; badge?: string }
export type Group = { name: string; pages: PageInfo[] }

export const GROUPS: Group[] = [
  { name: 'Start here', pages: [{ slug: 'index', title: 'Your interview plan', icon: '🎯' }] },
  {
    name: 'Most-asked (simple)',
    pages: [
      { slug: 'm1-javascript', title: 'JavaScript', icon: '🟨' },
      { slug: 'm2-react', title: 'React', icon: '⚛️' },
      { slug: 'm3-node-express', title: 'Node & Express', icon: '🟩' },
      { slug: 'm4-mongodb', title: 'MongoDB', icon: '🍃' },
      { slug: 'm5-sql-postgresql', title: 'SQL & PostgreSQL', icon: '🐘' },
      { slug: 'm6-git-docker-gcp', title: 'Git, Docker & GCP', icon: '🐳' },
    ],
  },
  {
    name: 'Deep dive',
    pages: [
      { slug: '01-javascript', title: 'JavaScript', icon: '🟨' },
      { slug: '01b-typescript', title: 'TypeScript', icon: '🔷' },
      { slug: '02-react', title: 'React', icon: '⚛️' },
      { slug: '03-node-express', title: 'Node & Express', icon: '🟩' },
      { slug: '04-mongodb', title: 'MongoDB', icon: '🍃' },
      { slug: '05-postgresql', title: 'PostgreSQL', icon: '🐘' },
    ],
  },
  {
    name: 'Your story',
    pages: [
      { slug: '09-my-projects', title: 'My projects', icon: '📁' },
      { slug: '10-hr', title: 'HR & behavioural', icon: '🤝' },
    ],
  },
]

export const ALL_PAGES = GROUPS.flatMap((g) => g.pages.map((p) => ({ ...p, group: g.name })))

const raw = import.meta.glob('./content/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
export const CONTENT: Record<string, string> = Object.fromEntries(
  Object.entries(raw).map(([file, md]) => [file.replace('./content/', '').replace('.md', ''), md]),
)
