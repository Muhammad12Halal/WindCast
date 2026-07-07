'use client'

import { useEffect, useState } from 'react'
import { Wind, RefreshCw } from 'lucide-react'

export interface HeaderProps {
  /** Number of active sites, shown in the tagline and stats row. */
  siteCount?: number
  /** Percentage (0-100) of sites currently reporting fresh data. */
  efficiency?: number
  /** Timestamp of the most recent successful data fetch. */
  lastUpdated?: Date | null
  /** Called when the refresh button is clicked. Awaited so the spinner keeps spinning until it resolves. */
  onRefresh?: () => void | Promise<void>
  className?: string
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums text-slate-100">{value}</p>
    </div>
  )
}

export default function Header({
  siteCount = 0,
  efficiency,
  lastUpdated = null,
  onRefresh,
  className = '',
}: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, forceTick] = useState(0)

  // "Last Updated: X min ago" needs to keep advancing even though lastUpdated itself isn't changing.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    if (isRefreshing || !onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <header
      className={`sticky top-0 z-50 flex h-20 animate-fade-in items-center justify-between gap-4 border-b border-surface-border bg-background px-5 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Wind className="text-primary animate-sway shrink-0" size={28} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-100">Wind Nowcast - Melaka State</h1>
          <p className="truncate text-xs text-slate-500">Real-time wind monitoring across {siteCount} sites</p>
        </div>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        <Stat label="Active Sites" value={String(siteCount)} />
        <Stat label="Efficiency" value={efficiency !== undefined ? `${efficiency.toFixed(1)}%` : '—'} />
        <Stat label="Last Updated" value={lastUpdated ? formatTimeAgo(lastUpdated) : '—'} />
      </div>

      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        aria-label="Refresh data"
        className="glass glass-border flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </header>
  )
}
