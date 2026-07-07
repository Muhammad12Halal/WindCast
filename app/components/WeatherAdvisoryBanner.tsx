'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  CloudSun,
  Compass,
  MapPin,
  Radio,
  ShieldAlert,
  Siren,
  TriangleAlert,
  Wind,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Alert, Reading, Site } from '../lib/supabase'
import { deriveSystemAlerts, deriveWeatherAdvisory } from '../lib/advisory'
import type { AdvisoryLevel, WeatherAdvisoryCard } from '../lib/advisory'
import { formatTimeAgo } from '../lib/format'
import { useWeatherForecast } from '../lib/weather'

export interface WeatherAdvisoryBannerProps {
  sites: Site[]
  readings: Record<string, Reading>
  alerts: Alert[]
  latitude?: number
  longitude?: number
  timezone?: string
  className?: string
}

interface SystemIssue {
  id: string
  stationName: string
  title: string
  description: string
  source: string
  timestamp?: string
  priority: NotificationPriority
}

interface StationAlertGroup {
  stationName: string
  issues: SystemIssue[]
  priority: NotificationPriority
  latestTimestamp?: string
}

interface ResolvedNotification {
  id: string
  title: string
  description: string
  source: string
  priority: NotificationPriority
  stationName?: string
  timestamp: string
}

type NotificationPriority = 'critical' | 'warning' | 'advisory' | 'information' | 'resolved'

const MELAKA_LAT = 2.1926
const MELAKA_LON = 102.2381
const MELAKA_TZ = 'Asia/Kuala_Lumpur'

const PRIORITY_ORDER: NotificationPriority[] = ['critical', 'warning', 'advisory', 'information', 'resolved']

const PRIORITY_STYLE: Record<
  NotificationPriority,
  {
    badge: string
    dot: string
    icon: string
    border: string
    surface: string
    text: string
    label: string
  }
> = {
  critical: {
    badge: 'border-critical/40 bg-critical/15 text-critical',
    dot: 'bg-critical',
    icon: 'text-critical',
    border: 'border-critical/30',
    surface: 'bg-critical/10',
    text: 'text-critical',
    label: 'Critical',
  },
  warning: {
    badge: 'border-solar/40 bg-solar/15 text-solar',
    dot: 'bg-solar',
    icon: 'text-solar',
    border: 'border-solar/30',
    surface: 'bg-solar/10',
    text: 'text-solar',
    label: 'Warning',
  },
  advisory: {
    badge: 'border-warning/40 bg-warning/15 text-warning',
    dot: 'bg-warning',
    icon: 'text-warning',
    border: 'border-warning/30',
    surface: 'bg-warning/10',
    text: 'text-warning',
    label: 'Advisory',
  },
  information: {
    badge: 'border-healthy/40 bg-healthy/15 text-healthy',
    dot: 'bg-healthy',
    icon: 'text-healthy',
    border: 'border-healthy/30',
    surface: 'bg-healthy/10',
    text: 'text-healthy',
    label: 'Information',
  },
  resolved: {
    badge: 'border-surface-border bg-surface-card/70 text-slate-400',
    dot: 'bg-slate-500',
    icon: 'text-slate-400',
    border: 'border-surface-border',
    surface: 'bg-surface-card/60',
    text: 'text-slate-400',
    label: 'Resolved',
  },
}

const LEVEL_ICON: Record<AdvisoryLevel, LucideIcon> = {
  normal: CheckCircle2,
  advisory: Wind,
  watch: TriangleAlert,
  warning: ShieldAlert,
  emergency: Siren,
}

function priorityRank(priority: NotificationPriority): number {
  return PRIORITY_ORDER.indexOf(priority)
}

function derivePriority(level: AdvisoryLevel): NotificationPriority {
  switch (level) {
    case 'emergency':
    case 'warning':
      return 'critical'
    case 'watch':
      return 'warning'
    case 'advisory':
      return 'advisory'
    default:
      return 'information'
  }
}

