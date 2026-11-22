import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { keymap } from '@codemirror/view'
import { EditorState, Prec } from '@codemirror/state'
import { indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { sql, PostgreSQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

// CodeMirror 6 editor: syntax colours, line numbers, bracket matching, Tab indents, Ctrl/Cmd+Enter runs.
export function CodeEditor({ value, onChange, language, onRun, minHeight = 180 }: {
  value: string; onChange: (v: string) => void; language: 'js' | 'sql'; onRun?: () => void; minHeight?: number
}) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const latest = useRef({ onChange, onRun })
  latest.current = { onChange, onRun }

  useEffect(() => {
    if (!host.current) return
    view.current = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { latest.current.onRun?.(); return true } }])),
          language === 'sql' ? sql({ dialect: PostgreSQL }) : javascript(),
          oneDark,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { fontSize: '13.5px', borderRadius: '0.6rem', backgroundColor: '#0d0d10' },
            '.cm-scroller': { fontFamily: '"Geist Mono Variable", ui-monospace, monospace', minHeight: minHeight + 'px', lineHeight: '1.6' },
            '.cm-gutters': { backgroundColor: '#0d0d10', borderRight: '1px solid rgb(255 255 255 / 6%)' },
            '&.cm-focused': { outline: '2px solid rgb(255 255 255 / 18%)' },
          }),
          EditorView.updateListener.of((u) => { if (u.docChanged) latest.current.onChange(u.state.doc.toString()) }),
        ],
      }),
    })
    return () => { view.current?.destroy(); view.current = null }
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the editor in sync when the value is replaced from outside (Reset).
  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
  }, [value])

  return <div ref={host} className="overflow-hidden rounded-[0.6rem] border border-white/10" />
}
