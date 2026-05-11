'use client'

import { useState, useEffect, useCallback } from 'react'

const KEY = 'eagleview-watchlist-v1'

export function useWatchlist() {
  const [ids, setIds] = useState<number[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored) setIds(JSON.parse(stored))
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  const save = useCallback((next: number[]) => {
    setIds(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }, [])

  const toggle = useCallback((id: number) => {
    setIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const isPinned = useCallback((id: number) => ids.includes(id), [ids])

  return { pinnedIds: ids, toggle, isPinned, ready, save }
}
