'use client'

import { useEffect, useState } from 'react'
import { Activity, Clock, Database, RefreshCw, Server } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatTimeAgo } from '../lib/format'

export type ConnectionStatus = 'connected' | 'error' | 'unconfigured' | 'no-data'

export interface FooterProps {
  apiStatus: ConnectionStatus
  dbStatus: ConnectionStatus
  /** Timestamp of the most recent successful telemetry fetch, or null before the first one lands. */
  lastRefresh: Date | null
  refreshIntervalMs: number
}

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; dot: string; text: string }> = {
  connected: { label: 'Connected', dot: 'bg-healthy', text: 'text-healthy' },
  error: { label: 'Error', dot: 'bg-critical', text: 'text-critical' },
  unconfigured: { label: 'Not Configured', dot: 'bg-slate-500', text: 'text-slate-500' },
  'no-data': { label: 'No Data', dot: 'bg-warning', text: 'text-warning' },
}

function StatusItem({ icon: Icon, label, status }: { icon: LucideIcon; label: string; status: ConnectionStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className="flex items-center gap-1.5">
      <Icon size={12} className="text-slate-600" />
      {label}
      <span className={`flex items-center gap-1 font-medium ${cfg.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    </span>
  )
}

export default function Footer({ apiStatus, dbStatus, lastRefresh, refreshIntervalMs }: FooterProps) {
  // Starts null so the server-rendered markup and the first client paint match;
  // the real clock only ticks in after hydration, avoiding a Date.now() mismatch.
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [])

  return (
    <footer className="w-full border-t border-surface-border bg-background px-5 py-4 text-xs text-slate-400">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          <StatusItem icon={Server} label="API" status={apiStatus} />
          <StatusItem icon={Database} label="Database" status={dbStatus} />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <RefreshCw size={12} className="text-slate-600" />
            Last Refresh
            <span className="font-medium text-slate-300">{lastRefresh ? formatTimeAgo(lastRefresh.getTime()) : '—'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Activity size={12} className="text-slate-600" />
            Refresh Interval
            <span className="font-medium text-slate-300">{Math.round(refreshIntervalMs / 1000)}s</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="text-slate-600" />
            <span className="font-mono font-medium text-slate-300">
              {now !== null ? new Date(now).toLocaleTimeString('en-MY', { hour12: false }) : '--:--:--'}
            </span>
          </span>
        </div>
      </div>
    </footer>
  )
}
