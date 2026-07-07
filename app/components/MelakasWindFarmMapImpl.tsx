'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { Fan } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import type { Site, Reading } from '../lib/supabase'
import { cardinalDirection, circularMeanDeg, formatTimeAgo } from '../lib/format'

export interface MelakasWindFarmMapImplProps {
  sites: Site[]
  readings: Record<string, Reading>
  onSiteClick?: (siteId: string) => void
}

const MELAKA_CENTER: [number, number] = [2.1926, 102.2381]
const INITIAL_ZOOM = 10
const METRICS_REFRESH_MS = 5000

type SiteStatus = 'healthy' | 'warning' | 'critical' | 'offline'

const STATUS_COLOR: Record<SiteStatus, string> = {
  healthy: '#22c55e',
  warning: '#facc15',
  critical: '#ef4444',
  offline: '#64748b',
}

const SENSOR_RING_COLOR = {
  reference: '#3b82f6',
  lowcost: '#a855f7',
} as const

const STATUS_LABEL: Record<SiteStatus, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
  offline: 'Offline',
}

function getSiteStatus(reading: Reading | null): SiteStatus {
  if (!reading) return 'offline'
  if (reading.battery_voltage < 3.5 || reading.signal_strength < -80) return 'critical'
  if (reading.battery_voltage < 3.8 || reading.signal_strength < -70) return 'warning'
  return 'healthy'
}

const MIN_DIAMETER = 24
const MAX_DIAMETER = 48
const MIN_OPACITY = 0.55
const MAX_ARROW_LENGTH = 30

function markerDiameter(windSpeedKmh: number): number {
  return Math.min(MAX_DIAMETER, Math.max(MIN_DIAMETER, MIN_DIAMETER + windSpeedKmh * 0.8))
}

function markerOpacity(windSpeedKmh: number): number {
  return Math.min(1, Math.max(MIN_OPACITY, MIN_OPACITY + windSpeedKmh / 40))
}

function arrowLengthFactor(windSpeedKmh: number): number {
  return Math.min(1, Math.max(0.25, windSpeedKmh / 25))
}

const TURBINE_ICON_HTML = renderToStaticMarkup(<Fan size={16} strokeWidth={2.25} color="#07111f" />)

function buildDivIcon(status: SiteStatus, isReference: boolean): L.DivIcon {
  const color = STATUS_COLOR[status]
  const ringColor = isReference ? SENSOR_RING_COLOR.reference : SENSOR_RING_COLOR.lowcost
  // Offline stations are deliberately still — a pulsing "dead" marker reads as noise, not signal.
  const pulseSpeed = status === 'critical' ? '1.2s' : status === 'warning' ? '1.8s' : '2.4s'
  const pulse =
    status !== 'offline'
      ? `<div class="wind-marker-pulse" style="background:${color};animation-duration:${pulseSpeed};"></div>`
      : ''
  return L.divIcon({
    html: `
      ${pulse}
      <div class="wind-marker-circle" style="background:${color};box-shadow:0 0 0 3px ${ringColor};">${TURBINE_ICON_HTML}</div>
      <div class="wind-marker-arrow"></div>
    `,
    className: 'wind-marker-wrapper',
    iconSize: [MAX_DIAMETER, MAX_DIAMETER],
    iconAnchor: [MAX_DIAMETER / 2, MAX_DIAMETER / 2],
  })
}

type IconKey = `${SiteStatus}-${'reference' | 'lowcost'}`
let cachedIcons: Partial<Record<IconKey, L.DivIcon>> = {}

function getDivIcon(status: SiteStatus, isReference: boolean): L.DivIcon {
  const key: IconKey = `${status}-${isReference ? 'reference' : 'lowcost'}`
  if (!cachedIcons[key]) {
    cachedIcons[key] = buildDivIcon(status, isReference)
  }
  return cachedIcons[key]!
}

function PopupField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-mono text-xs font-medium text-slate-200">{value}</p>
    </div>
  )
}

