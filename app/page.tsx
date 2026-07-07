'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import SidebarNav from './components/SidebarNav'
import Header from './components/Header'
import WeatherAdvisoryBanner from './components/WeatherAdvisoryBanner'
import KpiRow from './components/KpiRow'
import WindMonitoringPanel from './components/WindMonitoringPanel'
import MelakasWindFarmMap from './components/MelakasWindFarmMap'
import SiteMonitoringGrid from './components/SiteMonitoringGrid'
import PowerSystemHealthSection from './components/PowerSystemHealthSection'
import PerformanceAnalysisPanel from './components/PerformanceAnalysisPanel'
import WeatherForecastWidget from './components/WeatherForecastWidget'
import Footer from './components/Footer'
import { useSites, useLatestReadings, useAlerts, useDailySummary } from './lib/hooks'
import { computeGlobalKpis } from './lib/kpi'
import type { StatusLevel } from './lib/format'

function deriveSystemHealth(onlineStations: number, totalStations: number, batteryHealthPct: number | null): StatusLevel {
  if (totalStations === 0) return 'warning'
  const onlineRatio = onlineStations / totalStations
  if (onlineRatio < 0.5 || (batteryHealthPct !== null && batteryHealthPct < 50)) return 'critical'
  if (onlineRatio < 0.9 || (batteryHealthPct !== null && batteryHealthPct < 80)) return 'warning'
  return 'healthy'
}

export default function Dashboard() {
  const pathname = usePathname()
  const { sites, loading: sitesLoading } = useSites()
  const { readings } = useLatestReadings()
  const { alerts } = useAlerts()
  const { data: dailySummary } = useDailySummary()
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined)
  const [, setIsRefreshing] = useState(false)
  const [overallAccuracy, setOverallAccuracy] = useState<number | null>(null)
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)

  const handleOverallAccuracyChange = useCallback((pct: number | null) => setOverallAccuracy(pct), [])

  const kpis = computeGlobalKpis(sites, readings, dailySummary)
  const systemHealth = deriveSystemHealth(kpis.onlineStations, kpis.totalStations, kpis.batteryHealthPct)

  // The most recent telemetry timestamp across all stations — used as the
  // dashboard's single "last updated" signal instead of the render clock.
  const latestReadingAt = useMemo(() => {
    const timestamps = Object.values(readings).map((r) => new Date(r.timestamp).getTime())
    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null
  }, [readings])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Trigger data refetch (hooks will auto-refresh via subscriptions)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  return (
    <div className="bg-background">
      <div className="relative">
        <Header
          onlineCount={kpis.onlineStations}
          totalCount={kpis.totalStations}
          lastUpdated={latestReadingAt}
          systemHealth={systemHealth}
          onRefresh={handleRefresh}
        />

        <WeatherAdvisoryBanner
          sites={sites}
          readings={readings}
          alerts={alerts}
          isOpen={isNotificationCenterOpen}
          onOpenChange={setIsNotificationCenterOpen}
          desktopPortalTargetId="notification-center-desktop-slot"
          className="absolute right-20 top-1/2 z-[60] -translate-y-1/2 sm:right-24 md:right-32"
        />
      </div>

      <div className="flex">
        <SidebarNav currentPath={pathname} />

        <div className="flex min-w-0 flex-1 items-start">
          <main className="min-w-0 flex-1 space-y-8 px-4 py-6 transition-[width] duration-300 ease-out sm:px-6">
            <KpiRow kpis={kpis} overallAccuracyPct={overallAccuracy} loading={sitesLoading} />

            <div id="map" className="grid scroll-mt-24 grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <WindMonitoringPanel
                  sites={sites}
                  readings={readings}
                  loading={sitesLoading}
                  selectedSiteId={selectedSiteId}
                  onSelectSite={setSelectedSiteId}
                />
              </div>

              <div className="lg:col-span-2">
                <MelakasWindFarmMap sites={sites} readings={readings} onSiteClick={setSelectedSiteId} />
              </div>
            </div>

            <SiteMonitoringGrid sites={sites} readings={readings} loading={sitesLoading} />

            <PowerSystemHealthSection sites={sites} readings={readings} dailySummary={dailySummary} loading={sitesLoading} />

            <PerformanceAnalysisPanel sites={sites} onOverallAccuracyChange={handleOverallAccuracyChange} />

            <WeatherForecastWidget />
          </main>

          <div
            aria-hidden={!isNotificationCenterOpen}
            className={`hidden shrink-0 self-stretch overflow-hidden border-l border-surface-border/0 transition-[width,border-color] duration-300 ease-out lg:block ${
              isNotificationCenterOpen ? 'w-[420px] border-surface-border' : 'w-0'
            }`}
          >
            <div id="notification-center-desktop-slot" className="h-full w-[420px]" />
          </div>
        </div>
      </div>

      <Footer lastUpdated={latestReadingAt} />
    </div>
  )
}
