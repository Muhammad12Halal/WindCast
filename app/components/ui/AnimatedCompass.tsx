import { Navigation } from 'lucide-react'

interface AnimatedCompassProps {
  /** Wind direction in degrees (0-360, 0 = North). */
  direction: number
  size?: number
  showLabel?: boolean
  className?: string
}

const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function cardinalDirection(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360
  return CARDINAL_DIRECTIONS[Math.round(normalized / 45) % 8]
}

export default function AnimatedCompass({
  direction,
  size = 80,
  showLabel = true,
  className = '',
}: AnimatedCompassProps) {
  return (
    <div className={`flex shrink-0 flex-col items-center gap-1 ${className}`}>
      <div
        className="glass glass-border relative flex items-center justify-center rounded-full"
        style={{ width: size, height: size }}
      >
        <span className="absolute top-1 text-[10px] font-medium text-slate-500">N</span>
        <span className="absolute right-1.5 text-[10px] font-medium text-slate-500">E</span>
        <span className="absolute bottom-1 text-[10px] font-medium text-slate-500">S</span>
        <span className="absolute left-1.5 text-[10px] font-medium text-slate-500">W</span>
        <Navigation
          size={size * 0.375}
          strokeWidth={2.25}
          className="text-primary transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${direction}deg)` }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-slate-200">{cardinalDirection(direction)}</span>{' '}
          {Math.round(direction)}°
        </div>
      )}
    </div>
  )
}
