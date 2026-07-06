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
// specifically since "permission denied for table x" is otherwise cryptic.
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

export interface Site {
  id: number
  site_id: string
  site_name: string
  latitude: number
  longitude: number
  sensor_type: string
  is_reference: boolean
}

export interface Reading {
  id: number
  site_id: string
  timestamp: string
  wind_speed_kmh: number
  wind_direction_deg: number
  signal_strength: number
  battery_voltage: number
}

export interface Alert {
  id: number
  site_id: string
  alert_type: string
  severity: 'WARNING' | 'CRITICAL'
  message: string
  created_at: string
  resolved_at?: string
}