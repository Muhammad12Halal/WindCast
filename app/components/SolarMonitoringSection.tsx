'use client'

import { Sun, BatteryCharging, Gauge, Zap, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DailySummary, Reading, Site } from '../lib/supabase'
import {
  batteryPercent,
  batteryStatus,
  batteryTextClass,
  chargingStatusFromBattery,
  controllerStatusFromBattery,
} from '../lib/format'

export interface SolarMonitoringSectionProps {
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

function SolarCard({ site, reading }: { site: Site; reading: Reading | null }) {
  if (!reading) {
    return (
      <div className="flex min-h-[180px] flex-col gap-3 rounded-xl border border-surface-border bg-surface-card p-4">
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
        <div className="flex flex-1 items-center justify-center gap-1.5 text-xs text-slate-600">
          <ShieldAlert size={13} className="text-critical" />
          Station offline — no telemetry
        </div>
      </div>
    )
  }

  const hasSolarTelemetry = reading.solar_voltage != null
  const charging = chargingStatusFromBattery(reading.battery_voltage)
  const controller = controllerStatusFromBattery(reading.battery_voltage)
  const pct = batteryPercent(reading.battery_voltage)

  return (
    <div className="flex min-h-[180px] flex-col gap-3 rounded-xl border border-surface-border bg-surface-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-solar/50 hover:shadow-glow-solar">
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
          <p className="flex items-center justify-center gap-1 font-mono text-lg font-semibold tabular-nums text-solar">
            <Zap size={13} />
            {reading.solar_output_w != null ? reading.solar_output_w.toFixed(0) : '—'}
            {reading.solar_output_w != null && <span className="text-xs font-normal text-slate-500">W</span>}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Solar Output</p>
        </div>
      </div>

      {!hasSolarTelemetry && (
        <p className="text-center text-[10px] text-slate-600">No solar telemetry reported by this station yet</p>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <BatteryCharging size={12} className={batteryTextClass(reading.battery_voltage)} />
            Battery {reading.battery_voltage.toFixed(2)}V
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
    </div>
  )
}

export default function SolarMonitoringSection({ sites, readings, dailySummary, loading = false }: SolarMonitoringSectionProps) {
  return (
    <section id="solar" className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-slate-100">Solar Monitoring</h2>
        <p className="mt-0.5 text-xs text-slate-500">Charging system health across every station</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-surface-border bg-surface-card px-5 py-4">
        {dailySummary ? (
          <>
            <SummaryStat icon={Sun} label="Solar Generated Today" value={`${Math.round(dailySummary.solar_generation_wh)}`} sub="Wh" />
            <SummaryStat icon={Zap} label="Total Generation" value={`${Math.round(dailySummary.total_generation_wh)}`} sub="Wh (wind + solar)" />
            <SummaryStat icon={Gauge} label="Efficiency Score" value={`${dailySummary.efficiency_score.toFixed(1)}%`} />
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Daily generation aggregation not available yet — showing live per-station charging telemetry below.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[180px] animate-pulse rounded-xl border border-surface-border bg-surface-card" />
            ))
          : sites.map((site) => <SolarCard key={site.site_id} site={site} reading={readings[site.site_id] ?? null} />)}
      </div>
    </section>
  )
}
