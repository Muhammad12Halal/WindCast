'use client'

import {
  Navigation,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero,
  MapPin,
  Clock,
} from 'lucide-react'
import type { Site, Reading } from '../lib/supabase'

interface SiteCardProps {
  site: Site
  reading?: Reading
}

function windSpeedColor(speed: number): string {
  if (speed < 5) return 'text-blue-400'
  if (speed < 10) return 'text-green-400'
  if (speed < 20) return 'text-amber-400'
  return 'text-red-400'
}

function batteryInfo(voltage: number) {
  if (voltage >= 3.7) return { Icon: BatteryFull, color: 'text-green-400' }
  if (voltage >= 3.4) return { Icon: BatteryMedium, color: 'text-amber-400' }
  if (voltage >= 3.1) return { Icon: BatteryLow, color: 'text-orange-400' }
  return { Icon: BatteryWarning, color: 'text-red-400' }
}

function signalInfo(strength: number) {
  if (strength >= 75) return { Icon: SignalHigh, color: 'text-green-400' }
  if (strength >= 50) return { Icon: SignalMedium, color: 'text-amber-400' }
  if (strength >= 25) return { Icon: SignalLow, color: 'text-orange-400' }
  return { Icon: SignalZero, color: 'text-red-400' }
}

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export default function SiteCard({ site, reading }: SiteCardProps) {
  const battery = reading ? batteryInfo(reading.battery_voltage) : null
  const signal = reading ? signalInfo(reading.signal_strength) : null

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-100">{site.site_name}</h3>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <MapPin size={12} />
            {site.site_id}
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
            site.is_reference
              ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          {site.is_reference ? 'Reference' : 'Low-Cost'}
        </span>
      </div>

      {reading ? (
        <>
          <div className="flex items-end justify-between">
            <div>
              <div className={`text-4xl font-bold tabular-nums ${windSpeedColor(reading.wind_speed_kmh)}`}>
                {reading.wind_speed_kmh.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500 mt-1">km/h</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Navigation
                size={28}
                className="text-slate-400"
                style={{ transform: `rotate(${reading.wind_direction_deg}deg)` }}
              />
              <span className="text-xs text-slate-500">{Math.round(reading.wind_direction_deg)}°</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-sm">
            <div className="flex items-center gap-1.5" title="Battery voltage">
              {battery && <battery.Icon size={16} className={battery.color} />}
              <span className="text-slate-400">{reading.battery_voltage.toFixed(2)}V</span>
            </div>
            <div className="flex items-center gap-1.5" title="Signal strength">
              {signal && <signal.Icon size={16} className={signal.color} />}
              <span className="text-slate-400">{reading.signal_strength}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500" title="Last reading">
              <Clock size={14} />
              <span>{formatTimeAgo(reading.timestamp)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="py-6 text-center text-sm text-slate-600">No recent data</div>
      )}
    </div>
  )
}
