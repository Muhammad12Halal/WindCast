'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import GlassmorphicCard from './ui/GlassmorphicCard'

interface WeatherForecastWidgetProps {
  latitude?: number
  longitude?: number
  timezone?: string
}

interface ForecastPoint {
  hourOffset: number
  label: string
  time: string
  windSpeed: number
  windDirection: number
  cloudCover: number
  precipitation: number
}

interface ForecastSummary {
  points: ForecastPoint[]
  avgCloudCover: number
  totalPrecipitation: number
  bestHour: ForecastPoint
  confidence: number
}

const CACHE_TTL_MS = 30 * 60 * 1000
const REFRESH_INTERVAL_MS = 30 * 60 * 1000
const AGE_TICK_MS = 30 * 1000
const FORECAST_HOURS = 24
const MAX_SPEED_KMH = 30

const forecastCache = new Map<string, { data: ForecastSummary; fetchedAt: number }>()

function cacheKey(latitude: number, longitude: number, timezone: string): string {
  return `${latitude},${longitude},${timezone}`
}

function summarize(times: string[], windSpeed: number[], windDirection: number[], cloudCover: number[], precipitation: number[]): ForecastSummary {
  const now = Date.now()
  const startIndex = Math.max(
    0,
    times.findIndex((time) => new Date(time).getTime() > now) - 1,
  )

  const points: ForecastPoint[] = []
  for (let i = 0; i < FORECAST_HOURS; i++) {
    const index = startIndex + i
    if (index >= times.length) break
    points.push({
      hourOffset: i,
      label: i === 0 ? 'Now' : i % 3 === 0 ? `${i}h` : '',
      time: times[index],
      windSpeed: windSpeed[index] ?? 0,
      windDirection: windDirection[index] ?? 0,
      cloudCover: cloudCover[index] ?? 0,
      precipitation: precipitation[index] ?? 0,
    })
  }

  const avgCloudCover = points.reduce((sum, p) => sum + p.cloudCover, 0) / (points.length || 1)
  const totalPrecipitation = points.reduce((sum, p) => sum + p.precipitation, 0)
  const bestHour = points.reduce((best, p) => (p.windSpeed > best.windSpeed ? p : best), points[0])

  const meanSpeed = points.reduce((sum, p) => sum + p.windSpeed, 0) / (points.length || 1)
  const variance = points.reduce((sum, p) => sum + (p.windSpeed - meanSpeed) ** 2, 0) / (points.length || 1)
  const coefficientOfVariation = meanSpeed > 0 ? Math.sqrt(variance) / meanSpeed : 0
  const confidence = Math.round(Math.min(99, Math.max(60, 100 - coefficientOfVariation * 100)))

  return { points, avgCloudCover, totalPrecipitation, bestHour, confidence }
}

function formatHourLabel(time: string): string {
  return new Date(time).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
}

function formatAgo(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 min ago'
  return `${minutes} min ago`
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ForecastPoint }> }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-slate-200">{formatHourLabel(point.time)}</p>
      <p className="mt-1 text-primary">{point.windSpeed.toFixed(1)} km/h wind</p>
      <p className="text-slate-400">Cloud cover {Math.round(point.cloudCover)}%</p>
      <p className="text-slate-400">Precipitation {point.precipitation.toFixed(1)}mm</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="h-[300px] w-full rounded-lg bg-surface-border/40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-surface-border/40" />
        ))}
      </div>
    </div>
  )
}

export default function WeatherForecastWidget({
  latitude = 2.1926,
  longitude = 102.2381,
  timezone = 'Asia/Kuala_Lumpur',
}: WeatherForecastWidgetProps) {
  const [forecast, setForecast] = useState<ForecastSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    let cancelled = false
    const key = cacheKey(latitude, longitude, timezone)

    const fetchForecast = async () => {
      const cached = forecastCache.get(key)
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setForecast(cached.data)
        setLastUpdated(cached.fetchedAt)
        setLoading(false)
        return
      }

      try {
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude,
            longitude,
            hourly: 'wind_speed_10m,wind_direction_10m,cloud_cover,precipitation',
            timezone,
          },
        })

        const hourly = response.data.hourly
        const summary = summarize(
          hourly.time,
          hourly.wind_speed_10m,
          hourly.wind_direction_10m,
          hourly.cloud_cover,
          hourly.precipitation,
        )

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

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), AGE_TICK_MS)
    return () => clearInterval(tick)
  }, [])

  return (
    <GlassmorphicCard glow="primary" className="w-full">
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-slate-100">🌦️ 24-Hour Weather Forecast</h3>

        {loading ? (
          <>
            <p className="text-sm text-slate-500">Fetching forecast...</p>
            <LoadingSkeleton />
          </>
        ) : error && !forecast ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">{error}</div>
        ) : forecast ? (
          <>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="windSpeedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3f5b" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} tick={{ fill: '#94a3b8' }} interval={0} />
                  <YAxis
                    domain={[0, MAX_SPEED_KMH]}
                    stroke="#64748b"
                    fontSize={12}
                    tick={{ fill: '#94a3b8' }}
                    label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="windSpeed"
                    stroke="#00d4ff"
                    strokeWidth={2}
                    fill="url(#windSpeedFill)"
                    isAnimationActive
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-lg bg-surface-border/20 px-3 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cloud Cover</p>
                <p className="font-semibold text-slate-200">{Math.round(forecast.avgCloudCover)}% ☁️</p>
              </div>
              <div className="rounded-lg bg-surface-border/20 px-3 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Precipitation</p>
                <p className="font-semibold text-slate-200">{forecast.totalPrecipitation.toFixed(1)}mm 🌧️</p>
              </div>
              <div className="rounded-lg bg-surface-border/20 px-3 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Best Hour</p>
                <p className="font-semibold text-slate-200">
                  {formatHourLabel(forecast.bestHour.time)} ({forecast.bestHour.windSpeed.toFixed(1)} km/h) ⭐
                </p>
              </div>
              <div className="rounded-lg bg-surface-border/20 px-3 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Confidence</p>
                <p className="font-semibold text-slate-200">{forecast.confidence}%</p>
              </div>
            </div>
          </>
        ) : null}

        {lastUpdated && (
          <p className="text-right text-xs text-slate-600">Last updated: {formatAgo(now - lastUpdated)}</p>
        )}
      </div>
    </GlassmorphicCard>
  )
}
