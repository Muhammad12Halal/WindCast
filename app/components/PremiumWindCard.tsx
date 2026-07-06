import {
  Wind,
  Navigation,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero,
  Clock,
  MapPin,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Site, Reading } from '../lib/supabase'
import GlassmorphicCard from './ui/GlassmorphicCard'

interface PremiumWindCardProps {
  site: Site
  reading?: Reading | null
  isLoading?: boolean
}

const MAX_SPEED = 30
const SPEED_ZONES = [
  { limit: 5, color: '#60a5fa' },
  { limit: 10, color: '#4ade80' },
  { limit: 20, color: '#fbbf24' },
  { limit: Infinity, color: '#f87171' },
] as const

function speedColor(speed: number): string {
  return (SPEED_ZONES.find((zone) => speed < zone.limit) ?? SPEED_ZONES[SPEED_ZONES.length - 1]).color
}

const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function cardinalDirection(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360
  return CARDINAL_DIRECTIONS[Math.round(normalized / 45) % 8]
}

const BATTERY_MIN_V = 3.0
const BATTERY_MAX_V = 4.2

function batteryPercent(voltage: number): number {
  return Math.min(100, Math.max(0, ((voltage - BATTERY_MIN_V) / (BATTERY_MAX_V - BATTERY_MIN_V)) * 100))
}

function batteryInfo(voltage: number) {
  if (voltage >= 3.7) return { Icon: BatteryFull, color: 'text-green-400' }
  if (voltage >= 3.4) return { Icon: BatteryMedium, color: 'text-amber-400' }
  if (voltage >= 3.1) return { Icon: BatteryLow, color: 'text-orange-400' }
  return { Icon: BatteryWarning, color: 'text-red-400' }
}

function signalInfo(strength: number) {
  if (strength >= 75) return { Icon: SignalHigh, color: 'text-green-400', bar: 'bg-green-400' }
  if (strength >= 50) return { Icon: SignalMedium, color: 'text-amber-400', bar: 'bg-amber-400' }
  if (strength >= 25) return { Icon: SignalLow, color: 'text-orange-400', bar: 'bg-orange-400' }
  return { Icon: SignalZero, color: 'text-red-400', bar: 'bg-red-400' }
}

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function StatBar({
  icon: Icon,
  iconColor,
  label,
  value,
  percent,
  barColor,
}: {
  icon: LucideIcon
  iconColor: string
  label: string
  value: string
  percent: number
  barColor: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Icon size={14} className={iconColor} />
          {label}
        </span>
        <span className="font-medium tabular-nums text-slate-300">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border/40">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function CardHeader({ site }: { site: Site }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 rounded-xl bg-primary/10 p-2.5">
          <Wind className="text-primary animate-sway" size={22} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-100">{site.site_name}</h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={11} />
            <span className="truncate">{site.site_id}</span>
          </div>
        </div>
      </div>
      <span
        className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
          site.is_reference
            ? 'border-green-500/30 bg-green-500/10 text-green-400'
            : 'border-accent/30 bg-accent/10 text-accent'
        }`}
      >
        {site.is_reference ? 'Reference' : 'Low-Cost'}
      </span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="h-2.5 w-24 rounded-full bg-surface-border/40" />
      <div className="h-10 w-32 rounded bg-surface-border/40" />
      <div className="h-2.5 w-full rounded-full bg-surface-border/40" />
      <div className="flex items-center gap-5 pt-1">
        <div className="h-20 w-20 shrink-0 rounded-full bg-surface-border/40" />
        <div className="flex flex-1 flex-col gap-4">
          <div className="h-5 w-full rounded bg-surface-border/40" />
          <div className="h-5 w-full rounded bg-surface-border/40" />
        </div>
      </div>
    </div>
  )
}

export default function PremiumWindCard({ site, reading, isLoading = false }: PremiumWindCardProps) {
  const battery = reading ? batteryInfo(reading.battery_voltage) : null
  const signal = reading ? signalInfo(reading.signal_strength) : null

  return (
    <GlassmorphicCard glow={site.is_reference ? 'primary' : 'accent'} className="h-full">
      <div className="flex h-full flex-col gap-5">
        <CardHeader site={site} />

        {isLoading ? (
          <LoadingSkeleton />
        ) : !reading ? (
          <div className="py-10 text-center text-sm text-slate-600">No recent data</div>
        ) : (
          <>
            <div className="-mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={12} />
              Updated {formatTimeAgo(reading.timestamp)}
            </div>

            <div>
              <div className="flex items-end gap-2">
                <span className="text-primary text-5xl font-bold leading-none tabular-nums">
                  {reading.wind_speed_kmh.toFixed(1)}
                </span>
                <span className="pb-1 text-sm text-slate-500">km/h</span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-border/40">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, (reading.wind_speed_kmh / MAX_SPEED) * 100)}%`,
                    backgroundColor: speedColor(reading.wind_speed_kmh),
                    boxShadow: `0 0 12px 0 ${speedColor(reading.wind_speed_kmh)}`,
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-slate-600">
                <span>0</span>
                <span>{MAX_SPEED}+ km/h</span>
              </div>
            </div>

            <div className="flex items-center gap-5 pt-1">
              <div className="flex shrink-0 flex-col items-center gap-1">
                <div className="glass glass-border relative flex h-20 w-20 items-center justify-center rounded-full">
                  <span className="absolute top-1 text-[10px] font-medium text-slate-500">N</span>
                  <span className="absolute right-1.5 text-[10px] font-medium text-slate-500">E</span>
                  <span className="absolute bottom-1 text-[10px] font-medium text-slate-500">S</span>
                  <span className="absolute left-1.5 text-[10px] font-medium text-slate-500">W</span>
                  <Navigation
                    size={30}
                    strokeWidth={2.25}
                    className="text-primary transition-transform duration-700 ease-out"
                    style={{ transform: `rotate(${reading.wind_direction_deg}deg)` }}
                  />
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">
                    {cardinalDirection(reading.wind_direction_deg)}
                  </span>{' '}
                  {Math.round(reading.wind_direction_deg)}°
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {battery && (
                  <StatBar
                    icon={battery.Icon}
                    iconColor={battery.color}
                    label="Battery"
                    value={`${reading.battery_voltage.toFixed(2)}V`}
                    percent={batteryPercent(reading.battery_voltage)}
                    barColor="bg-green-400"
                  />
                )}
                {signal && (
                  <StatBar
                    icon={signal.Icon}
                    iconColor={signal.color}
                    label="Signal"
                    value={`${reading.signal_strength}%`}
                    percent={reading.signal_strength}
                    barColor={signal.bar}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </GlassmorphicCard>
  )
}
