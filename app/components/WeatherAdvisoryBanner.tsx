'use client'

import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  Wind,
  Eye,
  TriangleAlert,
  Siren,
  X,
  MapPin,
  Compass,
  Clock,
  Radio,
  CloudSun,
  Cpu,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Alert, Reading, Site } from '../lib/supabase'
import { useWeatherForecast } from '../lib/weather'
import { deriveSystemAlerts, deriveWeatherAdvisory } from '../lib/advisory'
import type { AdvisoryLevel, SystemAlertCard, WeatherAdvisoryCard } from '../lib/advisory'
import { formatTimeAgo } from '../lib/format'

export interface WeatherAdvisoryBannerProps {
  sites: Site[]
  readings: Record<string, Reading>
  alerts: Alert[]
  latitude?: number
  longitude?: number
  timezone?: string
}

const MELAKA_LAT = 2.1926
const MELAKA_LON = 102.2381
const MELAKA_TZ = 'Asia/Kuala_Lumpur'

const LEVEL_STYLE: Record<AdvisoryLevel, { border: string; bg: string; text: string; dot: string }> = {
  normal: { border: 'border-l-healthy', bg: 'bg-healthy/10', text: 'text-healthy', dot: 'bg-healthy' },
  advisory: { border: 'border-l-warning', bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  watch: { border: 'border-l-solar', bg: 'bg-solar/10', text: 'text-solar', dot: 'bg-solar' },
  warning: { border: 'border-l-critical', bg: 'bg-critical/10', text: 'text-critical', dot: 'bg-critical' },
  emergency: { border: 'border-l-lowcost', bg: 'bg-lowcost/10', text: 'text-lowcost', dot: 'bg-lowcost' },
}

const LEVEL_ICON: Record<AdvisoryLevel, LucideIcon> = {
  normal: CheckCircle2,
  advisory: Wind,
  watch: Eye,
  warning: TriangleAlert,
  emergency: Siren,
}

type AdvisoryCardData = WeatherAdvisoryCard | SystemAlertCard

function SectionHeader({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
      <Icon size={12} />
      {label}
    </div>
  )
}

function CalmLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card/60 px-4 py-2 text-xs text-slate-500">
      <CheckCircle2 size={13} className="text-healthy" />
      {text}
    </div>
  )
}

function Field({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="mt-0.5 shrink-0 text-slate-500" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-slate-200">{value}</p>
      </div>
    </div>
  )
}

function AdvisoryCard({
  card,
  expanded,
  onToggle,
  onDismiss,
  onLeaveComplete,
  leaving,
}: {
  card: AdvisoryCardData
  expanded: boolean
  onToggle: () => void
  onDismiss: () => void
  onLeaveComplete: () => void
  leaving: boolean
}) {
  const style = LEVEL_STYLE[card.level]
  const Icon = LEVEL_ICON[card.level]

  return (
    <div
      onTransitionEnd={(e) => {
        if (leaving && e.propertyName === 'opacity') onLeaveComplete()
      }}
      className={`overflow-hidden rounded-lg border-l-4 bg-surface-card shadow-card transition-all duration-300 ease-out ${style.border} ${
        leaving ? 'max-h-0 scale-[0.98] opacity-0' : 'max-h-[500px] opacity-100'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left"
      >
        <div className={`shrink-0 rounded-lg p-1.5 ${style.bg}`}>
          <Icon size={16} className={style.text} />
        </div>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {card.level}
          </span>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-100">{card.title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{card.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            aria-label="Dismiss advisory"
            className="rounded p-1 text-slate-500 hover:text-slate-200"
          >
            <X size={14} />
          </button>
          <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-surface-border px-4 py-3 sm:grid-cols-3">
            {card.kind === 'weather' ? (
              <>
                <Field icon={Wind} label="Forecast" value={card.forecastWindSpeedRange} />
                <Field icon={Compass} label="Direction" value={card.windDirection} />
                <Field icon={Clock} label="Expected" value={card.expectedDuration} />
                <Field icon={MapPin} label="Affected" value={card.affectedStations.join(', ') || '—'} />
                <Field icon={Radio} label="Source" value={card.source} />
              </>
            ) : (
              <>
                <Field icon={MapPin} label="Affected" value={card.affectedStations.join(', ') || '—'} />
                <Field icon={Radio} label="Source" value={card.source} />
                {card.timestamp && <Field icon={Clock} label="Reported" value={formatTimeAgo(card.timestamp)} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WeatherAdvisoryBanner({
  sites,
  readings,
  alerts,
  latitude = MELAKA_LAT,
  longitude = MELAKA_LON,
  timezone = MELAKA_TZ,
}: WeatherAdvisoryBannerProps) {
  const { forecast, loading: forecastLoading } = useWeatherForecast(latitude, longitude, timezone)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set())
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  // Environmental conditions — Open-Meteo only, never telemetry.
  const weatherCard = useMemo(() => {
    if (!forecast) return null
    return deriveWeatherAdvisory(
      forecast.points,
      sites.map((s) => s.site_name),
    )
  }, [forecast, sites])

  // Hardware/connectivity conditions — telemetry + backend alerts only, never weather.
  const systemAlertCards = useMemo(() => deriveSystemAlerts(sites, readings, alerts), [sites, readings, alerts])

  const visibleWeatherCard = weatherCard && !dismissedIds.has(weatherCard.id) ? weatherCard : null
  const visibleSystemCards = systemAlertCards.filter((c) => !dismissedIds.has(c.id))

  const startDismiss = (id: string) => setLeavingIds((prev) => new Set(prev).add(id))
  const finishDismiss = (id: string) => setDismissedIds((prev) => new Set(prev).add(id))
  const toggle = (id: string) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const renderCard = (card: AdvisoryCardData) => (
    <AdvisoryCard
      key={card.id}
      card={card}
      expanded={!collapsedIds.has(card.id)}
      onToggle={() => toggle(card.id)}
      onDismiss={() => startDismiss(card.id)}
      onLeaveComplete={() => finishDismiss(card.id)}
      leaving={leavingIds.has(card.id)}
    />
  )

  return (
    <section className="animate-fade-in flex w-full flex-col gap-3 px-2 pt-2">
      <div className="flex flex-col gap-1.5">
        <SectionHeader icon={CloudSun} label="Weather Advisory" />
        {visibleWeatherCard ? renderCard(visibleWeatherCard) : !forecastLoading && <CalmLine text="No active weather advisory." />}
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionHeader icon={Cpu} label="System Alerts" />
        {visibleSystemCards.length > 0 ? visibleSystemCards.map(renderCard) : <CalmLine text="No active system alerts." />}
      </div>
    </section>
  )
}
