import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.'
    : null

export const isSupabaseConfigured = supabaseConfigError === null

if (supabaseConfigError && typeof window === 'undefined') {
  console.error(`[supabase] ${supabaseConfigError}`)
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null

const POSTGRES_PERMISSION_DENIED = '42501'

// Formats a Postgrest error for display/logging, and calls out RLS (42501)
export function describeQueryError(table: string, error: PostgrestError): string {
  if (error.code === POSTGRES_PERMISSION_DENIED) {
    const message =
      `Row Level Security is blocking anon reads on "${table}" (permission denied, code 42501). ` +
      `Run "npm run rls:check" (see scripts/fix-rls.mjs) to diagnose, or "npm run rls:apply" to add a read-only policy for anon.`
    console.error(`[supabase] ${table}:`, message, error)
    return message
  }

  console.error(`[supabase] query on "${table}" failed:`, error)
  return error.message
}

// ============================================
// TYPES (Match new SQL schema)
// ============================================

export interface Site {
  id: number
  site_id: string
  site_name: string
  sensor_type: 'professional' | 'lowcost'
  is_reference: boolean
  is_active: boolean
  latitude: number
  longitude: number
  description?: string
  installed_at?: string
  created_at: string
  updated_at: string
}

export interface Reading {
  id: number
  site_id: string
  timestamp: string
  
  // Wind
  wind_speed_kmh?: number | null
  wind_direction_deg?: number | null
  wind_gust_kmh?: number | null
  
  // Environment
  temperature_c?: number | null
  humidity_percent?: number | null
  pressure_hpa?: number | null
  
  // Power (Battery & Solar)
  battery_voltage?: number | null
  battery_percentage?: number | null
  solar_voltage?: number | null
  solar_current?: number | null
  solar_power_w?: number | null
  charging_status?: 'charging' | 'discharging' | 'idle' | null
  
  // Communication & Status
  signal_rssi?: number | null
  network_type?: string | null
  device_status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR'
  firmware_version?: string | null
  
  created_at: string
}

export interface Alert {
  id: number
  site_id: string
  alert_type: 'HIGH_WIND' | 'LOW_BATTERY' | 'SIGNAL_LOSS' | 'OFFLINE' | 'ERROR'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  source: 'Telemetry' | 'Forecast' | 'Backend' | 'Manual'
  message: string
  threshold_value?: number | null
  actual_value?: number | null
  is_resolved: boolean
  created_at: string
  resolved_at?: string | null
}

export interface ReferenceReading {
  id: number
  site_id: string
  timestamp: string
  wind_speed_kmh?: number | null
  wind_direction_deg?: number | null
  wind_gust_kmh?: number | null
  temperature_c?: number | null
  humidity_percent?: number | null
  pressure_hpa?: number | null
  created_at: string
}

export interface PerformanceAnalysis {
  id: number
  reference_site_id: string
  lowcost_site_id: string
  analysis_date: string
  matched_points: number
  rmse: number
  mae: number
  bias: number
  correlation: number
  accuracy_percent: number
  created_at: string
}

export interface DailySummary {
  id: number
  site_id: string
  summary_date: string
  
  // Wind metrics
  avg_wind_speed_kmh?: number | null
  max_wind_speed_kmh?: number | null
  min_wind_speed_kmh?: number | null
  dominant_wind_direction_deg?: number | null
  
  // Temperature & Humidity
  avg_temperature_c?: number | null
  avg_humidity_percent?: number | null
  
  // Availability & Uptime
  availability_percent?: number | null
  uptime_minutes?: number | null
  data_points?: number | null
  alerts_count?: number | null
  
  // Energy (Future-ready for solar integration)
  solar_energy_generated_wh?: number | null
  wind_energy_generated_wh?: number | null
  total_energy_generated_wh?: number | null
  
  created_at: string
  updated_at: string
}