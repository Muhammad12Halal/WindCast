'use client'

import { useEffect, useState } from 'react'
import { Fan, Sun, Zap, ArrowUp, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DailySummary } from '../lib/supabase'

interface EnergyGenerationWidgetProps {
  date?: Date
  data?: DailySummary | null
  isLoading?: boolean
}

const COUNT_UP_MS = 800

function useCountUp(target: number): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frame: number
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}

function efficiencyColor(score: number): string {
  if (score > 90) return 'text-green-400'
  if (score >= 70) return 'text-amber-400'
  return 'text-red-400'
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

function GenerationColumn({
  icon: Icon,
  iconColor,
  label,
  value,
  percent,
  barColor,
}: {
  icon: LucideIcon
  iconColor: string
  label: string
  value: number
  percent: number
  barColor: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={16} className={iconColor} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums text-slate-100">{Math.round(value)}</span>
        <span className="text-sm text-slate-500">Wh</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border/40">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-500">{Math.round(percent)}%</span>
    </div>
  )
}

function StarRating({ rating, colorClass }: { rating: number; colorClass: string }) {
  const clamped = Math.min(5, Math.max(0, rating))
  return (
    <div
      className="relative inline-flex animate-fade-in gap-0.5"
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      <div className="flex gap-0.5 text-slate-700">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
        ))}
      </div>
      <div
        className={`absolute inset-0 flex gap-0.5 overflow-hidden transition-all duration-700 ease-out ${colorClass}`}
        style={{ width: `${(clamped / 5) * 100}%` }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3 w-24 rounded bg-surface-border/40" />
            <div className="h-8 w-16 rounded bg-surface-border/40" />
            <div className="h-1.5 w-full rounded-full bg-surface-border/40" />
          </div>
        ))}
      </div>
      <div className="h-8 w-full rounded bg-surface-border/40" />
      <div className="h-8 w-full rounded bg-surface-border/40" />
      <div className="h-12 w-full rounded-lg bg-surface-border/40" />
    </div>
  )
}

export default function EnergyGenerationWidget({
  date = new Date(),
  data,
  isLoading = false,
}: EnergyGenerationWidgetProps) {
  const total = data?.total_generation_wh ?? 0
  const windPercent = total > 0 ? ((data?.wind_generation_wh ?? 0) / total) * 100 : 0
  const solarPercent = total > 0 ? ((data?.solar_generation_wh ?? 0) / total) * 100 : 0

  const windValue = useCountUp(data?.wind_generation_wh ?? 0)
  const solarValue = useCountUp(data?.solar_generation_wh ?? 0)
  const totalValue = useCountUp(total)

  const rating = data ? (data.efficiency_score / 100) * 5 : 0
  const effColor = data ? efficiencyColor(data.efficiency_score) : 'text-slate-400'

  return (
    <div className="flex min-h-[280px] flex-col gap-5 rounded-xl border border-surface-border bg-surface-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow">
      <div>
        <h3 className="font-semibold text-slate-100">Today&apos;s Energy Generation</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !data ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-600">No data available</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GenerationColumn
              icon={Fan}
              iconColor="text-primary"
              label="Wind Generation"
              value={windValue}
              percent={windPercent}
              barColor="bg-primary"
            />
            <GenerationColumn
              icon={Sun}
              iconColor="text-secondary"
              label="Solar Generation"
              value={solarValue}
              percent={solarPercent}
              barColor="bg-secondary"
            />
          </div>

          <div className="flex items-center justify-between border-t border-surface-border pt-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Zap size={20} className="text-primary" />
              <span className="text-sm">Total</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-slate-100">{Math.round(totalValue)}</span>
              <span className="text-sm text-slate-500">Wh</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Efficiency</p>
              <p className={`text-lg font-bold tabular-nums ${effColor}`}>{data.efficiency_score.toFixed(1)}%</p>
            </div>
            <StarRating rating={rating} colorClass={effColor} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-surface-border/20 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Peak Hour</p>
              <p className="text-sm font-semibold text-slate-200">{formatHour(data.peak_hour)}</p>
            </div>
            <div className="flex items-center gap-1.5 text-green-400">
              <ArrowUp size={16} />
              <span className="text-sm font-semibold tabular-nums">{data.peak_generation_wh} Wh</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