function getHigherPriority(left: NotificationPriority, right: NotificationPriority): NotificationPriority {
  return priorityRank(left) <= priorityRank(right) ? left : right
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-surface-border bg-surface-card/70 p-2 text-slate-300">
          <Icon size={16} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

function MetaItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-background/50 px-3 py-2">
      <div className="flex items-start gap-2">
        <Icon size={13} className="mt-0.5 shrink-0 text-slate-500" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-medium text-slate-200">{value}</p>
        </div>
      </div>
    </div>
  )
}

function PriorityPill({ priority }: { priority: NotificationPriority }) {
  const style = PRIORITY_STYLE[priority]
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${style.badge}`}>
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}

function NotificationDrawerCard({
  title,
  description,
  priority,
  icon: Icon,
  children,
  action,
}: {
  title: string
  description: string
  priority: NotificationPriority
  icon: LucideIcon
  children: React.ReactNode
  action?: React.ReactNode
}) {
  const style = PRIORITY_STYLE[priority]

  return (
    <article className={`rounded-2xl border p-4 shadow-card ${style.border} ${style.surface}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-white/10 bg-background/60 p-2">
          <Icon size={16} className={style.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <PriorityPill priority={priority} />
              <h4 className="mt-2 text-sm font-semibold text-slate-100">{title}</h4>
              <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
            </div>
            {action}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
        </div>
      </div>
    </article>
  )
}

