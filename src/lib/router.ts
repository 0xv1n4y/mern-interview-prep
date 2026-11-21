// Tiny hash router: #/page-slug or #/page-slug/question-id. Works on any static host.
import { useEffect, useState } from 'react'

export type Route = { page: string; anchor: string }

function read(): Route {
  const [page = 'index', anchor = ''] = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/')
  return { page: page || 'index', anchor }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => setRoute(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export const href = (page: string, anchor = '') => `#/${page}${anchor ? '/' + anchor : ''}`

/** Old-site links like "02-react.html#hooks" → "#/02-react/hooks". */
export function fixLink(h: string): string {
  const m = h.match(/^([\w-]+)\.html(?:#(.*))?$/)
  return m ? href(m[1], m[2] || '') : h
}
