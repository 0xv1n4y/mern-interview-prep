// Small localStorage helpers. Storage can be blocked (private mode), so every call is guarded.
import { useCallback, useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const store = {
  get(key: string): string | null { try { return localStorage.getItem(key) } catch { return null } },
  set(key: string, value: string) { try { localStorage.setItem(key, value) } catch { /* not persisted */ } emit() },
  json<T>(key: string, fallback: T): T { try { return JSON.parse(store.get(key) ?? '') as T } catch { return fallback } },
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  const onStorage = () => cb()
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage) }
}

/** A reactive localStorage value. */
export function useStored(key: string): [string | null, (v: string) => void] {
  const value = useSyncExternalStore(subscribe, () => store.get(key), () => null)
  const set = useCallback((v: string) => store.set(key, v), [key])
  return [value, set]
}

export const doneKey = (page: string, id: string) => `ip2:done:${page}:${id}`

/** Re-render when any stored value changes (used for progress counts). */
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0)
}
let version = 0
listeners.add(() => { version++ })
