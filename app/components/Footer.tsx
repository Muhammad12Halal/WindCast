'use client'

import { useEffect, useState } from 'react'
import { formatTimeAgo } from '../lib/format'

const TICK_INTERVAL_MS = 1000

export interface FooterProps {
  /** Most recent telemetry timestamp across all stations, or null if none has arrived yet. */
  lastUpdated?: Date | null
}

export default function Footer({ lastUpdated = null }: FooterProps) {
  // "X ago" needs to keep advancing even though `lastUpdated` itself isn't changing.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const tick = setInterval(() => forceTick((n) => n + 1), TICK_INTERVAL_MS)
    return () => clearInterval(tick)
  }, [])

  return (
    <footer className="w-full border-t border-surface-border bg-background px-5 py-4 text-center text-xs text-slate-400">
      <p className="text-balance">
        © 2025 Wind Nowcast Dashboard ·{' '}
        {lastUpdated ? `Last telemetry: ${formatTimeAgo(lastUpdated.getTime())}` : 'Waiting for telemetry'}
      </p>
    </footer>
  )
}
