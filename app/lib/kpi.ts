import type { DailySummary, Reading, Site } from './supabase'
import { circularMeanDeg, EST_WATTS_PER_KMH } from './format'

export interface GlobalKpis {
  avgWindSpeedKmh: number | null
  dominantDirectionDeg: number | null
  onlineStations: number
  totalStations: number
  batteryHealthPct: number | null
  /** Wh — from a real daily summary if available, otherwise null (caller falls back to a live estimate). */
  energyTodayWh: number | null
  /** Rough instantaneous output estimate (W) derived from live wind speed, for use when no daily summary exists. */
  liveOutputW: number
}

const BATTERY_HEALTHY_MIN_V = 3.5

export function computeGlobalKpis(
  sites: Site[],
  readings: Record<string, Reading>,
  dailySummary?: DailySummary | null,
): GlobalKpis {
  const activeReadings = sites.map((s) => readings[s.site_id]).filter((r): r is Reading => Boolean(r))

  const avgWindSpeedKmh =
    activeReadings.length > 0
      ? activeReadings.reduce((sum, r) => sum + r.wind_speed_kmh, 0) / activeReadings.length
      : null

  const dominantDirectionDeg =
    activeReadings.length > 0 ? circularMeanDeg(activeReadings.map((r) => r.wind_direction_deg)) : null

  const batteryHealthPct =
    activeReadings.length > 0
      ? (activeReadings.filter((r) => r.battery_voltage >= BATTERY_HEALTHY_MIN_V).length / activeReadings.length) * 100
      : null

  const liveOutputW = activeReadings.reduce((sum, r) => sum + r.wind_speed_kmh * EST_WATTS_PER_KMH, 0)

  return {
    avgWindSpeedKmh,
    dominantDirectionDeg,
    onlineStations: activeReadings.length,
    totalStations: sites.length,
    batteryHealthPct,
    energyTodayWh: dailySummary?.total_generation_wh ?? null,
    liveOutputW,
  }
}
