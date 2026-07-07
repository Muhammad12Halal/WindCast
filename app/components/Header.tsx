'use client'

import { useEffect, useState } from 'react'
import { Wind, RefreshCw, CheckCircle2, TriangleAlert, ShieldAlert } from 'lucide-react'
import type { StatusLevel } from '../lib/format'
import { STATUS_COLOR } from '../lib/format'

export interface HeaderProps {
  /** Number of stations currently reporting fresh data. */
  onlineCount?: number
  /** Total configured stations. */
  totalCount?: number
  /** Timestamp of the most recent successful data fetch. */
  lastUpdated?: Date | null
  /** Overall system health, derived from station uptime and battery status. */
  systemHealth?: StatusLevel
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

const HEALTH_CONFIG: Record<StatusLevel, { label: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: 'All Systems Normal', icon: CheckCircle2 },
  warning: { label: 'Degraded Performance', icon: TriangleAlert },
  critical: { label: 'System Attention Needed', icon: ShieldAlert },
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
  onlineCount = 0,
  totalCount = 0,
  lastUpdated = null,
  systemHealth = 'healthy',
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

  const health = HEALTH_CONFIG[systemHealth]
  const HealthIcon = health.icon

  return (
    <header
      className={`sticky top-0 z-50 flex h-20 animate-fade-in items-center justify-between gap-4 border-b border-surface-border bg-background/95 px-5 backdrop-blur-sm ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0 rounded-xl bg-wind/10 p-2">
          <Wind className="text-wind animate-sway" size={24} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold tracking-tight text-slate-100">
            Wind Profile Nowcasting <span className="font-normal text-slate-500">— Melaka State</span>
          </h1>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: STATUS_COLOR[systemHealth] }}>
            <HealthIcon size={12} />
            <span className="font-medium">{health.label}</span>
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        <Stat label="Active Stations" value={`${onlineCount}/${totalCount}`} />
        <Stat label="Last Updated" value={lastUpdated ? formatTimeAgo(lastUpdated) : '—'} />
      </div>

      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        aria-label="Refresh data"
        className="glass glass-border flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:text-wind disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </header>
  )
}