function SiteMarker({
  site,
  reading,
  onClick,
}: {
  site: Site
  reading: Reading | null
  onClick?: (siteId: string) => void
}) {
  const markerRef = useRef<L.Marker | null>(null)
  const status = getSiteStatus(reading)
  const windSpeed = reading?.wind_speed_kmh ?? 0
  const direction = reading?.wind_direction_deg ?? 0
  const icon = getDivIcon(status, site.is_reference)

  // Icon HTML is static per status; size/rotation are mutated directly on the
  // marker's DOM node so they can transition smoothly without Leaflet
  // recreating (and thus jump-cutting) the whole icon every update.
  useEffect(() => {
    const el = markerRef.current?.getElement()
    if (!el) return
    const circle = el.querySelector<HTMLDivElement>('.wind-marker-circle')
    const arrow = el.querySelector<HTMLDivElement>('.wind-marker-arrow')
    const diameter = markerDiameter(windSpeed)
    if (circle) {
      circle.style.width = `${diameter}px`
      circle.style.height = `${diameter}px`
      circle.style.opacity = `${markerOpacity(windSpeed)}`
    }
    if (arrow) {
      arrow.style.transform = `translateX(-50%) rotate(${direction}deg) scaleY(${arrowLengthFactor(windSpeed)})`
    }
  }, [windSpeed, direction, icon])

  return (
    <Marker
      position={[site.latitude, site.longitude]}
      icon={icon}
      ref={markerRef}
      eventHandlers={{ click: () => onClick?.(site.site_id) }}
    >
      <Tooltip direction="top" offset={[0, -MAX_DIAMETER / 2]}>
        <strong>{site.site_name}</strong> — {reading ? `${windSpeed.toFixed(1)} km/h` : 'Waiting for telemetry'}
      </Tooltip>
      <Popup className="wind-popup" minWidth={230}>
        <div className="min-w-[200px] text-sm">
          <div className="mb-2 flex items-start justify-between gap-3 border-b border-white/10 pb-2">
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Station</p>
              <p className="truncate font-semibold text-slate-100">{site.site_name}</p>
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                color: site.is_reference ? SENSOR_RING_COLOR.reference : SENSOR_RING_COLOR.lowcost,
                background: `${site.is_reference ? SENSOR_RING_COLOR.reference : SENSOR_RING_COLOR.lowcost}22`,
              }}
            >
              {site.is_reference ? 'Reference' : 'Low-Cost'}
            </span>
          </div>

          <div className="mb-2.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} />
            <span className="text-xs font-semibold" style={{ color: STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]}
            </span>
          </div>

          {reading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <PopupField label="Wind Speed" value={`${windSpeed.toFixed(1)} km/h`} />
              <PopupField label="Direction" value={`${Math.round(direction)}° ${cardinalDirection(direction)}`} />
              <PopupField label="Battery" value={`${reading.battery_voltage.toFixed(2)} V`} />
              <PopupField label="Signal" value={`${reading.signal_strength} dBm`} />
              {reading.temperature_c != null && <PopupField label="Temperature" value={`${reading.temperature_c.toFixed(1)}°C`} />}
              <PopupField label="Last Update" value={formatTimeAgo(reading.timestamp)} />
            </div>
          ) : (
            <p className="text-xs text-slate-500">Waiting for telemetry — device offline</p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

function LiveMetricsOverlay({ sites, readings }: { sites: Site[]; readings: Record<string, Reading> }) {
  const [, forceTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), METRICS_REFRESH_MS)
    return () => clearInterval(interval)
  }, [])

  const { avgWindSpeed, statusPct, dominantDirection } = useMemo(() => {
    const activeReadings = sites.map((site) => readings[site.site_id]).filter((r): r is Reading => Boolean(r))
    const avgSpeed = activeReadings.length
      ? activeReadings.reduce((sum, r) => sum + r.wind_speed_kmh, 0) / activeReadings.length
      : null
    const pct = sites.length ? Math.round((activeReadings.length / sites.length) * 100) : 0
    const direction = activeReadings.length ? circularMeanDeg(activeReadings.map((r) => r.wind_direction_deg)) : null
    return { avgWindSpeed: avgSpeed, statusPct: pct, dominantDirection: direction }
  }, [sites, readings])

  return (
    <div
      className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-6 rounded-lg border border-white/10 bg-black/60 px-6 py-3 backdrop-blur-sm sm:gap-10"
      style={{ zIndex: 1000 }}
    >
      <MetricColumn value={avgWindSpeed !== null ? avgWindSpeed.toFixed(1) : '—'} unit="km/h" label="Avg Wind Speed" />
      <MetricColumn value={statusPct} unit="%" label="Stations Reporting" />
      <MetricColumn
        value={dominantDirection !== null ? cardinalDirection(dominantDirection) : '—'}
        unit={dominantDirection !== null ? `${Math.round(dominantDirection)}°` : ''}
        label="Dominant Direction"
      />
    </div>
  )
}

