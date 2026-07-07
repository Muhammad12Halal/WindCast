'use client'

import { useEffect, useState } from 'react'
import { Wind, Compass, Zap, Signal, CheckCircle2, TriangleAlert, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Site, Reading } from '../lib/supabase'
import AnimatedCompass from './ui/AnimatedCompass'

interface SiteMonitorCardProps {
  site: Site
  reading: Reading | null
  isLoading?: boolean
}

const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function cardinalDirection(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360
  return CARDINAL_DIRECTIONS[Math.round(normalized / 45) % 8]
}

function windSpeedColor(speed: number): string {
  if (speed < 5) return 'text-blue-400'
  if (speed < 10) return 'text-green-400'
  if (speed < 20) return 'text-amber-400'
  return 'text-red-400'
}

const BATTERY_MAX_V = 5

function batteryBarColor(voltage: number): string {
  if (voltage > 3.8) return 'bg-green-400'
  if (voltage >= 3.5) return 'bg-amber-400'
  return 'bg-red-400'
}

function signalColor(dBm: number): string {
  if (dBm > -70) return 'text-green-400'
  if (dBm >= -80) return 'text-amber-400'
  return 'text-red-400'
}

type SiteStatus = 'HEALTHY' | 'LOW_BATTERY' | 'ERROR'

function getStatus(reading: Reading | null): SiteStatus {
  if (!reading) return 'ERROR'
  if (reading.battery_voltage < 3.5) return 'LOW_BATTERY'
  return 'HEALTHY'
}

const STATUS_CONFIG: Record<SiteStatus, { label: string; icon: LucideIcon; color: string }> = {
  HEALTHY: { label: 'HEALTHY', icon: CheckCircle2, color: 'text-green-400' },
  LOW_BATTERY: { label: 'LOW BATTERY', icon: TriangleAlert, color: 'text-amber-400' },
  ERROR: { label: 'ERROR', icon: XCircle, color: 'text-red-400' },
}

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function Metric({
  icon: Icon,
  label,
  value,
  unit,
  valueColor = 'text-primary',
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
      <div className={`text-2xl font-bold tabular-nums leading-none transition-colors duration-500 ${valueColor}`}>
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
  const batteryPercent = reading ? Math.min(100, Math.max(0, (reading.battery_voltage / BATTERY_MAX_V) * 100)) : 0

  return (
    <div className="group flex min-h-[280px] flex-col gap-4 rounded-xl border border-surface-border bg-surface-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-100">{site.site_name}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">{site.site_id}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
              site.is_reference
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-accent/30 bg-accent/10 text-accent'
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
              valueColor={windSpeedColor(reading.wind_speed_kmh)}
            />
            <Metric
              icon={Compass}
              label="Direction"
              value={`${Math.round(reading.wind_direction_deg)}°`}
              unit={cardinalDirection(reading.wind_direction_deg)}
            />
            <Metric
              icon={Zap}
              label="Battery"
              value={reading.battery_voltage.toFixed(1)}
              unit="V"
            />
            <Metric
              icon={Signal}
              label="Signal"
              value={`${reading.signal_strength}`}
              unit="dBm"
              valueColor={signalColor(reading.signal_strength)}
            />
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border/40">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${batteryBarColor(reading.battery_voltage)}`}
              style={{ width: `${batteryPercent}%` }}
            />
          </div>

          <div className="flex flex-1 items-center justify-center py-1">
            <AnimatedCompass direction={reading.wind_direction_deg} size={72} showLabel={false} />
          </div>

          <div className="text-center text-xs text-slate-500">Updated: {formatTimeAgo(reading.timestamp)}</div>
        </>
      )}
    </div>
  )
}
