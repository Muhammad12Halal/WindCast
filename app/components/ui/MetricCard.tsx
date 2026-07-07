import type { LucideIcon } from 'lucide-react'
import GlassmorphicCard from './GlassmorphicCard'

type Accent = 'primary' | 'secondary' | 'accent' | 'none'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: LucideIcon
  accent?: Accent
  trend?: string
  className?: string
}

const iconColor: Record<Accent, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  none: 'text-slate-400',
}

const iconBg: Record<Accent, string> = {
  primary: 'bg-primary/10',
  secondary: 'bg-secondary/10',
  accent: 'bg-accent/10',
  none: 'bg-surface-border/40',
}

export default function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  accent = 'primary',
  trend,
  className = '',
}: MetricCardProps) {
  return (
    <GlassmorphicCard glow={accent} className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums text-slate-100">{value}</span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
          {trend && <p className="mt-1 text-xs text-slate-400">{trend}</p>}
        </div>
        {Icon && (
          <div className={`shrink-0 rounded-xl p-2.5 ${iconBg[accent]}`}>
            <Icon size={20} className={iconColor[accent]} />
          </div>
        )}
      </div>
    </GlassmorphicCard>
  )
}
