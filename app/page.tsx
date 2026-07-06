'use client'

import { Loader2, AlertTriangle } from 'lucide-react'
import { useSites, useLatestReadings, useAlerts } from './lib/hooks'
import PremiumWindCard from './components/PremiumWindCard'
import AlertPanel from './components/AlertPanel'

export default function Home() {
  const { sites, loading: sitesLoading, error: sitesError } = useSites()
  const { readings, loading: readingsLoading, error: readingsError } = useLatestReadings()
  const { alerts, error: alertsError } = useAlerts()

  const loading = sitesLoading || readingsLoading
  const error = sitesError || readingsError || alertsError

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Wind Profile - Melaka State</h1>
        <p className="text-sm text-slate-500 mt-1">Live readings from the Melaka wind sensor network</p>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-5 flex items-start gap-3">
          <AlertTriangle className="text-red-400 shrink-0" size={24} />
          <div>
            <p className="font-medium text-slate-100">Unable to load data</p>
            <p className="text-sm text-slate-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      <AlertPanel alerts={alerts} />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          Loading sites...
        </div>
      ) : sites.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No sites configured</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <PremiumWindCard key={site.id} site={site} reading={readings[site.site_id]} />
          ))}
        </div>
      )}
    </div>
  )
}