function EmptyPanel({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-border bg-surface-card/50 px-4 py-5">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{copy}</p>
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
  className = '',
}: WeatherAdvisoryBannerProps) {
  const { forecast, loading: forecastLoading } = useWeatherForecast(latitude, longitude, timezone)
  const [isOpen, setIsOpen] = useState(false)
  const [resolvedOpen, setResolvedOpen] = useState(false)
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set())
  const [resolvedNotifications, setResolvedNotifications] = useState<ResolvedNotification[]>([])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  const weatherCard = useMemo(() => {
    if (!forecast) return null

    return deriveWeatherAdvisory(
      forecast.points,
      sites.map((site) => site.site_name),
    )
  }, [forecast, sites])

  const systemAlertCards = useMemo(() => deriveSystemAlerts(sites, readings, alerts), [sites, readings, alerts])

  const systemIssues = useMemo<SystemIssue[]>(() => {
    return systemAlertCards.flatMap((card) => {
      const priority = derivePriority(card.level)
      return card.affectedStations.map((stationName) => ({
        id: `${card.id}-${stationName}`,
        stationName,
        title: card.title,
        description: card.description,
        source: card.source,
        timestamp: card.timestamp,
        priority,
      }))
    })
  }, [systemAlertCards])

  const activeWeatherCard = weatherCard && !acknowledgedIds.has(weatherCard.id) ? weatherCard : null

  const stationGroups = useMemo<StationAlertGroup[]>(() => {
    const grouped = new Map<string, StationAlertGroup>()

    for (const issue of systemIssues) {
      if (acknowledgedIds.has(issue.id)) continue

      const existing = grouped.get(issue.stationName)
      if (!existing) {
        grouped.set(issue.stationName, {
          stationName: issue.stationName,
          issues: [issue],
          priority: issue.priority,
          latestTimestamp: issue.timestamp,
        })
        continue
      }

      existing.issues.push(issue)
      existing.priority = getHigherPriority(existing.priority, issue.priority)
      if (issue.timestamp && (!existing.latestTimestamp || new Date(issue.timestamp) > new Date(existing.latestTimestamp))) {
        existing.latestTimestamp = issue.timestamp
      }
    }

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        issues: [...group.issues].sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority)),
      }))
      .sort((left, right) => {
        const priorityDelta = priorityRank(left.priority) - priorityRank(right.priority)
        if (priorityDelta !== 0) return priorityDelta
        return left.stationName.localeCompare(right.stationName)
      })
  }, [acknowledgedIds, systemIssues])

  const activeNotificationCount = stationGroups.length + (activeWeatherCard ? 1 : 0)

  const acknowledgeWeather = (card: WeatherAdvisoryCard) => {
    setAcknowledgedIds((previous) => new Set(previous).add(card.id))
    setResolvedNotifications((previous) => [
      {
        id: card.id,
        title: card.title,
        description: `${card.forecastWindSpeedRange} from ${card.expectedDuration}`,
        source: card.source,
        priority: derivePriority(card.level),
        timestamp: new Date().toISOString(),
      },
      ...previous,
    ])
  }

  const acknowledgeGroup = (group: StationAlertGroup) => {
    setAcknowledgedIds((previous) => {
      const next = new Set(previous)
      for (const issue of group.issues) next.add(issue.id)
      return next
    })

    setResolvedNotifications((previous) => [
      {
        id: `resolved-${group.stationName}-${group.issues.map((issue) => issue.id).join('-')}`,
        title: `${group.stationName} issues acknowledged`,
        description: group.issues.map((issue) => issue.title).join(', '),
        source: group.issues[0]?.source ?? 'Station Telemetry',
        priority: group.priority,
        stationName: group.stationName,
        timestamp: new Date().toISOString(),
      },
      ...previous,
    ])
  }

  return (
    <>
      <div className={className}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={activeNotificationCount > 0 ? `Open notifications. ${activeNotificationCount} active.` : 'Open notifications'}
          className="group flex h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface-card/90 px-3 text-slate-200 shadow-card backdrop-blur-md transition-colors hover:border-wind/40 hover:text-white"
        >
          <div className="relative">
            <Bell size={16} className={activeNotificationCount > 0 ? 'text-warning' : 'text-slate-400'} />
            {activeNotificationCount > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-critical" />}
          </div>
          <span className="hidden text-sm font-medium sm:inline">Notifications</span>
          <span
            className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${
              activeNotificationCount > 0 ? 'bg-warning/15 text-warning' : 'bg-surface-border/80 text-slate-400'
            }`}
          >
            {activeNotificationCount}
          </span>
        </button>
      </div>

      <div className={`fixed inset-0 z-[70] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
        <div
          onClick={() => setIsOpen(false)}
          className={`absolute inset-0 bg-slate-950/70 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        />

        <aside
          aria-label="Notification center"
          className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-surface-border bg-background/98 shadow-2xl backdrop-blur-xl transition-transform duration-300 sm:max-w-[460px] ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Notification Center</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">Operations Advisory Stream</h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeNotificationCount > 0
                  ? `${activeNotificationCount} active notification${activeNotificationCount === 1 ? '' : 's'} require attention.`
                  : 'All monitoring conditions are currently stable.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close notifications"
              className="rounded-xl border border-surface-border bg-surface-card/70 p-2 text-slate-400 transition-colors hover:text-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <section className="space-y-3">
              <SectionTitle
                icon={CloudSun}
                title="Weather Advisory"
                subtitle="Forecast-based advisories only. Source: Open-Meteo."
              />

              {forecastLoading ? (
                <EmptyPanel title="Loading forecast advisory" copy="Pulling the latest forecast window for Melaka." />
              ) : activeWeatherCard ? (
                <NotificationDrawerCard
                  title={activeWeatherCard.title}
                  description={activeWeatherCard.description}
                  priority={derivePriority(activeWeatherCard.level)}
                  icon={LEVEL_ICON[activeWeatherCard.level]}
                  action={
                    <button
                      type="button"
                      onClick={() => acknowledgeWeather(activeWeatherCard)}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
                    >
                      Acknowledge
                    </button>
                  }
                >
                  <MetaItem icon={Clock3} label="Expected Time" value={activeWeatherCard.expectedDuration} />
                  <MetaItem icon={Wind} label="Expected Wind" value={activeWeatherCard.forecastWindSpeedRange} />
                  <MetaItem icon={Compass} label="Direction" value={activeWeatherCard.windDirection} />
                  <MetaItem icon={Radio} label="Source" value={activeWeatherCard.source} />
                </NotificationDrawerCard>
              ) : (
                <NotificationDrawerCard
                  title="No Weather Advisory"
                  description="Forecast conditions remain within normal operating bounds for the current horizon."
                  priority="information"
                  icon={CheckCircle2}
                >
                  <MetaItem icon={Radio} label="Source" value="Open-Meteo" />
                  <MetaItem icon={Clock3} label="Status" value="Monitoring continuously" />
                </NotificationDrawerCard>
              )}
            </section>

            <section className="space-y-3">
              <SectionTitle
                icon={ShieldAlert}
                title="System Alerts"
                subtitle="Grouped by station to keep the dashboard itself clear and scannable."
              />

              {stationGroups.length > 0 ? (
                <div className="space-y-3">
                  {stationGroups.map((group) => (
                    <NotificationDrawerCard
                      key={group.stationName}
                      title={group.stationName}
                      description={`${group.issues.length} active issue${group.issues.length === 1 ? '' : 's'} from live telemetry and backend alerts.`}
                      priority={group.priority}
                      icon={group.priority === 'critical' ? ShieldAlert : TriangleAlert}
                      action={
                        <button
                          type="button"
                          onClick={() => acknowledgeGroup(group)}
                          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
                        >
                          Acknowledge
                        </button>
                      }
                    >
                      <div className="sm:col-span-2">
                        <div className="rounded-xl border border-surface-border bg-background/55 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active Issues</p>
                            <PriorityPill priority={group.priority} />
                          </div>
                          <ul className="mt-3 space-y-2">
                            {group.issues.map((issue) => (
                              <li key={issue.id} className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-card/50 px-3 py-2.5">
                                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_STYLE[issue.priority].dot}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-slate-100">{issue.title}</p>
                                    <PriorityPill priority={issue.priority} />
                                  </div>
                                  <p className="mt-1 text-sm leading-6 text-slate-400">{issue.description}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <MetaItem icon={Radio} label="Telemetry Source" value={group.issues[0]?.source ?? 'Station Telemetry'} />
                      <MetaItem
                        icon={Clock3}
                        label="Most Recent"
                        value={group.latestTimestamp ? formatTimeAgo(group.latestTimestamp) : 'Live telemetry'}
                      />
                    </NotificationDrawerCard>
                  ))}
                </div>
              ) : (
                <EmptyPanel
                  title="No active system alerts"
                  copy="Battery, connectivity, and backend telemetry alerts are currently clear across the monitored stations."
                />
              )}
            </section>

            <section className="space-y-3 border-t border-surface-border pt-4">
              <button
                type="button"
                onClick={() => setResolvedOpen((previous) => !previous)}
                className="flex w-full items-center justify-between rounded-xl border border-surface-border bg-surface-card/60 px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-100">Resolved</p>
                  <p className="mt-1 text-xs text-slate-500">Acknowledged notifications are kept here for operator recall.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-surface-border px-2.5 py-1 text-xs font-semibold text-slate-400">
                    {resolvedNotifications.length}
                  </span>
                  {resolvedOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </div>
              </button>

              {resolvedOpen && (
                <div className="space-y-3">
                  {resolvedNotifications.length > 0 ? (
                    resolvedNotifications.map((notification) => (
                      <article key={notification.id} className="rounded-2xl border border-surface-border bg-surface-card/55 p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl border border-surface-border bg-background/60 p-2">
                            <CheckCircle2 size={16} className="text-healthy" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <PriorityPill priority="resolved" />
                              <PriorityPill priority={notification.priority} />
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-100">{notification.title}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-400">{notification.description}</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {notification.stationName ? <MetaItem icon={MapPin} label="Station" value={notification.stationName} /> : null}
                              <MetaItem icon={Radio} label="Source" value={notification.source} />
                              <MetaItem icon={Clock3} label="Resolved" value={formatTimeAgo(notification.timestamp)} />
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyPanel title="No resolved notifications yet" copy="Acknowledged weather advisories and station issues will appear here." />
                  )}
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>
    </>
  )
}

