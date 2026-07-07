'use client'

import { useEffect, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Navigation, Cloud, CloudRain, Thermometer, Droplets } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cardinalDirection } from '../lib/format'
import { useWeatherForecast } from '../lib/weather'
import GlassmorphicCard from './ui/GlassmorphicCard'

interface WeatherForecastWidgetProps {
  latitude?: number
  longitude?: number
  timezone?: string
}

const AGE_TICK_MS = 30 * 1000

function formatAgo(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 min ago'
  return `${minutes} min ago`
}

function Chip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-border/15 px-3 py-2">
      <Icon size={14} className="shrink-0 text-wind" />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-200">{value}</p>
        <p className="truncate text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-2 gap-2 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-surface-border/40" />
      ))}
    </div>
  )
}

export default function WeatherForecastWidget({
  latitude = 2.1926,
  longitude = 102.2381,
  timezone = 'Asia/Kuala_Lumpur',
}: WeatherForecastWidgetProps) {
  const { forecast, loading, error, lastUpdated } = useWeatherForecast(latitude, longitude, timezone)
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), AGE_TICK_MS)
    return () => clearInterval(tick)
  }, [])

  return (
    <GlassmorphicCard glow="wind" className="w-full">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-100">24-Hour Weather Forecast</h3>
          {lastUpdated && <p className="text-[11px] text-slate-600">Updated {formatAgo(now - lastUpdated)}</p>}
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : error && !forecast ? (
          <div className="flex h-24 items-center justify-center text-sm text-slate-500">{error}</div>
        ) : forecast ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-3 sm:w-40">
              <Navigation
                size={28}
                className="text-wind transition-transform duration-700 ease-out"
                style={{ transform: `rotate(${forecast.now.windDirection}deg)` }}
              />
              <div>
                <p className="font-mono text-2xl font-bold tabular-nums leading-none text-slate-100">
                  {forecast.now.windSpeed.toFixed(1)}
                  <span className="ml-1 text-xs font-normal text-slate-500">km/h</span>
                </p>
                <p className="text-[11px] text-slate-500">{cardinalDirection(forecast.now.windDirection)} now</p>
              </div>
            </div>

            <div className="h-10 flex-1 sm:h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="windSpeedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#132238', border: '1px solid #223349', borderRadius: 8, fontSize: 11 }}
                    labelFormatter={() => ''}
                    formatter={(value) => [`${Number(value).toFixed(1)} km/h`, 'Wind']}
                  />
                  <Area type="monotone" dataKey="windSpeed" stroke="#00d4ff" strokeWidth={1.5} fill="url(#windSpeedFill)" isAnimationActive animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:w-64">
              <Chip icon={Cloud} label="Cloud Cover" value={`${Math.round(forecast.avgCloudCover)}%`} />
              <Chip icon={CloudRain} label="Rain (24h)" value={`${forecast.totalPrecipitation.toFixed(1)}mm`} />
              <Chip icon={Thermometer} label="Temperature" value={`${forecast.now.temperature.toFixed(1)}°C`} />
              <Chip icon={Droplets} label="Humidity" value={`${Math.round(forecast.now.humidity)}%`} />
            </div>
          </div>
        ) : null}
      </div>
    </GlassmorphicCard>
  )
}
