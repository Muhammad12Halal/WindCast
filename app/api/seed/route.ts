/**
 * Dev/test-only endpoint: generates fresh synthetic readings so the dashboard
 * has live-looking data within its 60-minute freshness window without
 * waiting on real telemetry. GET http://localhost:3000/api/seed
 *
 * Old rows are intentionally left in place rather than deleted: the anon key
 * (the only credential available to this route) has RLS-restricted INSERT
 * only on `readings` — DELETE/UPDATE return 42501. Since every hook that
 * reads `readings` (useLatestReadings, useReadingHistory, etc.) filters to
 * the last 60 minutes and keeps only the newest row per site, older rows
 * simply age out of relevance once these fresh ones land.
 */

import { NextResponse } from 'next/server'
import { supabase, supabaseConfigError, describeQueryError } from '../../lib/supabase'

export const dynamic = 'force-dynamic'

type ChargingStatus = 'charging' | 'discharging' | 'idle'
type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR'

interface SeedReading {
  site_id: string
  timestamp: string
  wind_speed_kmh: number
  wind_direction_deg: number
  wind_gust_kmh: number
  temperature_c: number
  humidity_percent: number
  pressure_hpa: number
  battery_voltage: number
  battery_percentage: number
  solar_voltage: number
  solar_current: number
  solar_power_w: number
  charging_status: ChargingStatus
  signal_rssi: number
  network_type: string
  device_status: DeviceStatus
  firmware_version: string
}

interface SiteProfile {
  siteId: string
  windCenterKmh: number
  windSpreadKmh: number
  directionCenterDeg: number
  directionSpreadDeg: number
  batteryCenterV: number
  batterySpreadV: number
  signalCenterDbm: number
  signalSpreadDbm: number
  offlineChance: number
  chargingOptions: ChargingStatus[]
  firmwareVersion: string
}

const READINGS_PER_SITE = 60
const INTERVAL_MINUTES = 1

const SITE_PROFILES: SiteProfile[] = [
  {
    siteId: 'site_melaka_01',
    windCenterKmh: 12,
    windSpreadKmh: 6,
    directionCenterDeg: 270,
    directionSpreadDeg: 30,
    batteryCenterV: 4.1,
    batterySpreadV: 0.1,
    signalCenterDbm: -70,
    signalSpreadDbm: 10,
    offlineChance: 0,
    chargingOptions: ['charging'],
    firmwareVersion: 'v2.1.3',
  },
  {
    siteId: 'site_melaka_02',
    windCenterKmh: 11,
    windSpreadKmh: 5,
    directionCenterDeg: 265,
    directionSpreadDeg: 40,
    batteryCenterV: 3.9,
    batterySpreadV: 0.15,
    signalCenterDbm: -80,
    signalSpreadDbm: 10,
    offlineChance: 0.05,
    chargingOptions: ['charging'],
    firmwareVersion: 'v2.0.8',
  },
  {
    siteId: 'site_melaka_03',
    windCenterKmh: 10,
    windSpreadKmh: 4,
    directionCenterDeg: 260,
    directionSpreadDeg: 35,
    batteryCenterV: 3.65,
    batterySpreadV: 0.2,
    signalCenterDbm: -90,
    signalSpreadDbm: 10,
    offlineChance: 0.1,
    chargingOptions: ['idle', 'charging'],
    firmwareVersion: 'v2.0.5',
  },
]

function round2(value: number): number {
  return parseFloat(value.toFixed(2))
}

/** Uniform random value in [center - spread, center + spread]. */
function jitter(center: number, spread: number): number {
  return center + (Math.random() * 2 - 1) * spread
}

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function pickOne<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)]
}

function buildReadingsForSite(profile: SiteProfile): SeedReading[] {
  const readings: SeedReading[] = []

  for (let i = 0; i < READINGS_PER_SITE; i++) {
    const timestamp = new Date(Date.now() - i * INTERVAL_MINUTES * 60 * 1000).toISOString()

    // Sinusoidal base + light noise for a realistic-looking wind trace.
    const phase = (i / READINGS_PER_SITE) * Math.PI * 2
    const windSpeed = Math.max(0, profile.windCenterKmh + Math.sin(phase) * profile.windSpreadKmh * 0.6 + jitter(0, profile.windSpreadKmh * 0.4))
    const windDirection = normalizeDegrees(jitter(profile.directionCenterDeg, profile.directionSpreadDeg))
    const windGust = windSpeed + Math.random() * 4

    const batteryVoltage = Math.max(3, jitter(profile.batteryCenterV, profile.batterySpreadV))
    const batteryPercentage = Math.min(100, Math.max(0, (batteryVoltage / 5) * 100))
    const signalRssi = Math.round(jitter(profile.signalCenterDbm, profile.signalSpreadDbm))

    const solarPowerW = jitter(5.5, 2.5)
    const solarVoltage = jitter(4.5, 0.5)
    const solarCurrent = solarVoltage > 0 ? solarPowerW / solarVoltage : 0

    const isOffline = Math.random() < profile.offlineChance
    const deviceStatus: DeviceStatus = isOffline ? 'OFFLINE' : 'ONLINE'

    readings.push({
      site_id: profile.siteId,
      timestamp,
      wind_speed_kmh: round2(windSpeed),
      wind_direction_deg: round2(windDirection),
      wind_gust_kmh: round2(windGust),
      temperature_c: round2(jitter(27.5, 0.5)),
      humidity_percent: round2(jitter(70, 2)),
      pressure_hpa: round2(jitter(1011.5, 0.5)),
      battery_voltage: round2(batteryVoltage),
      battery_percentage: round2(batteryPercentage),
      solar_voltage: round2(solarVoltage),
      solar_current: round2(solarCurrent),
      solar_power_w: round2(solarPowerW),
      charging_status: pickOne(profile.chargingOptions),
      signal_rssi: signalRssi,
      network_type: 'LTE',
      device_status: deviceStatus,
      firmware_version: profile.firmwareVersion,
    })
  }

  return readings
}

export async function GET() {
  if (supabaseConfigError || !supabase) {
    return NextResponse.json({ error: supabaseConfigError ?? 'Supabase is not configured.' }, { status: 500 })
  }

  try {
    const readings = SITE_PROFILES.flatMap(buildReadingsForSite)

    const { error } = await supabase.from('readings').insert(readings)

    if (error) {
      const message = describeQueryError('readings', error)
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: readings.length,
      message: `Inserted ${readings.length} fresh readings across ${SITE_PROFILES.length} sites, timestamped within the last ${READINGS_PER_SITE} minutes.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error while seeding readings.'
    console.error('[api/seed] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
