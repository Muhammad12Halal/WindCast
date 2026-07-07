'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Gauge, Target, TrendingUp, Waves } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Site } from '../lib/supabase'
import { useReadingsSince } from '../lib/hooks'
import { analyzeSitePairs, pairSites } from '../lib/accuracy'
import GlassmorphicCard from './ui/GlassmorphicCard'

export interface PerformanceAnalysisPanelProps {
  sites: Site[]
  /** Reports the network-wide average accuracy up to the parent, for the global KPI row. */
  onOverallAccuracyChange?: (pct: number | null) => void
}

const WINDOW_OPTIONS = [
  { label: '6 hours', hours: 6 },
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 24 * 7 },
] as const

function StatTile({ icon: Icon, label, value, sub }: { icon: typeof Gauge; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-border/10 px-4 py-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon size={13} />
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-100">{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}

export default function PerformanceAnalysisPanel({ sites, onOverallAccuracyChange }: PerformanceAnalysisPanelProps) {
  const [hours, setHours] = useState<number>(24)
  const { data: readings, loading } = useReadingsSince(hours)

  const pairs = useMemo(() => pairSites(sites), [sites])
  const [selectedLowCostId, setSelectedLowCostId] = useState<string>('')

  const analyses = useMemo(() => analyzeSitePairs(sites, readings), [sites, readings])

  useEffect(() => {
    const validAccuracies = analyses.map((a) => a.stats?.accuracyPct).filter((v): v is number => v !== undefined && v !== null)
    const overall = validAccuracies.length > 0 ? validAccuracies.reduce((s, v) => s + v, 0) / validAccuracies.length : null
    onOverallAccuracyChange?.(overall)
  }, [analyses, onOverallAccuracyChange])

  const activeAnalysis = analyses.find((a) => a.lowCost.site_id === selectedLowCostId) ?? analyses[0]

  const chartData = useMemo(
    () =>
      (activeAnalysis?.points ?? []).map((p) => ({
        time: new Date(p.timestamp).toLocaleString('en-MY', hours > 24 ? { day: '2-digit', month: 'short' } : { hour: '2-digit', minute: '2-digit' }),
        Reference: p.reference,
        LowCost: p.lowCost,
      })),
    [activeAnalysis, hours],
  )

  return (
    <GlassmorphicCard glow="reference" id="performance" className="w-full">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-100">Performance Analysis</h2>
            <p className="mt-0.5 text-xs text-slate-500">Commercial reference vs. low-cost sensor accuracy</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pairs.length > 1 && (
              <select
                value={activeAnalysis?.lowCost.site_id ?? ''}
                onChange={(e) => setSelectedLowCostId(e.target.value)}
                className="rounded-lg border border-surface-border bg-surface-border/20 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-reference/60"
              >
                {analyses.map((a) => (
                  <option key={a.lowCost.site_id} value={a.lowCost.site_id} className="bg-surface-card">
                    {a.lowCost.site_name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex rounded-lg border border-surface-border bg-surface-border/10 p-0.5">
              {WINDOW_OPTIONS.map((opt) => (
                <button
                  key={opt.hours}
                  type="button"
                  onClick={() => setHours(opt.hours)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    hours === opt.hours ? 'bg-reference/15 text-reference' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {pairs.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-surface-border text-center text-sm text-slate-500">
            Need at least one reference station and one low-cost station to compute sensor accuracy.
          </div>
        ) : !activeAnalysis ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">Loading comparison…</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-surface-border/10 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-reference" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">{activeAnalysis.reference.site_name}</p>
                  <p className="text-[10px] uppercase tracking-wide text-reference">Commercial Reference</p>
                </div>
              </div>
              <ArrowRight size={16} className="shrink-0 text-slate-600" />
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-lowcost" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">{activeAnalysis.lowCost.site_name}</p>
                  <p className="text-[10px] uppercase tracking-wide text-lowcost">Low-Cost Sensor</p>
                </div>
              </div>
              <span className="ml-auto shrink-0 text-[11px] text-slate-500">
                Paired by nearest station · {activeAnalysis.distanceKm.toFixed(1)} km apart
              </span>
            </div>

            {!activeAnalysis.stats ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-surface-border text-center text-sm text-slate-500">
                {loading
                  ? 'Loading readings…'
                  : `Not enough overlapping readings in this window yet (${activeAnalysis.points.length} found, need 3+).`}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatTile
                    icon={Target}
                    label="Accuracy"
                    value={`${activeAnalysis.stats.accuracyPct.toFixed(1)}%`}
                    sub={`n=${activeAnalysis.stats.n}`}
                  />
                  <StatTile icon={Waves} label="RMSE" value={activeAnalysis.stats.rmse.toFixed(2)} sub="km/h" />
                  <StatTile icon={Gauge} label="MAE" value={activeAnalysis.stats.mae.toFixed(2)} sub="km/h" />
                  <StatTile
                    icon={TrendingUp}
                    label="Correlation"
                    value={activeAnalysis.stats.correlation.toFixed(2)}
                    sub={`bias ${activeAnalysis.stats.bias >= 0 ? '+' : ''}${activeAnalysis.stats.bias.toFixed(2)} km/h`}
                  />
                </div>

                <div className="h-[220px] w-full">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Performance Trend</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#223349" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={11} tick={{ fill: '#94a3b8' }} interval="preserveStartEnd" />
                      <YAxis stroke="#64748b" fontSize={11} tick={{ fill: '#94a3b8' }} label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#132238', border: '1px solid #223349', borderRadius: 8 }} labelStyle={{ color: '#e6edf5' }} />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="Reference" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="LowCost" stroke="#a855f7" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </GlassmorphicCard>
  )
}
