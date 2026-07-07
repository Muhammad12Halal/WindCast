'use client'

import { useEffect, useState } from 'react'
import { Wind, Compass, BatteryCharging, Signal, Sun, CheckCircle2, TriangleAlert, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Site, Reading } from '../lib/supabase'
import {
  batteryPercent as computeBatteryPercent,
  batteryStatus,
  batteryTextClass,
  cardinalDirection,
  formatTimeAgo,
  signalTextClass,
  windSpeedTextClass,
} from '../lib/format'
import AnimatedCompass from './ui/AnimatedCompass'

interface SiteMonitorCardProps {
  site: Site
  reading: Reading | null
  isLoading?: boolean
}

type SiteStatus = 'HEALTHY' | 'LOW_BATTERY' | 'ERROR'

function getStatus(reading: Reading | null): SiteStatus {
  if (!reading) return 'ERROR'
  if (batteryStatus(reading.battery_voltage) === 'critical') return 'LOW_BATTERY'
  return 'HEALTHY'
}

const STATUS_CONFIG: Record<SiteStatus, { label: string; icon: LucideIcon; color: string }> = {
  HEALTHY: { label: 'HEALTHY', icon: CheckCircle2, color: 'text-healthy' },
  LOW_BATTERY: { label: 'LOW BATTERY', icon: TriangleAlert, color: 'text-warning' },
  ERROR: { label: 'ERROR', icon: XCircle, color: 'text-critical' },
}

const BATTERY_BAR_CLASS: Record<ReturnType<typeof batteryStatus>, string> = {
  healthy: 'bg-healthy',
  warning: 'bg-warning',
  critical: 'bg-critical',
}

function Metric({
  icon: Icon,
  label,
  value,
  unit,
  valueColor = 'text-wind',
}: {
  icon: LucideIcon
  label: string
  value: string
  unit?: string
  valueColor?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Icon size={16} className="text-slate-500" />
      <div className={`font-mono text-2xl font-bold tabular-nums leading-none transition-colors duration-500 ${valueColor}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-slate-500">{unit}</span>}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-32 rounded bg-surface-border/40" />
          <div className="h-3 w-20 rounded bg-surface-border/40" />
        </div>
        <div className="h-5 w-20 rounded-full bg-surface-border/40" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-4 w-4 rounded bg-surface-border/40" />
            <div className="h-6 w-10 rounded bg-surface-border/40" />
            <div className="h-2 w-12 rounded bg-surface-border/40" />
          </div>
        ))}
      </div>
      <div className="mx-auto h-20 w-20 rounded-full bg-surface-border/40" />
    </div>
  )
}

export default function SiteMonitorCard({ site, reading, isLoading = false }: SiteMonitorCardProps) {
  // "Updated X ago" needs to keep advancing even though `reading` itself isn't changing.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 5000)
    return () => clearInterval(interval)
  }, [])

  const status = isLoading ? null : STATUS_CONFIG[getStatus(reading)]
  const batteryPct = reading ? computeBatteryPercent(reading.battery_voltage) : 0
  const hasSolar = reading?.solar_voltage != null

  return (
    <div className="group flex min-h-[300px] flex-col gap-4 rounded-xl border border-surface-border bg-surface-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-wind/60 hover:shadow-glow-wind">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-100">{site.site_name}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">{site.site_id}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
              site.is_reference
                ? 'border-reference/30 bg-reference/10 text-reference'
                : 'border-lowcost/30 bg-lowcost/10 text-lowcost'
            }`}
          >
            {site.is_reference ? 'Reference' : 'Low-Cost'}
          </span>
          {status && (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${status.color}`}>
              <status.icon size={12} />
              {status.label}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !reading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-600">No recent data</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric
              icon={Wind}
              label="Wind Speed"
              value={reading.wind_speed_kmh.toFixed(1)}
              unit="km/h"
              valueColor={windSpeedTextClass(reading.wind_speed_kmh)}
            />
            <Metric
              icon={Compass}
              label="Direction"
              value={`${Math.round(reading.wind_direction_deg)}°`}
              unit={cardinalDirection(reading.wind_direction_deg)}
            />
            <Metric icon={BatteryCharging} label="Battery" value={reading.battery_voltage.toFixed(1)} unit="V" valueColor={batteryTextClass(reading.battery_voltage)} />
            {hasSolar ? (
              <Metric icon={Sun} label="Solar" value={reading.solar_voltage!.toFixed(1)} unit="V" valueColor="text-solar" />
            ) : (
              <Metric
                icon={Signal}
                label="Signal"
                value={`${reading.signal_strength}`}
                unit="dBm"
                valueColor={signalTextClass(reading.signal_strength)}
              />
            )}
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border/40">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${BATTERY_BAR_CLASS[batteryStatus(reading.battery_voltage)]}`}
              style={{ width: `${batteryPct}%` }}
            />
          </div>

          <div className="flex flex-1 items-center justify-center py-1">
            <AnimatedCompass direction={reading.wind_direction_deg} size={72} showLabel={false} />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className={`flex items-center gap-1 ${signalTextClass(reading.signal_strength)}`}>
              <Signal size={11} />
              {reading.signal_strength} dBm
            </span>
            <span>Updated {formatTimeAgo(reading.timestamp)}</span>
          </div>
        </>
      )}
    </div>
  )
}
