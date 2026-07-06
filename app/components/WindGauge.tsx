interface WindGaugeProps {
  speed: number
  size?: number
}

const MAX_SPEED = 30

const ZONE_STOPS = [5, 10, 20, MAX_SPEED] as const
const ZONE_COLORS = ['#60a5fa', '#4ade80', '#fbbf24', '#f87171'] as const

function zoneColor(speed: number): string {
  if (speed < 5) return ZONE_COLORS[0]
  if (speed < 10) return ZONE_COLORS[1]
  if (speed < 20) return ZONE_COLORS[2]
  return ZONE_COLORS[3]
}

function valueToAngle(value: number): number {
  return 180 - (Math.min(Math.max(value, 0), MAX_SPEED) / MAX_SPEED) * 180
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArcFlag = startAngle - endAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

export default function WindGauge({ speed, size = 160 }: WindGaugeProps) {
  const cx = 100
  const cy = 100
  const trackRadius = 80
  const needleAngle = valueToAngle(speed)
  const needleTip = polarToCartesian(cx, cy, trackRadius - 16, needleAngle)
  const color = zoneColor(speed)

  const zoneBoundaries = [0, ...ZONE_STOPS]
  const zones = ZONE_STOPS.map((stop, i) => ({
    arc: describeArc(cx, cy, trackRadius, valueToAngle(zoneBoundaries[i]), valueToAngle(stop)),
    color: ZONE_COLORS[i],
    key: stop,
  }))

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 200 120" width={size} height={size * 0.6}>
        {zones.map((zone) => (
          <path
            key={zone.key}
            d={zone.arc}
            fill="none"
            stroke={zone.color}
            strokeWidth={12}
            strokeLinecap="round"
            opacity={0.35}
          />
        ))}

        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="#e2e8f0"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={6} fill="#e2e8f0" />

        <text x={12} y={112} className="fill-slate-600 text-[10px]">
          0
        </text>
        <text x={188} y={112} textAnchor="end" className="fill-slate-600 text-[10px]">
          {MAX_SPEED}+
        </text>
      </svg>

      <div className="flex items-baseline gap-1 -mt-3">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {speed.toFixed(1)}
        </span>
        <span className="text-xs text-slate-500">km/h</span>
      </div>
    </div>
  )
}
