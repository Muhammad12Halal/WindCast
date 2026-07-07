import { ShieldAlert, TriangleAlert, Info, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type AlertSeverity = 'critical' | 'warning' | 'info' | 'ok'

interface AlertBoxProps {
  severity: AlertSeverity
  title: string
  message?: string
  meta?: string
  className?: string
}

const severityStyles: Record<
  AlertSeverity,
  { icon: LucideIcon; iconColor: string; border: string; bg: string; titleColor: string }
> = {
  critical: {
    icon: ShieldAlert,
    iconColor: 'text-red-400',
    border: 'border-red-900',
    bg: 'bg-red-950/40',
    titleColor: 'text-red-400',
  },
  warning: {
    icon: TriangleAlert,
    iconColor: 'text-amber-400',
    border: 'border-amber-900',
    bg: 'bg-amber-950/30',
    titleColor: 'text-amber-400',
  },
  info: {
    icon: Info,
    iconColor: 'text-primary',
    border: 'border-surface-border',
    bg: 'bg-primary/5',
    titleColor: 'text-primary',
  },
  ok: {
    icon: CheckCircle2,
    iconColor: 'text-green-400',
    border: 'border-surface-border',
    bg: 'bg-surface-card',
    titleColor: 'text-slate-100',
  },
}

export default function AlertBox({ severity, title, message, meta, className = '' }: AlertBoxProps) {
  const { icon: Icon, iconColor, border, bg, titleColor } = severityStyles[severity]

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${border} ${bg} ${className}`}>
      <Icon className={`shrink-0 ${iconColor}`} size={20} />
      <div className="min-w-0">
        <p className={`font-medium ${titleColor}`}>{title}</p>
        {message && <p className="mt-0.5 text-sm text-slate-300">{message}</p>}
        {meta && <p className="mt-0.5 text-xs text-slate-500">{meta}</p>}
      </div>
    </div>
  )
}
