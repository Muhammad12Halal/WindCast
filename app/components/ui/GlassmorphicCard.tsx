import type { HTMLAttributes, ReactNode } from 'react'

type GlowColor = 'wind' | 'solar' | 'lowcost' | 'reference' | 'none'

interface GlassmorphicCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Accent used for the gradient border ring and hover glow. */
  glow?: GlowColor
}

const ringGradient: Record<GlowColor, string> = {
  wind: 'from-wind/70 via-wind/10 to-transparent',
  solar: 'from-solar/70 via-solar/10 to-transparent',
  lowcost: 'from-lowcost/70 via-lowcost/10 to-transparent',
  reference: 'from-reference/70 via-reference/10 to-transparent',
  none: 'from-surface-border via-surface-border/40 to-transparent',
}

const hoverShadow: Record<GlowColor, string> = {
  wind: 'hover:shadow-glow-wind',
  solar: 'hover:shadow-glow-solar',
  lowcost: 'hover:shadow-glow-lowcost',
  reference: 'hover:shadow-glow-reference',
  none: 'hover:shadow-card',
}

export default function GlassmorphicCard({
  children,
  glow = 'none',
  className = '',
  ...props
}: GlassmorphicCardProps) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-px shadow-card transition-all duration-300 ${ringGradient[glow]} ${hoverShadow[glow]} ${className}`}
      {...props}
    >
      <div className="glass glass-border h-full w-full rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-0.5">
        {children}
      </div>
    </div>
  )
}
