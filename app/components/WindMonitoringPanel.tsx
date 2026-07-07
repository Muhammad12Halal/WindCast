'use client'

import { Wind, Navigation } from 'lucide-react'
import type { Reading, Site } from '../lib/supabase'
import { cardinalDirection, formatTimeAgo, windSpeedTextClass } from '../lib/format'
import AnimatedCompass from './ui/AnimatedCompass'
import GlassmorphicCard from './ui/GlassmorphicCard'

export interface WindMonitoringPanelProps {
  sites: Site[]
  readings: Record<string, Reading>
  loading?: boolean
  selectedSiteId?: string
  onSelectSite?: (siteId: string) => void
}

const MAX_SPEED_KMH = 30

function LoadingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="flex items-center gap-5">
        <div className="h-24 w-24 shrink-0 rounded-full bg-surface-border/40" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-surface-border/40" />
          <div className="h-8 w-32 rounded bg-surface-border/40" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 rounded-lg bg-surface-border/40" />
      ))}
    </div>
  )
}

export default function WindMonitoringPanel({
  sites,
  readings,
  loading = false,
  selectedSiteId,
  onSelectSite,
}: WindMonitoringPanelProps) {
  const ranked = [...sites].sort((a, b) => (readings[b.site_id]?.wind_speed_kmh ?? -1) - (readings[a.site_id]?.wind_speed_kmh ?? -1))
  const leader = ranked[0]
  const leaderReading = leader ? readings[leader.site_id] : null

  return (
    <GlassmorphicCard glow="wind" id="wind-monitoring" className="h-full">
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex h-full flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-100">Wind Monitoring</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Live speed &amp; direction across {sites.length} station{sites.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="shrink-0 rounded-lg bg-wind/10 p-2">
              <Wind size={18} className="text-wind" />
            </div>
          </div>

          {leader && leaderReading ? (
            <div className="flex items-center gap-5 border-b border-surface-border pb-5">
              <AnimatedCompass direction={leaderReading.wind_direction_deg} size={88} showLabel={false} />
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Strongest Reading</p>
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-mono text-4xl font-bold tabular-nums leading-none ${windSpeedTextClass(leaderReading.wind_speed_kmh)}`}>
                    {leaderReading.wind_speed_kmh.toFixed(1)}
                  </span>
                  <span className="text-sm text-slate-500">km/h</span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-300">{leader.site_name}</p>
                <p className="text-xs text-slate-500">
                  {cardinalDirection(leaderReading.wind_direction_deg)} · {Math.round(leaderReading.wind_direction_deg)}°
                </p>
              </div>
            </div>
          ) : (
            <div className="border-b border-surface-border pb-5 text-center text-sm text-slate-600">
              No live wind data yet
            </div>
          )}

          <div className="flex-1 space-y-2 overflow-y-auto">
            {ranked.map((site) => {
              const reading = readings[site.site_id]
              const speed = reading?.wind_speed_kmh ?? 0
              const isSelected = site.site_id === selectedSiteId
              return (
                <button
                  key={site.site_id}
                  type="button"
                  onClick={() => onSelectSite?.(site.site_id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 ${
                    isSelected
                      ? 'border-wind/50 bg-wind/5'
                      : 'border-transparent bg-surface-border/10 hover:border-surface-border hover:bg-surface-border/20'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-200">{site.site_name}</span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                          site.is_reference ? 'bg-reference/15 text-reference' : 'bg-lowcost/15 text-lowcost'
                        }`}
                      >
                        {site.is_reference ? 'Reference' : 'Low-Cost'}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-border/40">
                      <div
                        className="h-full rounded-full bg-wind transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, (speed / MAX_SPEED_KMH) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className={`font-mono text-sm font-semibold tabular-nums ${windSpeedTextClass(speed)}`}>
                      {reading ? speed.toFixed(1) : '—'}
                      <span className="ml-0.5 text-[10px] font-normal text-slate-500">km/h</span>
                    </span>
                    {reading && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Navigation size={10} style={{ transform: `rotate(${reading.wind_direction_deg}deg)` }} />
                        {formatTimeAgo(reading.timestamp)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </GlassmorphicCard>
  )
}
