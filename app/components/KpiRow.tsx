'use client'

import type { LucideIcon } from 'lucide-react'
import { Wind, Navigation, Zap, Radio, BatteryCharging, Gauge } from 'lucide-react'
import { useCountUp } from '../lib/hooks'
import { cardinalDirection } from '../lib/format'
import type { GlobalKpis } from '../lib/kpi'

export interface KpiRowProps {
  kpis: GlobalKpis
  /** Overall cross-site sensor accuracy (%), lifted up from the Performance Analysis panel once computed. */
  overallAccuracyPct: number | null
  loading?: boolean
}

type Accent = 'wind' | 'solar' | 'healthy' | 'reference'

const ACCENT_CLASSES: Record<Accent, { icon: string; chip: string; ring: string }> = {
  wind: { icon: 'text-wind', chip: 'bg-wind/10', ring: 'hover:border-wind/50' },
  solar: { icon: 'text-solar', chip: 'bg-solar/10', ring: 'hover:border-solar/50' },
  healthy: { icon: 'text-healthy', chip: 'bg-healthy/10', ring: 'hover:border-healthy/50' },
  reference: { icon: 'text-reference', chip: 'bg-reference/10', ring: 'hover:border-reference/50' },
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  emptyLabel,
}: {
  icon: LucideIcon
  label: string
  /** Pass `null` (instead of a "—" placeholder) to render the informative empty state. */
  value: React.ReactNode | null
  sub?: string
  accent: Accent
  emptyLabel?: string
}) {
  const classes = ACCENT_CLASSES[accent]
  const isEmpty = value === null
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 ${classes.ring}`}
    >
      <div className={`shrink-0 rounded-lg p-2 transition-opacity duration-300 ${classes.chip} ${isEmpty ? 'opacity-50' : ''}`}>
        <Icon size={18} className={classes.icon} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {isEmpty ? (
          <p className="truncate text-sm font-medium leading-tight text-slate-500">{emptyLabel ?? 'No data'}</p>
        ) : (
          <p className="truncate font-mono text-xl font-semibold tabular-nums leading-tight text-slate-100">{value}</p>
        )}
        {!isEmpty && sub && <p className="truncate text-[11px] text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

function LoadingTile() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3.5">
      <div className="h-9 w-9 shrink-0 rounded-lg bg-surface-border/40" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 w-16 rounded bg-surface-border/40" />
        <div className="h-5 w-20 rounded bg-surface-border/40" />
      </div>
    </div>
  )
}

export default function KpiRow({ kpis, overallAccuracyPct, loading = false }: KpiRowProps) {
  const avgWind = useCountUp(kpis.avgWindSpeedKmh ?? 0)
  const energyToday = useCountUp(kpis.energyTodayWh ?? 0)
  const batteryHealth = useCountUp(kpis.batteryHealthPct ?? 0)
  const accuracy = useCountUp(overallAccuracyPct ?? 0)

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingTile key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiTile
        icon={Wind}
        label="Avg Wind Speed"
        value={kpis.avgWindSpeedKmh !== null ? `${avgWind.toFixed(1)}` : null}
        sub="km/h"
        emptyLabel="Waiting for telemetry"
        accent="wind"
      />
      <KpiTile
        icon={Navigation}
        label="Dominant Direction"
        value={
          kpis.dominantDirectionDeg !== null ? (
            <span className="inline-flex items-center gap-2">
              <Navigation
                size={16}
                className="text-wind shrink-0 transition-transform duration-700 ease-out"
                style={{ transform: `rotate(${kpis.dominantDirectionDeg}deg)` }}
              />
              {cardinalDirection(kpis.dominantDirectionDeg)}
            </span>
          ) : null
        }
        sub={kpis.dominantDirectionDeg !== null ? `${Math.round(kpis.dominantDirectionDeg)}°` : undefined}
        emptyLabel="No readings yet"
        accent="wind"
      />
      <KpiTile
        icon={Zap}
        label="Energy Today"
        value={kpis.energyTodayWh !== null ? Math.round(energyToday).toLocaleString('en-MY') : null}
        sub="Wh generated"
        emptyLabel="No summary available"
        accent="solar"
      />
      <KpiTile
        icon={Radio}
        label="Online Stations"
        value={`${kpis.onlineStations}/${kpis.totalStations}`}
        sub={kpis.totalStations > 0 ? `${Math.round((kpis.onlineStations / kpis.totalStations) * 100)}% uptime` : undefined}
        accent="healthy"
      />
      <KpiTile
        icon={BatteryCharging}
        label="Battery Health"
        value={kpis.batteryHealthPct !== null ? `${batteryHealth.toFixed(0)}%` : null}
        sub="stations ≥ 3.5V"
        emptyLabel="Collecting data"
        accent="healthy"
      />
      <KpiTile
        icon={Gauge}
        label="Overall Accuracy"
        value={overallAccuracyPct !== null ? `${accuracy.toFixed(1)}%` : null}
        sub="low-cost vs. reference"
        emptyLabel="Collecting data"
        accent="reference"
      />
    </div>
  )
}
