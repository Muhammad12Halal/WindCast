'use client'

import { Component, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import type { Site, Reading } from '../lib/supabase'

export interface MelakasWindFarmMapProps {
  sites: Site[]
  readings: Record<string, Reading>
  onSiteClick?: (siteId: string) => void
}

// Leaflet touches `window` as soon as it's imported, so the real
// implementation is loaded client-side only.
const MelakasWindFarmMapImpl = dynamic(() => import('./MelakasWindFarmMapImpl'), {
  ssr: false,
  loading: () => <MapPlaceholder label="Loading map..." />,
})

function MapPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-[450px] w-full animate-pulse items-center justify-center rounded-lg border border-surface-border bg-surface-card text-sm text-slate-500">
      {label}
    </div>
  )
}

interface MapErrorBoundaryProps {
  sites: Site[]
  children: ReactNode
}

interface MapErrorBoundaryState {
  hasError: boolean
}

class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[MelakasWindFarmMap] failed to render map:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[450px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-card p-6 text-center">
          <MapPin size={20} className="text-red-400" />
          <p className="font-medium text-slate-300">Map failed to load</p>
          <ul className="text-xs text-slate-500">
            {this.props.sites.map((site) => (
              <li key={site.site_id}>
                {site.site_name}: {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
              </li>
            ))}
          </ul>
        </div>
      )
    }
    return this.props.children
  }
}

export default function MelakasWindFarmMap({ sites, readings, onSiteClick }: MelakasWindFarmMapProps) {
  return (
    <MapErrorBoundary sites={sites}>
      <MelakasWindFarmMapImpl sites={sites} readings={readings} onSiteClick={onSiteClick} />
    </MapErrorBoundary>
  )
}