function MetricColumn({ value, unit, label }: { value: number | string; unit: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="text-lg font-bold tabular-nums leading-none text-white">
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-white/60">{unit}</span>}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">{label}</span>
    </div>
  )
}

function Legend() {
  const statuses: SiteStatus[] = ['healthy', 'warning', 'critical', 'offline']
  return (
    <div
      className="absolute right-3 top-3 flex flex-col gap-2.5 rounded-lg border border-white/10 bg-black/70 px-3.5 py-3 backdrop-blur-sm"
      style={{ zIndex: 1000 }}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Status</p>
        {statuses.map((status) => (
          <div key={status} className="flex items-center gap-2 text-[11px] text-white/80">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
            {STATUS_LABEL[status]}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Sensor Type</p>
        <div className="flex items-center gap-2 text-[11px] text-white/80">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'transparent', boxShadow: `0 0 0 2px ${SENSOR_RING_COLOR.reference}` }} />
          Reference
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/80">
          <span className="h-2.5 w-2.5 rounded-full" style={{ boxShadow: `0 0 0 2px ${SENSOR_RING_COLOR.lowcost}` }} />
          Low-Cost
        </div>
      </div>
    </div>
  )
}

export default function MelakasWindFarmMapImpl({ sites, readings, onSiteClick }: MelakasWindFarmMapImplProps) {
  return (
    <div className="melaka-wind-map relative w-full overflow-hidden rounded-lg border border-surface-border bg-surface-card p-2">
      <div className="relative h-[450px] w-full overflow-hidden rounded-md">
        <MapContainer center={MELAKA_CENTER} zoom={INITIAL_ZOOM} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {sites.map((site) => (
            <SiteMarker key={site.site_id} site={site} reading={readings[site.site_id] ?? null} onClick={onSiteClick} />
          ))}
        </MapContainer>
        <Legend />
        <LiveMetricsOverlay sites={sites} readings={readings} />
      </div>
      <style>{`
        .wind-marker-wrapper {
          background: transparent;
          border: none;
        }
        .wind-marker-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: ${MIN_DIAMETER}px;
          height: ${MIN_DIAMETER}px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1), height 500ms cubic-bezier(0.4, 0, 0.2, 1),
            opacity 500ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .wind-marker-arrow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3px;
          height: ${MAX_ARROW_LENGTH}px;
          background: var(--color-wind, #00d4ff);
          transform-origin: top center;
          clip-path: polygon(50% 0%, 100% 25%, 65% 25%, 65% 100%, 35% 100%, 35% 25%, 0% 25%);
          transition: transform 700ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .wind-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          width: ${MIN_DIAMETER}px;
          height: ${MIN_DIAMETER}px;
          border-radius: 9999px;
          transform: translate(-50%, -50%);
          animation: pulseRing 2.2s var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1)) infinite;
          pointer-events: none;
        }
        .melaka-wind-map .leaflet-container {
          background: var(--color-surface-background, #07111f);
          font-family: inherit;
        }
        .melaka-wind-map .leaflet-popup-content-wrapper,
        .melaka-wind-map .leaflet-popup-tip {
          background: var(--color-surface-card, #132238);
          color: #e6edf5;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
        }
        .melaka-wind-map .leaflet-popup-content-wrapper {
          animation: fadeIn 220ms var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1));
          border-radius: 12px;
        }
        .melaka-wind-map .leaflet-popup-content {
          margin: 12px 14px;
          line-height: 1.4;
        }
        .melaka-wind-map .leaflet-popup-close-button {
          color: #94a3b8;
        }
        .melaka-wind-map .leaflet-tooltip {
          background: var(--color-surface-card, #132238);
          border: 1px solid var(--color-surface-border, #223349);
          color: #e6edf5;
        }
        .melaka-wind-map .leaflet-tooltip-top:before {
          border-top-color: var(--color-surface-border, #223349);
        }
        .melaka-wind-map .leaflet-control-zoom a {
          background: var(--color-surface-card, #132238);
          color: #e6edf5;
          border-color: var(--color-surface-border, #223349);
        }
        .melaka-wind-map .leaflet-control-zoom a:hover {
          background: var(--color-surface-border, #223349);
        }
      `}</style>
    </div>
  )
}
