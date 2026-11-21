import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { aiBase, aiPass, callAi } from '@/lib/ai'
import { store } from '@/lib/store'

export function AiSettings() {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [pass, setPass] = useState('')
  const [base, setBase] = useState('')
  const [test, setTest] = useState('')

  useEffect(() => {
    const on = (e: Event) => { setNote((e as CustomEvent<string>).detail || ''); setPass(aiPass()); setBase(aiBase()); setTest(''); setOpen(true) }
    window.addEventListener('open-ai-settings', on)
    return () => window.removeEventListener('open-ai-settings', on)
  }, [])

  const save = () => { store.set('ip:aiPass', pass.trim()); store.set('ip:aiBase', base.trim()); setOpen(false) }
  const runTest = async () => {
    setTest('Testing…')
    try { setTest('✅ ' + (await callAi({ mode: 'ping' }, base.trim().replace(/\/$/, ''), pass.trim()))) }
    catch (e) { setTest('❌ ' + (e as Error).message) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI practice settings</DialogTitle>
          <DialogDescription>Saved only in this browser. Your Gemini API key stays on the server.</DialogDescription>
        </DialogHeader>
        {note && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{note}</p>}
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Passcode</span>
            <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="The APP_PASSCODE you set on the server" autoComplete="current-password" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Server address <span className="font-normal text-muted-foreground">(optional)</span></span>
            <Input type="url" value={base} onChange={(e) => setBase(e.target.value)} placeholder="Leave empty when the site and AI server are on the same website" />
          </label>
          {test && <p className="text-sm" aria-live="polite">{test}</p>}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={runTest}>Test connection</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
