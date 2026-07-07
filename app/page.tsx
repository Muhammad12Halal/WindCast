'use client'

import { useState } from 'react'
import Header from './components/Header'
import AlertBanner from './components/AlertBanner'
import SiteMonitorCard from './components/SiteMonitorCard'
import EnergyGenerationWidget from './components/EnergyGenerationWidget'
import MelakasWindFarmMap from './components/MelakasWindFarmMap'
import WeatherForecastWidget from './components/WeatherForecastWidget'
import Footer from './components/Footer'
import { useSites, useLatestReadings, useAlerts } from './lib/hooks'

export default function Dashboard() {
  // State
  const { sites, loading: sitesLoading } = useSites()
  const { readings } = useLatestReadings()
  const { alerts } = useAlerts()
  const [, setIsRefreshing] = useState(false)

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Trigger data refetch (hooks will auto-refresh via subscriptions)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  return (
    <div className="bg-gradient-to-br from-slate-950 to-slate-900 min-h-screen flex flex-col">
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

      {/* Main Content - Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* LEFT COLUMN: Site Monitor Cards (55% = 3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {sitesLoading ? (
            <div className="text-center py-20 text-slate-400">Loading sites...</div>
          ) : sites.length > 0 ? (
            sites.map((site) => (
              <SiteMonitorCard
                key={site.site_id}
                site={site}
                reading={readings[site.site_id] || null}
                isLoading={sitesLoading}
              />
            ))
          ) : (
            <div className="text-center py-20 text-slate-400">No sites configured</div>
          )}
        </div>

        {/* RIGHT COLUMN: Energy + Map (45% = 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Energy Generation Widget */}
          <EnergyGenerationWidget data={null} isLoading={false} />

          {/* Melaka Wind Farm Map */}
          <MelakasWindFarmMap
            sites={sites}
            readings={readings}
            onSiteClick={(siteId) => {
              console.log('Site clicked:', siteId)
            }}
          />
        </div>
      </div>

      {/* Full Width: Weather Forecast */}
      <div className="px-6 pb-6 max-w-7xl mx-auto w-full">
        <WeatherForecastWidget />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
