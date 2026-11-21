import { ALL_PAGES, CONTENT } from '@/pages'
import { parsePage, type Page } from '@/lib/parse'
import { doneKey, store } from '@/lib/store'

const cache = new Map<string, Page>()
export function getPage(slug: string): Page | null {
  if (!CONTENT[slug]) return null
  if (!cache.has(slug)) cache.set(slug, parsePage(CONTENT[slug]))
  return cache.get(slug)!
}

export function pageStats(slug: string) {
  const page = getPage(slug)
  const qs = page ? page.sections.flatMap((s) => s.questions) : []
  const done = qs.filter((q) => store.get(doneKey(slug, q.id)) === '1').length
  return { total: qs.length, done, stars: qs.filter((q) => q.star).length }
}

export type SearchItem = { page: string; pageTitle: string; group: string; id: string; title: string; star: boolean; text: string }
let index: SearchItem[] | null = null
export function searchIndex(): SearchItem[] {
  index ??= ALL_PAGES.flatMap((p) => (getPage(p.slug)?.sections ?? []).flatMap((s) =>
    s.questions.map((q) => ({ page: p.slug, pageTitle: p.title, group: p.group, id: q.id, title: q.title.replace(/`/g, ''), star: q.star, text: q.text.toLowerCase() }))))
  return index
}
