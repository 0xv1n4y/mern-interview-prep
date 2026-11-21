// Turns a content Markdown file into structured sections and questions.
// Authoring syntax (unchanged from the old site):
//   # Title                         page title; text before the first ## is the intro
//   ## Section                      section heading
//   ### Question {basic|mid|adv} {star}   question
//   :::quick / :::simple / :::say / :::warn / :::tip / :::hint2 / :::note / :::proj / :::ts / :::output … :::
//   :::practice (```js starter``` + ```js tests```) ::: then :::hint … ::: and :::solution … :::

export type Level = 'basic' | 'mid' | 'adv' | ''
export type Block =
  | { kind: 'md'; md: string }
  | { kind: 'box'; type: string; md: string }
  | { kind: 'practice'; starter: string; tests: string; hints: string[]; solution: string }
export type Question = { id: string; title: string; level: Level; star: boolean; blocks: Block[]; text: string }
export type Section = { id: string; title: string; intro: Block[]; questions: Question[] }
export type Page = { title: string; intro: string; sections: Section[] }

export const slug = (t: string) =>
  t.toLowerCase().replace(/<[^>]+>/g, '').replace(/`/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

// Split a chunk of Markdown into plain Markdown and ::: boxes (fence-aware).
function toBlocks(md: string): Block[] {
  const blocks: Block[] = []
  const lines = md.split('\n')
  let buf: string[] = []
  let inFence = false
  const flush = () => { const t = buf.join('\n').trim(); if (t) blocks.push({ kind: 'md', md: t }); buf = [] }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^```/.test(line)) inFence = !inFence
    const open = !inFence && line.match(/^:::(\w+)/)
    if (open) {
      const type = open[1]
      const inner: string[] = []
      let fence = false
      for (i++; i < lines.length; i++) {
        if (/^```/.test(lines[i])) fence = !fence
        if (!fence && /^:::\s*$/.test(lines[i])) break
        inner.push(lines[i])
      }
      flush()
      const body = inner.join('\n').trim()
      if (type === 'practice') {
        blocks.push({
          kind: 'practice',
          starter: (body.match(/```js starter\n([\s\S]*?)```/) || [])[1] || '',
          tests: (body.match(/```js tests\n([\s\S]*?)```/) || [])[1] || '',
          hints: [], solution: '',
        })
      } else if (type === 'hint' || type === 'solution') {
        const last = [...blocks].reverse().find((b) => b.kind === 'practice')
        if (last && last.kind === 'practice') { if (type === 'hint') last.hints.push(body); else last.solution = body }
        else blocks.push({ kind: 'box', type: type === 'hint' ? 'hint2' : 'note', md: body })
      } else {
        blocks.push({ kind: 'box', type, md: body })
      }
      continue
    }
    buf.push(line)
  }
  flush()
  return blocks
}

const plain = (md: string) => md.replace(/```[\s\S]*?```/g, ' ').replace(/[#*`>|_\-[\]()]/g, ' ').replace(/\s+/g, ' ').trim()

export function parsePage(md: string): Page {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let title = ''
  const introLines: string[] = []
  const sections: Section[] = []
  type RawSec = { title: string; lines: string[]; qs: { head: string; lines: string[] }[] }
  let sec: RawSec | null = null
  const raw: RawSec[] = []
  let inFence = false
  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence
    if (!inFence && /^# /.test(line) && !title) { title = line.slice(2).trim(); continue }
    if (!inFence && /^## /.test(line)) { sec = { title: line.slice(3).trim(), lines: [], qs: [] }; raw.push(sec); continue }
    if (!inFence && /^### /.test(line)) {
      if (!sec) { sec = { title: '', lines: [], qs: [] }; raw.push(sec) }
      sec.qs.push({ head: line.slice(4).trim(), lines: [] }); continue
    }
    if (!sec) introLines.push(line)
    else if (sec.qs.length) sec.qs[sec.qs.length - 1].lines.push(line)
    else sec.lines.push(line)
  }
  for (const s of raw) {
    const questions: Question[] = s.qs.map((q) => {
      let head = q.head, level: Level = '', star = false
      const st = head.match(/\s*\{star\}\s*$/); if (st) { star = true; head = head.replace(st[0], '') }
      const lv = head.match(/\s*\{(basic|mid|adv)\}\s*$/); if (lv) { level = lv[1] as Level; head = head.replace(lv[0], '') }
      const body = q.lines.join('\n')
      return { id: slug(head), title: head.trim(), level, star, blocks: toBlocks(body), text: plain(body) }
    })
    sections.push({ id: slug(s.title || 'section'), title: s.title, intro: toBlocks(s.lines.join('\n')), questions })
  }
  return { title, intro: introLines.join('\n').trim(), sections }
}
