'use client'

import { Sun, SlidersHorizontal, BatteryCharging, Cpu, Antenna, Cloud, Signal, ShieldCheck, ShieldAlert, WifiOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DailySummary, Reading, Site } from '../lib/supabase'
import {
  batteryPercent,
  batteryStatus,
  batteryTextClass,
  chargingStatusFromBattery,
  controllerStatusFromBattery,
  formatTimeAgo,
  signalTextClass,
} from '../lib/format'

export interface PowerSystemHealthSectionProps {
  sites: Site[]
  readings: Record<string, Reading>
  dailySummary?: DailySummary | null
  loading?: boolean
}

const BATTERY_BAR_CLASS: Record<ReturnType<typeof batteryStatus>, string> = {
  healthy: 'bg-healthy',
  warning: 'bg-warning',
  critical: 'bg-critical',
}

const HARDWARE_CHAIN: { label: string; icon: LucideIcon }[] = [
  { label: 'Solar Panel', icon: Sun },
  { label: 'Charge Controller', icon: SlidersHorizontal },
  { label: 'Battery', icon: BatteryCharging },
  { label: 'ESP32', icon: Cpu },
  { label: 'SIM7600', icon: Antenna },
  { label: 'Cloud', icon: Cloud },
]

function HardwareChain() {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-3 rounded-xl border border-surface-border bg-surface-card px-4 py-4 sm:flex-nowrap sm:gap-x-0">
      {HARDWARE_CHAIN.map((stage, i) => (
        <div key={stage.label} className="flex flex-1 items-center gap-1">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="rounded-lg bg-solar/10 p-2">
              <stage.icon size={16} className="text-solar" />
            </div>
            <span className="text-[10px] font-medium leading-tight text-slate-400">{stage.label}</span>
          </div>
          {i < HARDWARE_CHAIN.length - 1 && (
            <div className="mx-1 h-px flex-1 bg-gradient-to-r from-surface-border via-surface-border to-transparent sm:mx-2" />
          )}
        </div>
      ))}
    </div>
  )
}

function SummaryStat({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 rounded-lg bg-solar/10 p-2">
        <Icon size={16} className="text-solar" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="font-mono text-lg font-semibold tabular-nums text-slate-100">{value}</p>
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

function PowerCard({ site, reading }: { site: Site; reading: Reading | null }) {
  if (!reading) {
    return (
      <div className="flex min-h-[190px] flex-col gap-3 rounded-xl border border-surface-border bg-surface-card p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-200">{site.site_name}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              site.is_reference ? 'bg-reference/10 text-reference' : 'bg-lowcost/10 text-lowcost'
            }`}
          >
            {site.is_reference ? 'Reference' : 'Low-Cost'}
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-xs text-slate-600">
          <WifiOff size={20} className="text-critical" />
          Waiting for telemetry
          <span className="text-[10px] text-slate-700">Device offline</span>
        </div>
      </div>
    )
  }

  const hasSolarTelemetry = reading.solar_voltage != null
  const charging = chargingStatusFromBattery(reading.battery_voltage)
  const controller = controllerStatusFromBattery(reading.battery_voltage)
  const pct = batteryPercent(reading.battery_voltage)

  return (
    <div className="flex min-h-[190px] flex-col gap-3 rounded-xl border border-surface-border bg-surface-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-solar/50 hover:shadow-glow-solar">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-200">{site.site_name}</p>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            controller === 'Normal' ? 'bg-healthy/10 text-healthy' : 'bg-critical/10 text-critical'
          }`}
        >
          {controller === 'Normal' ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
          {controller}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="flex items-center justify-center gap-1 font-mono text-lg font-semibold tabular-nums text-solar">
            <Sun size={13} />
            {hasSolarTelemetry ? reading.solar_voltage!.toFixed(1) : '—'}
            {hasSolarTelemetry && <span className="text-xs font-normal text-slate-500">V</span>}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Solar Voltage</p>
        </div>
        <div>
          <p
            className={`flex items-center justify-center gap-1 font-mono text-lg font-semibold tabular-nums ${signalTextClass(reading.signal_rssi)}`}
          >
            <Signal size={13} />
            {reading.signal_rssi ?? '—'}
            <span className="text-xs font-normal text-slate-500">dBm</span>
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Signal Strength</p>
        </div>
      </div>

      {!hasSolarTelemetry && (
        <p className="text-center text-[10px] text-slate-600">No solar telemetry reported by this station yet</p>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <BatteryCharging size={12} className={batteryTextClass(reading.battery_voltage)} />
            Battery {(reading.battery_voltage ?? 0).toFixed(2)}V
          </span>
          <span
            className={
              charging === 'Charging' ? 'text-healthy' : charging === 'Trickle' ? 'text-warning' : 'text-critical'
            }
          >
            {charging}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border/40">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${BATTERY_BAR_CLASS[batteryStatus(reading.battery_voltage)]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="text-right text-[10px] text-slate-600">Updated {formatTimeAgo(reading.timestamp)}</p>
    </div>
  )
}

export default function PowerSystemHealthSection({ sites, readings, dailySummary, loading = false }: PowerSystemHealthSectionProps) {
  return (
    <section id="power-system" className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-slate-100">Power System Health</h2>
        <p className="mt-0.5 text-xs text-slate-500">Solar Panel → Charge Controller → Battery → ESP32 → SIM7600 → Cloud</p>
      </div>

      <div className="mb-4">
        <HardwareChain />
      </div>

      {dailySummary && (
        <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-surface-border bg-surface-card px-5 py-4">
          <SummaryStat icon={Sun} label="Solar Generated Today" value={`${Math.round(dailySummary.solar_energy_generated_wh ?? 0)}`} sub="Wh" />
          <SummaryStat icon={BatteryCharging} label="Total Generation" value={`${Math.round(dailySummary.total_energy_generated_wh ?? 0)}`} sub="Wh (wind + solar)" />
          <SummaryStat icon={SlidersHorizontal} label="Efficiency Score" value={`${(dailySummary.availability_percent ?? 0).toFixed(1)}%`} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[190px] animate-pulse rounded-xl border border-surface-border bg-surface-card" />
            ))
          : sites.map((site) => <PowerCard key={site.site_id} site={site} reading={readings[site.site_id] ?? null} />)}
      </div>
    </section>
  )
}
