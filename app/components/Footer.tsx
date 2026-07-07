'use client'

import { useEffect, useState } from 'react'

const REFRESH_INTERVAL_MS = 5000
const TICK_INTERVAL_MS = 1000

function formatSecondsAgo(seconds: number): string {
  if (seconds < 1) return 'just now'
  if (seconds === 1) return '1 second ago'
  return `${seconds} seconds ago`
}

export default function Footer() {
  const [lastUpdated, setLastUpdated] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const refresh = setInterval(() => setLastUpdated(Date.now()), REFRESH_INTERVAL_MS)
    return () => clearInterval(refresh)
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS)
    return () => clearInterval(tick)
  }, [])

  const secondsAgo = Math.floor((now - lastUpdated) / 1000)

  return (
    <footer className="w-full border-t border-surface-border bg-background px-5 py-4 text-center text-xs text-slate-400">
      <p className="text-balance">
        © 2025 Wind Nowcast Dashboard · Data updates every 5 seconds · Last updated: {formatSecondsAgo(secondsAgo)}
      </p>
    </footer>
  )
}
