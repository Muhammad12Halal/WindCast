import { useState, useEffect } from 'react'
import { supabase, supabaseConfigError, describeQueryError, Reading, Alert, Site } from './supabase'

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

export function useLatestReadings() {
  const [readings, setReadings] = useState<Record<string, Reading>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(supabaseConfigError)

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
        .gte('timestamp', new Date(Date.now() - 5 * 60000).toISOString())
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

    const interval = setInterval(fetchLatest, 10000)
    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return { readings, loading, error }
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
