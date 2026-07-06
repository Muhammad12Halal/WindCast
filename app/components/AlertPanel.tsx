'use client'

import { ShieldAlert, TriangleAlert, CheckCircle2 } from 'lucide-react'
import type { Alert } from '../lib/supabase'

interface AlertPanelProps {
  alerts: Alert[]
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div>
        <p className="text-sm text-slate-200">{alert.message}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {alert.site_id} &middot; {formatTimestamp(alert.created_at)}
        </p>
      </div>
    </li>
  )
}

export default function AlertPanel({ alerts }: AlertPanelProps) {
  const critical = alerts.filter((a) => a.severity === 'CRITICAL')
  const warning = alerts.filter((a) => a.severity === 'WARNING')

  if (alerts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-center gap-3">
        <CheckCircle2 className="text-green-400 shrink-0" size={24} />
        <div>
          <p className="font-medium text-slate-100">All clear</p>
          <p className="text-sm text-slate-500">No active alerts across all sites</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {critical.length > 0 && (
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="text-red-400" size={20} />
            <h3 className="font-semibold text-red-400">Critical ({critical.length})</h3>
          </div>
          <ul className="divide-y divide-red-900/50">
            {critical.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        </div>
      )}

      {warning.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-900 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TriangleAlert className="text-amber-400" size={20} />
            <h3 className="font-semibold text-amber-400">Warning ({warning.length})</h3>
          </div>
          <ul className="divide-y divide-amber-900/50">
            {warning.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
