'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert, TriangleAlert, X } from 'lucide-react'
import type { Alert } from '../lib/supabase'

export interface AlertBannerProps {
  alerts: Alert[]
  onDismiss?: (alertId: number) => void
  autoHide?: boolean
  /** Delay before an alert auto-dismisses, when `autoHide` is true. */
  autoHideMs?: number
}

const AUTO_HIDE_MS = 10000

const severityStyles = {
  CRITICAL: {
    icon: ShieldAlert,
    border: 'border-l-red-500',
    bg: 'bg-red-500/10',
    label: 'text-red-400',
    iconColor: 'text-red-400',
  },
  WARNING: {
    icon: TriangleAlert,
    border: 'border-l-amber-500',
    bg: 'bg-amber-500/10',
    label: 'text-amber-400',
    iconColor: 'text-amber-400',
  },
} as const

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AlertItem({
  alert,
  autoHide,
  autoHideMs,
  onDismiss,
}: {
  alert: Alert
  autoHide: boolean
  autoHideMs: number
  onDismiss: (id: number) => void
}) {
  const [leaving, setLeaving] = useState(false)
  const style = severityStyles[alert.severity]
  const Icon = style.icon

  const dismiss = useCallback(() => setLeaving(true), [])

  useEffect(() => {
    if (!autoHide) return
    const timer = setTimeout(dismiss, autoHideMs)
    return () => clearTimeout(timer)
  }, [autoHide, autoHideMs, dismiss])

  return (
    <div
      onTransitionEnd={() => {
        if (leaving) onDismiss(alert.id)
      }}
      className={`w-full overflow-hidden rounded-lg border-l-4 text-slate-100 shadow-card transition-all duration-300 ease-out ${style.border} ${style.bg} ${
        leaving ? 'max-h-0 scale-[0.98] py-0 opacity-0' : 'max-h-40 p-4 opacity-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} className={`shrink-0 ${style.iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-bold uppercase tracking-wide ${style.label}`}>{alert.severity}</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss alert"
              className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-100"
            >
              <X size={16} />
            </button>
          </div>
          <p className="mt-1 truncate text-sm text-slate-200">{alert.message}</p>
          <p className="mt-1 text-xs text-slate-400">
            {alert.site_id} &middot; {formatTimestamp(alert.created_at)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AlertBanner({
  alerts,
  onDismiss,
  autoHide = false,
  autoHideMs = AUTO_HIDE_MS,
}: AlertBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set())

  const visibleAlerts = alerts.filter((alert) => !dismissedIds.has(alert.id))

  if (visibleAlerts.length === 0) return null

  const handleDismiss = (id: number) => {
    setDismissedIds((prev) => new Set(prev).add(id))
    onDismiss?.(id)
  }

  return (
    <section className="animate-fade-in w-full px-2 pt-2">
      <div className="flex flex-col gap-3">
        {visibleAlerts.map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            autoHide={autoHide}
            autoHideMs={autoHideMs}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </section>
  )
}
