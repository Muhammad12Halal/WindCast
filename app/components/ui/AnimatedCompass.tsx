import { Navigation } from 'lucide-react'
import { cardinalDirection } from '../../lib/format'

interface AnimatedCompassProps {
  /** Wind direction in degrees (0-360, 0 = North). Pass null when no telemetry is available yet. */
  direction: number | null
  size?: number
  showLabel?: boolean
  /** Larger "instrument" treatment — finer tick ring + stronger glow. Used for hero placements. */
  premium?: boolean
  className?: string
}

const MAJOR_TICKS: { deg: number; label: string }[] = [
  { deg: 0, label: 'N' },
  { deg: 90, label: 'E' },
  { deg: 180, label: 'S' },
  { deg: 270, label: 'W' },
]
const MINOR_TICK_DEGREES = [45, 135, 225, 315]
const FINE_TICK_DEGREES = Array.from({ length: 24 }, (_, i) => i * 15).filter(
  (deg) => deg % 45 !== 0,
)

export default function AnimatedCompass({
  direction,
  size = 80,
  showLabel = true,
  premium = false,
  className = '',
}: AnimatedCompassProps) {
  const hasReading = direction !== null
  const needleDeg = direction ?? 0
  const radius = size / 2

  return (
    <div className={`flex shrink-0 flex-col items-center gap-1.5 ${className}`}>
      <div
        className={`glass glass-border relative flex items-center justify-center rounded-full transition-shadow duration-500 ${
          hasReading ? 'shadow-glow-wind' : ''
        }`}
        style={{ width: size, height: size }}
      >
        {/* Tick ring — fine 15° ticks plus emphasized cardinal marks, instrument-style. */}
        <div className="absolute inset-0" aria-hidden>
          {premium &&
            FINE_TICK_DEGREES.map((deg) => (
              <span
                key={deg}
                className="absolute left-1/2 top-[6%] h-[6%] w-px bg-slate-600/40"
                style={{ transformOrigin: `0px ${radius * 0.94}px`, transform: `rotate(${deg}deg)` }}
              />
            ))}
          {MINOR_TICK_DEGREES.map((deg) => (
            <span
              key={deg}
              className="absolute left-1/2 top-[5%] h-[9%] w-px bg-slate-500/50"
              style={{ transformOrigin: `0px ${radius * 0.95}px`, transform: `rotate(${deg}deg)` }}
            />
          ))}
          {MAJOR_TICKS.map(({ deg }) => (
            <span
              key={deg}
              className={`absolute left-1/2 top-[4%] h-[12%] w-[1.5px] rounded-full ${hasReading ? 'bg-wind/70' : 'bg-slate-500/60'}`}
              style={{ transformOrigin: `0px ${radius * 0.96}px`, transform: `rotate(${deg}deg)` }}
            />
          ))}
        </div>

        {MAJOR_TICKS.map(({ deg, label }) => {
          const isNorth = deg === 0
          const offset = size * 0.19
          const x = Math.sin((deg * Math.PI) / 180) * (radius - offset)
          const y = -Math.cos((deg * Math.PI) / 180) * (radius - offset)
          return (
            <span
              key={label}
              className={`absolute text-[10px] font-semibold ${isNorth && hasReading ? 'text-wind' : 'text-slate-500'}`}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              {label}
            </span>
          )
        })}

        {/* Center hub + needle */}
        <div
          className="relative flex items-center justify-center transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${needleDeg}deg)` }}
        >
          <Navigation
            size={size * 0.4}
            strokeWidth={2.25}
            className={`transition-colors duration-500 ${hasReading ? 'text-wind drop-shadow-[0_0_6px_rgba(0,212,255,0.55)]' : 'text-slate-600'}`}
          />
        </div>
        <span
          className={`absolute h-1.5 w-1.5 rounded-full ${hasReading ? 'bg-wind' : 'bg-slate-600'}`}
          style={{ boxShadow: hasReading ? '0 0 6px 1px rgba(0,212,255,0.6)' : 'none' }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-slate-400">
          {hasReading ? (
            <>
              <span className="font-semibold text-slate-200">{cardinalDirection(direction)}</span> {Math.round(direction)}°
            </>
          ) : (
            <span className="text-slate-600">No data</span>
          )}
        </div>
      )}
    </div>
  )
}
