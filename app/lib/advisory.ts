/**
 * Weather Advisory & System Alert derivation.
 *
 * These are deliberately two separate concerns:
 *  - Weather Advisory: environmental conditions, derived ONLY from the
 *    Open-Meteo forecast. Never touches telemetry.
 *  - System Alerts: hardware/connectivity conditions (battery, signal,
 *    offline devices, backend-flagged issues), derived ONLY from live
 *    telemetry and the existing `alerts` table. Never touches weather.
 *
 * Every card is computed from real data only. Nothing is invented; if a data
 * source is unavailable, callers should show an explicit "unavailable" /
 * "no active advisory" state rather than a fabricated card.
 */

import type { ForecastPoint } from './weather'
import { cardinalDirection, circularMeanDeg, signalStatus } from './format'
import type { Alert, Reading, Site } from './supabase'

export type AdvisoryLevel = 'normal' | 'advisory' | 'watch' | 'warning' | 'emergency'

export const ADVISORY_LEVEL_LABEL: Record<AdvisoryLevel, string> = {
  normal: 'Normal',
  advisory: 'Advisory',
  watch: 'Watch',
  warning: 'Warning',
  emergency: 'Emergency',
}

// Simplified Beaufort-scale wind-speed bands (km/h). These only classify
// already-real Open-Meteo forecast values into a met-agency-style tier —
// the numbers displayed to the user always come from the forecast itself.
const WIND_THRESHOLDS: { level: AdvisoryLevel; minKmh: number }[] = [
  { level: 'emergency', minKmh: 62 },
  { level: 'warning', minKmh: 50 },
  { level: 'watch', minKmh: 35 },
  { level: 'advisory', minKmh: 20 },
  { level: 'normal', minKmh: 0 },
]

const ADVISORY_TITLE: Partial<Record<AdvisoryLevel, string>> = {
  advisory: 'Strong Wind Advisory',
  watch: 'Strong Wind Watch',
  warning: 'Gale Warning',
  emergency: 'Storm Emergency',
}

function windLevel(speedKmh: number): AdvisoryLevel {
  for (const t of WIND_THRESHOLDS) {
    if (speedKmh >= t.minKmh) return t.level
  }
  return 'normal'
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })
}

export interface WeatherAdvisoryCard {
  kind: 'weather'
  id: string
  level: AdvisoryLevel
  title: string
  description: string
  expectedCondition: string
  forecastWindSpeedRange: string
  windDirection: string
  expectedDuration: string
  affectedStations: string[]
  source: string
}

/** Finds the most severe wind tier in the forecast window and the contiguous hours it spans. Returns null if conditions stay normal throughout. */
export function deriveWeatherAdvisory(points: ForecastPoint[], affectedStations: string[]): WeatherAdvisoryCard | null {
  if (points.length === 0) return null

  let peakIndex = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i].windSpeed > points[peakIndex].windSpeed) peakIndex = i
  }
  const peakLevel = windLevel(points[peakIndex].windSpeed)
  if (peakLevel === 'normal') return null

  const threshold = WIND_THRESHOLDS.find((t) => t.level === peakLevel)!.minKmh
  let start = peakIndex
  let end = peakIndex
  while (start > 0 && points[start - 1].windSpeed >= threshold) start--
  while (end < points.length - 1 && points[end + 1].windSpeed >= threshold) end++

  const window = points.slice(start, end + 1)
  const minSpeed = Math.min(...window.map((p) => p.windSpeed))
  const maxSpeed = Math.max(...window.map((p) => p.windSpeed))
  const direction = circularMeanDeg(window.map((p) => p.windDirection))

  return {
    kind: 'weather',
    id: 'weather-forecast',
    level: peakLevel,
    title: ADVISORY_TITLE[peakLevel] ?? 'Wind Advisory',
    description: `Open-Meteo forecasts wind speeds up to ${maxSpeed.toFixed(0)} km/h across the Melaka network.`,
    expectedCondition: `${ADVISORY_LEVEL_LABEL[peakLevel]}-level wind conditions`,
    forecastWindSpeedRange: `${minSpeed.toFixed(0)}–${maxSpeed.toFixed(0)} km/h`,
    windDirection: `${cardinalDirection(direction)} (${Math.round(direction)}°)`,
    expectedDuration: `${formatHour(window[0].time)} – ${formatHour(window[window.length - 1].time)}`,
    affectedStations,
    source: 'Open-Meteo',
  }
}

