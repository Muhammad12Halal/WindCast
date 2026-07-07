'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { Fan } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import type { Site, Reading } from '../lib/supabase'

export interface MelakasWindFarmMapImplProps {
  sites: Site[]
  readings: Record<string, Reading>
  onSiteClick?: (siteId: string) => void
}

const MELAKA_CENTER: [number, number] = [2.1926, 102.2381]
const INITIAL_ZOOM = 10
const METRICS_REFRESH_MS = 5000

type SiteStatus = 'healthy' | 'warning' | 'critical'

const STATUS_COLOR: Record<SiteStatus, string> = {
  healthy: '#4ade80',
  warning: '#fbbf24',
  critical: '#f87171',
}

const STATUS_LABEL: Record<SiteStatus, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
}

function getSiteStatus(reading: Reading | null): SiteStatus {
  if (!reading) return 'critical'
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

const TURBINE_ICON_HTML = renderToStaticMarkup(<Fan size={16} strokeWidth={2.25} color="#0a0e27" />)

function buildDivIcon(status: SiteStatus): L.DivIcon {
  const color = STATUS_COLOR[status]
  return L.divIcon({
    html: `
      <div class="wind-marker-circle" style="background:${color};box-shadow:0 0 0 3px ${color}33;">${TURBINE_ICON_HTML}</div>
      <div class="wind-marker-arrow"></div>
    `,
    className: 'wind-marker-wrapper',
    iconSize: [MAX_DIAMETER, MAX_DIAMETER],
    iconAnchor: [MAX_DIAMETER / 2, MAX_DIAMETER / 2],
  })
}

let cachedIcons: Record<SiteStatus, L.DivIcon> | null = null

function getDivIcons(): Record<SiteStatus, L.DivIcon> {
  if (!cachedIcons) {
    cachedIcons = {
      healthy: buildDivIcon('healthy'),
      warning: buildDivIcon('warning'),
      critical: buildDivIcon('critical'),
    }
  }
  return cachedIcons
}

function cardinalDirection(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
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
  const icon = getDivIcons()[status]

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
        <strong>{site.site_name}</strong> — {reading ? `${windSpeed.toFixed(1)} km/h` : 'No data'}
      </Tooltip>
      <Popup className="wind-popup" minWidth={200}>
        <div className="text-sm">
          <p className="font-semibold text-slate-100">{site.site_name}</p>
          <p className="mb-2 text-xs text-slate-400">
            {site.sensor_type} · {site.is_reference ? 'Reference' : 'Low-Cost'}
          </p>
          {reading ? (
            <ul className="space-y-0.5 text-slate-300">
              <li>
                Status: <span style={{ color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</span>
              </li>
              <li>Wind speed: {windSpeed.toFixed(1)} km/h</li>
              <li>
                Direction: {Math.round(direction)}° ({cardinalDirection(direction)})
              </li>
              <li>Signal: {reading.signal_strength} dBm</li>
              <li>Battery: {reading.battery_voltage.toFixed(2)} V</li>
              <li>Updated: {new Date(reading.timestamp).toLocaleTimeString()}</li>
            </ul>
          ) : (
            <p className="text-slate-400">No recent data</p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

const EST_WATTS_PER_KMH = 12
const GRID_EMISSION_KG_PER_KWH = 0.585

function LiveMetricsOverlay({ sites, readings }: { sites: Site[]; readings: Record<string, Reading> }) {
  const [, forceTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), METRICS_REFRESH_MS)
    return () => clearInterval(interval)
  }, [])

  const { outputWh, statusPct, co2Kg } = useMemo(() => {
    const activeReadings = sites.map((site) => readings[site.site_id]).filter((r): r is Reading => Boolean(r))
    // Rough live-output proxy (not a metered daily total): sums an assumed
    // small-turbine watt-per-km/h yield across every site currently reporting.
    const totalWatts = activeReadings.reduce((sum, r) => sum + r.wind_speed_kmh * EST_WATTS_PER_KMH, 0)
    const pct = sites.length ? Math.round((activeReadings.length / sites.length) * 100) : 0
    const co2 = (totalWatts / 1000) * GRID_EMISSION_KG_PER_KWH
    return { outputWh: Math.round(totalWatts), statusPct: pct, co2Kg: Math.round(co2 * 10) / 10 }
  }, [sites, readings])

  return (
    <div
      className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-6 rounded-lg border border-white/10 bg-black/60 px-6 py-3 backdrop-blur-sm sm:gap-10"
      style={{ zIndex: 1000 }}
    >
      <MetricColumn value={outputWh} unit="Wh" label="Daily Output" />
      <MetricColumn value={statusPct} unit="%" label="Real-time Status" />
      <MetricColumn value={co2Kg} unit="kg" label="CO₂ Saved" />
    </div>
  )
}

function MetricColumn({ value, unit, label }: { value: number; unit: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="text-lg font-bold tabular-nums leading-none text-white">
        {value}
        <span className="ml-0.5 text-xs font-medium text-white/60">{unit}</span>
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">{label}</span>
    </div>
  )
}

function Legend() {
  const statuses: SiteStatus[] = ['healthy', 'warning', 'critical']
  return (
    <div
      className="absolute right-3 top-3 flex flex-col gap-1.5 rounded-lg border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-sm"
      style={{ zIndex: 1000 }}
    >
      {statuses.map((status) => (
        <div key={status} className="flex items-center gap-2 text-[11px] text-white/80">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
          {STATUS_LABEL[status]}
        </div>
      ))}
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
          background: var(--color-primary, #00d4ff);
          transform-origin: top center;
          clip-path: polygon(50% 0%, 100% 25%, 65% 25%, 65% 100%, 35% 100%, 35% 25%, 0% 25%);
          transition: transform 700ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .melaka-wind-map .leaflet-container {
          background: var(--color-surface-background, #0a0e27);
          font-family: inherit;
        }
        .melaka-wind-map .leaflet-popup-content-wrapper,
        .melaka-wind-map .leaflet-popup-tip {
          background: var(--color-surface-card, #1a2847);
          color: #f1f5f9;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
        }
        .melaka-wind-map .leaflet-popup-close-button {
          color: #94a3b8;
        }
        .melaka-wind-map .leaflet-tooltip {
          background: var(--color-surface-card, #1a2847);
          border: 1px solid var(--color-surface-border, #2d3f5b);
          color: #f1f5f9;
        }
        .melaka-wind-map .leaflet-tooltip-top:before {
          border-top-color: var(--color-surface-border, #2d3f5b);
        }
        .melaka-wind-map .leaflet-control-zoom a {
          background: var(--color-surface-card, #1a2847);
          color: #f1f5f9;
          border-color: var(--color-surface-border, #2d3f5b);
        }
        .melaka-wind-map .leaflet-control-zoom a:hover {
          background: var(--color-surface-border, #2d3f5b);
        }
      `}</style>
    </div>
  )
}
