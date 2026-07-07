'use client'

import { useState } from 'react'
import {
  Wind,
  Compass,
  Zap,
  Signal,
  CheckCircle2,
  XCircle,
  Star,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Site, Reading } from '../lib/supabase'
import GlassmorphicCard from './ui/GlassmorphicCard'

export interface SiteFilters {
  energyType: 'Wind' | 'Solar' | 'Both'
  output: 'High' | 'Medium' | 'Low'
  status: 'Active' | 'Offline' | 'Maintenance'
}

export interface SiteDetailsCardProps {
  site: Site
  reading: Reading | null
  onFilterChange?: (filters: SiteFilters) => void
  isLoading?: boolean
}

const EFFICIENCY_SCORE = 92.3
const COST_PER_KWH = 0.065
const READING_FRESHNESS_MS = 5 * 60 * 1000

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

function signalColor(dBm: number): string {
  if (dBm > -70) return 'text-green-400'
  if (dBm >= -80) return 'text-amber-400'
  return 'text-red-400'
}

function batteryBarColor(voltage: number): string {
  if (voltage > 3.8) return 'bg-green-400'
  if (voltage >= 3.5) return 'bg-amber-400'
  return 'bg-red-400'
}

const BATTERY_MAX_V = 5

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
      <div className={`text-xl font-bold tabular-nums leading-none ${valueColor}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-slate-500">{unit}</span>}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  )
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}) {
  return (
    <label className="relative flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none rounded-lg border border-surface-border bg-surface-border/20 px-3 py-2 pr-8 text-sm text-slate-200 outline-none transition-colors focus:border-primary/60"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-surface-card">
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
      </div>
    </label>
  )
}

function StatusCheck({ label, ok }: { label: string; ok: boolean }) {
  const Icon = ok ? CheckCircle2 : XCircle
  return (
    <div className={`flex items-center gap-2 text-sm ${ok ? 'text-slate-300' : 'text-slate-600'}`}>
      <Icon size={16} className={ok ? 'text-green-400' : 'text-slate-600'} />
      {label}
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  const clamped = Math.min(5, Math.max(0, rating))
  return (
    <div className="relative inline-flex gap-0.5" role="img" aria-label={`${clamped.toFixed(1)} out of 5 stars`}>
      <div className="flex gap-0.5 text-slate-700">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
        ))}
      </div>
      <div
        className="absolute inset-0 flex gap-0.5 overflow-hidden text-primary"
        style={{ width: `${(clamped / 5) * 100}%` }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
        ))}
      </div>
    </div>
  )
}

function isReadingFresh(reading: Reading | null): boolean {
  if (!reading) return false
  return Date.now() - new Date(reading.timestamp).getTime() < READING_FRESHNESS_MS
}

function TurbinePlaceholder({ index }: { index: number }) {
  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg bg-gradient-to-br from-surface-border/40 to-surface-border/10">
      <Wind size={22} className="text-primary/70" />
      <span className="text-[10px] font-medium text-slate-500">Turbine {index}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="h-5 w-40 rounded bg-surface-border/40" />
      <div className="h-3 w-full rounded bg-surface-border/40" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-surface-border/40" />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-4 w-4 rounded bg-surface-border/40" />
            <div className="h-6 w-10 rounded bg-surface-border/40" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SiteDetailsCard({ site, reading, onFilterChange, isLoading = false }: SiteDetailsCardProps) {
  const [filters, setFilters] = useState<SiteFilters>({ energyType: 'Wind', output: 'Medium', status: 'Active' })

  const updateFilter = <K extends keyof SiteFilters>(key: K, value: SiteFilters[K]) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    onFilterChange?.(next)
  }

  const isFresh = isReadingFresh(reading)
  const batteryPercent = reading ? Math.min(100, Math.max(0, (reading.battery_voltage / BATTERY_MAX_V) * 100)) : 0

  return (
    <GlassmorphicCard glow="primary" id="site-details" className="h-full">
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex h-full flex-col gap-5">
          {/* Site Info */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-100">{site.site_name}</h2>
              <span
                className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
                  site.is_reference
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : 'border-accent/30 bg-accent/10 text-accent'
                }`}
              >
                {site.is_reference ? 'Reference' : 'Low-Cost'}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Wind monitoring station equipped with {site.sensor_type} sensors, delivering real-time wind speed and
              direction data to support grid-connected renewable energy operations across Melaka.
            </p>
          </div>

          {/* Image Gallery */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <TurbinePlaceholder key={i} index={i} />
            ))}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-3 gap-2">
            <FilterSelect
              label="Energy Type"
              value={filters.energyType}
              options={['Wind', 'Solar', 'Both'] as const}
              onChange={(v) => updateFilter('energyType', v)}
            />
            <FilterSelect
              label="Output"
              value={filters.output}
              options={['High', 'Medium', 'Low'] as const}
              onChange={(v) => updateFilter('output', v)}
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              options={['Active', 'Offline', 'Maintenance'] as const}
              onChange={(v) => updateFilter('status', v)}
            />
          </div>

          {reading ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-3 border-t border-surface-border pt-4">
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
                <Metric icon={Zap} label="Battery" value={reading.battery_voltage.toFixed(1)} unit="V" />
                <Metric
                  icon={Signal}
                  label="Signal"
                  value={`${reading.signal_strength}`}
                  unit="dBm"
                  valueColor={signalColor(reading.signal_strength)}
                />
              </div>
              <div className="-mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-border/40">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${batteryBarColor(reading.battery_voltage)}`}
                  style={{ width: `${batteryPercent}%` }}
                />
              </div>
            </>
          ) : (
            <div className="border-t border-surface-border pt-4 text-center text-sm text-slate-600">
              No recent data
            </div>
          )}

          {/* Status Checklist */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-surface-border pt-4">
            <StatusCheck label="Grid Connected" ok={!!reading} />
            <StatusCheck label="Real-time Monitoring" ok={isFresh} />
            <StatusCheck label="Data Logging Active" ok={!!reading} />
            <StatusCheck label="Battery Backup Ready" ok={!!reading && reading.battery_voltage >= 3.5} />
          </div>

          {/* Efficiency + Cost */}
          <div className="flex items-center justify-between border-t border-surface-border pt-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Efficiency</p>
              <p className="text-lg font-bold tabular-nums text-primary">{EFFICIENCY_SCORE.toFixed(1)}%</p>
              <StarRating rating={(EFFICIENCY_SCORE / 100) * 5} />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cost</p>
              <p className="text-lg font-bold tabular-nums text-slate-200">${COST_PER_KWH.toFixed(3)}/kWh</p>
            </div>
          </div>

          {/* CTA */}
          <a
            href="#map"
            className="mt-auto flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-primary/85"
          >
            View Live Metrics
          </a>
        </div>
      )}
    </GlassmorphicCard>
  )
}