export interface SystemAlertCard {
  kind: 'system'
  id: string
  level: AdvisoryLevel
  title: string
  description: string
  affectedStations: string[]
  source: string
  timestamp?: string
}

// Matches the critical thresholds used elsewhere (format.ts: batteryStatus() / signalStatus()).
const BATTERY_CRITICAL_V = 3.5

// Backend-flagged severities map onto engineering-operations tiers, not the
// weather-advisory scale: an engineer-raised WARNING is a heads-up (Advisory),
// while a CRITICAL fault is an active hardware Warning.
const BACKEND_SEVERITY_LEVEL: Record<Alert['severity'], AdvisoryLevel> = {
  WARNING: 'advisory',
  CRITICAL: 'warning',
}

/** Derives connectivity, battery, and signal alerts from live telemetry, plus wraps existing backend alerts in the same card shape. Hardware/connectivity only — never weather. */
export function deriveSystemAlerts(sites: Site[], readings: Record<string, Reading>, alerts: Alert[]): SystemAlertCard[] {
  const cards: SystemAlertCard[] = []

  const offlineSites = sites.filter((s) => !readings[s.site_id])
  if (offlineSites.length > 0 && sites.length > 0) {
    const ratio = offlineSites.length / sites.length
    const level: AdvisoryLevel = ratio >= 1 ? 'emergency' : ratio >= 0.5 ? 'warning' : 'watch'
    cards.push({
      kind: 'system',
      id: 'device-offline',
      level,
      title: 'Device Offline',
      description: `${offlineSites.length} of ${sites.length} station${sites.length === 1 ? '' : 's'} ${
        offlineSites.length === 1 ? 'has' : 'have'
      } not reported telemetry in the last hour.`,
      affectedStations: offlineSites.map((s) => s.site_name),
      source: 'Station Telemetry',
    })
  }

  const lowBatterySites = sites.filter((s) => {
    const r = readings[s.site_id]
    return r && r.battery_voltage < BATTERY_CRITICAL_V
  })
  if (lowBatterySites.length > 0) {
    cards.push({
      kind: 'system',
      id: 'battery-low',
      level: lowBatterySites.length > 1 ? 'warning' : 'advisory',
      title: 'Battery Low',
      description: `${lowBatterySites.length} station${lowBatterySites.length === 1 ? '' : 's'} reporting battery voltage below ${BATTERY_CRITICAL_V}V.`,
      affectedStations: lowBatterySites.map((s) => s.site_name),
      source: 'Battery Telemetry',
    })
  }

  // Reporting stations whose signal is so weak they're at risk of dropping
  // offline entirely — distinct from Device Offline (no reading at all).
  const weakSignalSites = sites.filter((s) => {
    const r = readings[s.site_id]
    return r && signalStatus(r.signal_strength) === 'critical'
  })
  if (weakSignalSites.length > 0) {
    cards.push({
      kind: 'system',
      id: 'signal-lost',
      level: weakSignalSites.length > 1 ? 'warning' : 'advisory',
      title: 'Signal Lost',
      description: `${weakSignalSites.length} station${weakSignalSites.length === 1 ? '' : 's'} reporting critically weak signal strength.`,
      affectedStations: weakSignalSites.map((s) => s.site_name),
      source: 'Signal Telemetry',
    })
  }

  for (const alert of alerts) {
    const site = sites.find((s) => s.site_id === alert.site_id)
    cards.push({
      kind: 'system',
      id: `db-alert-${alert.id}`,
      level: BACKEND_SEVERITY_LEVEL[alert.severity],
      title: alert.alert_type,
      description: alert.message,
      affectedStations: site ? [site.site_name] : [alert.site_id],
      source: 'Station Telemetry',
      timestamp: alert.created_at,
    })
  }

  return cards
}
