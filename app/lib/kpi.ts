import type { DailySummary, Reading, Site } from './supabase'
import { circularMeanDeg } from './format'

export interface GlobalKpis {
  avgWindSpeedKmh: number | null
  dominantDirectionDeg: number | null
  onlineStations: number
  totalStations: number
  batteryHealthPct: number | null
  /** Wh — from a real daily summary aggregation, or null if that table/row isn't available yet. */
  energyTodayWh: number | null
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
      ? activeReadings.reduce((sum, r) => sum + (r.wind_speed_kmh ?? 0), 0) / activeReadings.length
      : null

  const dominantDirectionDeg =
    activeReadings.length > 0 ? circularMeanDeg(activeReadings.map((r) => r.wind_direction_deg)) : null

  const batteryHealthPct =
    activeReadings.length > 0
      ? (activeReadings.filter((r) => (r.battery_voltage ?? 0) >= BATTERY_HEALTHY_MIN_V).length / activeReadings.length) * 100
      : null

  return {
    avgWindSpeedKmh,
    dominantDirectionDeg,
    onlineStations: activeReadings.length,
    totalStations: sites.length,
    batteryHealthPct,
    energyTodayWh: dailySummary?.total_energy_generated_wh ?? null,
  }
}
