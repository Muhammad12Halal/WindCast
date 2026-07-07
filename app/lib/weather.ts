/** Shared Open-Meteo forecast fetch/cache, used by the forecast widget and the weather advisory banner. */

import { useEffect, useState } from 'react'
import axios from 'axios'

export interface ForecastPoint {
  hourOffset: number
  time: string
  windSpeed: number
  windDirection: number
  cloudCover: number
  precipitation: number
  temperature: number
  humidity: number
}

export interface ForecastSummary {
  points: ForecastPoint[]
  now: ForecastPoint
  avgCloudCover: number
  totalPrecipitation: number
}

const CACHE_TTL_MS = 30 * 60 * 1000
const REFRESH_INTERVAL_MS = 30 * 60 * 1000
const FORECAST_HOURS = 24

const forecastCache = new Map<string, { data: ForecastSummary; fetchedAt: number }>()

function cacheKey(latitude: number, longitude: number, timezone: string): string {
  return `${latitude},${longitude},${timezone}`
}

function summarize(hourly: {
  time: string[]
  wind_speed_10m: number[]
  wind_direction_10m: number[]
  cloud_cover: number[]
  precipitation: number[]
  temperature_2m: number[]
  relative_humidity_2m: number[]
}): ForecastSummary {
  const now = Date.now()
  const startIndex = Math.max(0, hourly.time.findIndex((time) => new Date(time).getTime() > now) - 1)

  const points: ForecastPoint[] = []
  for (let i = 0; i < FORECAST_HOURS; i++) {
    const index = startIndex + i
    if (index >= hourly.time.length) break
    points.push({
      hourOffset: i,
      time: hourly.time[index],
      windSpeed: hourly.wind_speed_10m[index] ?? 0,
      windDirection: hourly.wind_direction_10m[index] ?? 0,
      cloudCover: hourly.cloud_cover[index] ?? 0,
      precipitation: hourly.precipitation[index] ?? 0,
      temperature: hourly.temperature_2m[index] ?? 0,
      humidity: hourly.relative_humidity_2m[index] ?? 0,
    })
  }

  const avgCloudCover = points.reduce((sum, p) => sum + p.cloudCover, 0) / (points.length || 1)
  const totalPrecipitation = points.reduce((sum, p) => sum + p.precipitation, 0)

  return { points, now: points[0], avgCloudCover, totalPrecipitation }
}

export interface UseWeatherForecastResult {
  forecast: ForecastSummary | null
  loading: boolean
  error: string | null
  lastUpdated: number | null
}

/** Fetches (and shares a 30-minute in-memory cache of) the Open-Meteo hourly forecast for a location. */
export function useWeatherForecast(
  latitude: number,
  longitude: number,
  timezone: string,
): UseWeatherForecastResult {
  const [forecast, setForecast] = useState<ForecastSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const key = cacheKey(latitude, longitude, timezone)

    const fetchForecast = async () => {
      const cached = forecastCache.get(key)
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setForecast(cached.data)
        setLastUpdated(cached.fetchedAt)
        setError(null)
        setLoading(false)
        return
      }

      try {
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude,
            longitude,
            hourly: 'wind_speed_10m,wind_direction_10m,cloud_cover,precipitation,temperature_2m,relative_humidity_2m',
            timezone,
          },
        })

        const summary = summarize(response.data.hourly)

        if (cancelled) return
        const fetchedAt = Date.now()
        forecastCache.set(key, { data: summary, fetchedAt })
        setForecast(summary)
        setLastUpdated(fetchedAt)
        setError(null)
      } catch {
        if (cancelled) return
        setError('Forecast unavailable')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchForecast()
    const interval = setInterval(fetchForecast, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [latitude, longitude, timezone])

  return { forecast, loading, error, lastUpdated }
}
