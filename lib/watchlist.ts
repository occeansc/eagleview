'use client'

import { useState, useEffect, useCallback } from 'react'

const KEY = 'eagleview-watchlist-tickers-v1'
const LEGACY_SECTOR_KEY = 'eagleview-watchlist-v1'

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase()
}

export function useWatchlist() {
  const [tickers, setTickers] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setTickers(parsed.map(String).map(normalizeTicker).filter(Boolean))
        }
      }
      // Retire the old sector-pinned watchlist quietly. The watchlist is now
      // ticker-first, so stale sector IDs should not keep sectors appearing.
      localStorage.removeItem(LEGACY_SECTOR_KEY)
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  const save = useCallback((next: string[]) => {
    const clean = Array.from(new Set(next.map(normalizeTicker).filter(Boolean)))
    setTickers(clean)
    try { localStorage.setItem(KEY, JSON.stringify(clean)) } catch { /* ignore */ }
  }, [])

  const toggle = useCallback((ticker: string) => {
    const normalized = normalizeTicker(ticker)
    if (!normalized) return
    setTickers(prev => {
      const next = prev.includes(normalized)
        ? prev.filter(x => x !== normalized)
        : [...prev, normalized]
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const isPinned = useCallback((ticker: string) => tickers.includes(normalizeTicker(ticker)), [tickers])

  return { pinnedTickers: tickers, toggle, isPinned, ready, save }
}
