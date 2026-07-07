'use client'

import { useCallback, useState } from 'react'
import { usePathname } from 'next/navigation'
import SidebarNav from './components/SidebarNav'
import Header from './components/Header'
import AlertBanner from './components/AlertBanner'
import KpiRow from './components/KpiRow'
import WindMonitoringPanel from './components/WindMonitoringPanel'
import MelakasWindFarmMap from './components/MelakasWindFarmMap'
import SiteMonitoringGrid from './components/SiteMonitoringGrid'
import SolarMonitoringSection from './components/SolarMonitoringSection'
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

  const handleOverallAccuracyChange = useCallback((pct: number | null) => setOverallAccuracy(pct), [])

  const kpis = computeGlobalKpis(sites, readings, dailySummary)
  const systemHealth = deriveSystemHealth(kpis.onlineStations, kpis.totalStations, kpis.batteryHealthPct)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Trigger data refetch (hooks will auto-refresh via subscriptions)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        onlineCount={kpis.onlineStations}
        totalCount={kpis.totalStations}
        lastUpdated={new Date()}
        systemHealth={systemHealth}
        onRefresh={handleRefresh}
      />

      {alerts.length > 0 && (
        <AlertBanner
          alerts={alerts}
          onDismiss={() => {
            // Optional: handle dismiss
          }}
        />
      )}

      <div className="flex flex-1">
        <SidebarNav currentPath={pathname} />

        <div className="flex-1 space-y-8 px-4 py-6 sm:px-6">
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

          <SolarMonitoringSection sites={sites} readings={readings} dailySummary={dailySummary} loading={sitesLoading} />

          <PerformanceAnalysisPanel sites={sites} onOverallAccuracyChange={handleOverallAccuracyChange} />

          <WeatherForecastWidget />
        </div>
      </div>

      <Footer />
    </div>
  )
}
