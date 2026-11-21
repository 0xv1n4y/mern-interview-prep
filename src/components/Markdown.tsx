import { useEffect, useMemo, useRef } from 'react'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/common'
import DOMPurify from 'dompurify'
import { fixLink } from '@/lib/router'
import { cn } from '@/lib/utils'

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang === 'mermaid') return code.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  }),
  { gfm: true },
)

// Make tables scroll on small screens and links work with the hash router.
marked.use({
  renderer: {
    link(href: string, title: string | null | undefined, text: string) {
      const url = fixLink(href || '')
      const external = /^https?:/.test(url)
      return `<a href="${url}"${title ? ` title="${title}"` : ''}${external ? ' target="_blank" rel="noreferrer"' : ''}>${text}</a>`
    },
  },
})

export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string
  return DOMPurify.sanitize(html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>'), { ADD_ATTR: ['target'] })
}

let mermaidLoader: Promise<typeof import('mermaid')['default']> | null = null
async function renderDiagrams(root: HTMLElement) {
  const nodes = [...root.querySelectorAll<HTMLElement>('pre > code.language-mermaid')]
  if (!nodes.length) return
  mermaidLoader ??= import('mermaid').then((m) => m.default)
  const mermaid = await mermaidLoader
  await document.fonts.ready   // measure labels with the real font, or text gets clipped
  const dark = document.documentElement.classList.contains('dark')
  mermaid.initialize({
    startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict',
    fontFamily: '"Geist Variable", sans-serif', fontSize: 14,
    flowchart: { htmlLabels: true, padding: 12, useMaxWidth: true },
  })
  for (const [i, code] of nodes.entries()) {
    const src = code.textContent || ''
    try {
      const { svg } = await mermaid.render(`mmd-${Date.now()}-${i}`, src)
      const div = document.createElement('div')
      div.className = 'diagram'
      div.innerHTML = svg
      code.parentElement?.replaceWith(div)
    } catch { /* leave the source visible */ }
  }
}

export function Markdown({ md, className }: { md: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(md), [md])
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current) renderDiagrams(ref.current) }, [html])
  return <div ref={ref} className={cn('prose-ip', className)} dangerouslySetInnerHTML={{ __html: html }} />
}
