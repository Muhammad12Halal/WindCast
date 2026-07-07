'use client'

import { Radio } from 'lucide-react'
import type { Reading, Site } from '../lib/supabase'
import SiteMonitorCard from './SiteMonitorCard'

export interface SiteMonitoringGridProps {
  sites: Site[]
  readings: Record<string, Reading>
  loading?: boolean
}

export default function SiteMonitoringGrid({ sites, readings, loading = false }: SiteMonitoringGridProps) {
  return (
    <section id="sites" className="scroll-mt-24">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-100">Site Monitoring</h2>
          <p className="mt-0.5 text-xs text-slate-500">Full telemetry per station across the sensor network</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card px-3 py-1.5 text-xs text-slate-400">
          <Radio size={12} className="text-healthy" />
          {sites.filter((s) => readings[s.site_id]).length}/{sites.length} reporting
        </div>
      </div>

      {sites.length === 0 && !loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-surface-border bg-surface-card text-sm text-slate-500">
          No stations configured
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <SiteMonitorCard key={i} site={{} as Site} reading={null} isLoading />
              ))
            : sites.map((site) => (
                <SiteMonitorCard key={site.site_id} site={site} reading={readings[site.site_id] ?? null} />
              ))}
        </div>
      )}
    </section>
  )
}
