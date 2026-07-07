'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import SidebarNav from './components/SidebarNav'
import Header from './components/Header'
import AlertBanner from './components/AlertBanner'
import SiteDetailsCard from './components/SiteDetailsCard'
import MelakasWindFarmMap from './components/MelakasWindFarmMap'
import EnergyGenerationWidget from './components/EnergyGenerationWidget'
import WeatherForecastWidget from './components/WeatherForecastWidget'
import Footer from './components/Footer'
import { useSites, useLatestReadings, useAlerts } from './lib/hooks'
import type { Site } from './lib/supabase'

export default function Dashboard() {
  const pathname = usePathname()
  const { sites, loading: sitesLoading } = useSites()
  const { readings } = useLatestReadings()
  const { alerts } = useAlerts()
  const [selectedSite, setSelectedSite] = useState<Site | undefined>(undefined)
  const [, setIsRefreshing] = useState(false)

  const activeSite = selectedSite ?? sites[0]

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Trigger data refetch (hooks will auto-refresh via subscriptions)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 to-slate-900">
      {/* Sticky Header */}
      <Header
        siteCount={sites.length}
        efficiency={92.3}
        lastUpdated={new Date()}
        onRefresh={handleRefresh}
      />

      {/* Alert Banner (conditional) */}
      {alerts.length > 0 && (
        <AlertBanner
          alerts={alerts}
          onDismiss={() => {
            // Optional: handle dismiss
          }}
        />
      )}

      {/* Main Content with Sidebar */}
      <div className="flex flex-1">
        <SidebarNav currentPath={pathname} />

        {/* Main Content Area */}
        <div className="flex-1 space-y-6 px-4 py-6 sm:px-6">
          {/* Site Details Card + Map */}
          <div id="map" className="grid scroll-mt-24 grid-cols-1 gap-6 lg:grid-cols-5">
            {/* LEFT: Site Details (40%) */}
            <div className="lg:col-span-2">
              {sitesLoading ? (
                <SiteDetailsCard site={{} as Site} reading={null} isLoading />
              ) : activeSite ? (
                <SiteDetailsCard site={activeSite} reading={readings[activeSite.site_id] || null} />
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-surface-border bg-surface-card text-sm text-slate-500">
                  No sites configured
                </div>
              )}
            </div>

            {/* RIGHT: Map (60%) */}
            <div className="lg:col-span-3">
              <MelakasWindFarmMap
                sites={sites}
                readings={readings}
                onSiteClick={(siteId) => {
                  const site = sites.find((s) => s.site_id === siteId)
                  if (site) setSelectedSite(site)
                }}
              />
            </div>
          </div>

          {/* Full Width: Energy Generation */}
          <div id="energy">
            <EnergyGenerationWidget data={null} isLoading={false} />
          </div>

          {/* Full Width: Weather Forecast */}
          <WeatherForecastWidget />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
