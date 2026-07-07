import { useState, useEffect, useRef } from 'react'
import { supabase, supabaseConfigError, describeQueryError, Reading, Alert, Site, DailySummary } from './supabase'

const COUNT_UP_MS = 800

/** Eases a displayed number up (or down) toward `target` whenever it changes. */
export function useCountUp(target: number, durationMs: number = COUNT_UP_MS): number {
  const [value, setValue] = useState(target)
  const previous = useRef(target)

  useEffect(() => {
    const from = previous.current
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (target - from) * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else previous.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}

export function useSites() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(supabaseConfigError)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }

    const fetchSites = async () => {
      const { data, error } = await client.from('sites').select('*')
      if (error) setError(describeQueryError('sites', error))
      setSites(data || [])
      setLoading(false)
    }

    fetchSites()
    const subscription = client
      .channel('sites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sites' }, () => {
        fetchSites()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { sites, loading, error }
}

// Ingestion has been observed to lag by up to ~30-60min between batches, so a
// 5min freshness window was hiding valid readings behind "No recent data".
const READING_FRESHNESS_MINUTES = 60

/** Polling cadence for `useLatestReadings` — also surfaced in the footer's "Refresh Interval" stat. */
export const READINGS_POLL_INTERVAL_MS = 10000

export function useLatestReadings() {
  const [readings, setReadings] = useState<Record<string, Reading>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(supabaseConfigError)
  // Timestamp of the last successful fetch — surfaced in the footer's "Last Refresh" stat.
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }

    const fetchLatest = async () => {
      const { data, error } = await client
        .from('readings')
        .select('*')
        .gte('timestamp', new Date(Date.now() - READING_FRESHNESS_MINUTES * 60000).toISOString())
        .order('timestamp', { ascending: false })

      if (error) setError(describeQueryError('readings', error))

      if (data) {
        const latest: Record<string, Reading> = {}
        data.forEach(reading => {
          if (!latest[reading.site_id]) {
            latest[reading.site_id] = reading
          }
        })
        setReadings(latest)
        setLastUpdated(new Date())
      }
      setLoading(false)
    }

    fetchLatest()
    const subscription = client
      .channel('readings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'readings' }, () => {
        fetchLatest()
      })
      .subscribe()

    const interval = setInterval(fetchLatest, READINGS_POLL_INTERVAL_MS)
    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return { readings, loading, error, lastUpdated }
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [error, setError] = useState<string | null>(supabaseConfigError)

  useEffect(() => {
    const client = supabase
    if (!client) {
      return
    }

    const fetchAlerts = async () => {
      const { data, error } = await client
        .from('alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })

      if (error) setError(describeQueryError('alerts', error))
      setAlerts(data || [])
    }

    fetchAlerts()
    const subscription = client
      .channel('alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchAlerts()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { alerts, error }
}

export function useReadingHistory(siteId: string, hours: number = 24) {
  const [data, setData] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(supabaseConfigError)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }

    if (!siteId) {
      setData([])
      setLoading(false)
      return
    }

    const fetchHistory = async () => {
      setLoading(true)
      const since = new Date(Date.now() - hours * 60 * 60000).toISOString()
      const { data, error } = await client
        .from('readings')
        .select('*')
        .eq('site_id', siteId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: true })

      if (error) setError(describeQueryError('readings', error))
      setData(data || [])
      setLoading(false)
    }

    fetchHistory()
  }, [siteId, hours])

  return { data, loading, error }
}

/** Readings across every site within the last `hours`, used for cross-site sensor-accuracy analysis. */
export function useReadingsSince(hours: number) {
  const [data, setData] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(supabaseConfigError)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }

    let cancelled = false
    const fetchReadings = async () => {
      setLoading(true)
      const since = new Date(Date.now() - hours * 60 * 60000).toISOString()
      const { data, error } = await client
        .from('readings')
        .select('*')
        .gte('timestamp', since)
        .order('timestamp', { ascending: true })

      if (cancelled) return
      if (error) setError(describeQueryError('readings', error))
      setData(data || [])
      setLoading(false)
    }

    fetchReadings()
    const interval = setInterval(fetchReadings, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [hours])

  return { data, loading, error }
}

// Table is optional — not every deployment has aggregated daily summaries yet.
// A missing table degrades to `data: null` rather than surfacing as an error.
const MISSING_TABLE = '42P01'

export function useDailySummary() {
  const [data, setData] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }

    const fetchSummary = async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await client
        .from('daily_summary')
        .select('*')
        .eq('date', today)
        .maybeSingle()

      if (error && error.code !== MISSING_TABLE) {
        describeQueryError('daily_summary', error)
      }
      setData(error ? null : data)
      setLoading(false)
    }

    fetchSummary()
    const interval = setInterval(fetchSummary, 5 * 60000)
    return () => clearInterval(interval)
  }, [])

  return { data, loading }
}
