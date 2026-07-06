import type { HTMLAttributes, ReactNode } from 'react'

type GlowColor = 'primary' | 'secondary' | 'accent' | 'none'

interface GlassmorphicCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Accent used for the gradient border ring and hover glow. */
  glow?: GlowColor
}

const ringGradient: Record<GlowColor, string> = {
  primary: 'from-primary/70 via-primary/10 to-transparent',
  secondary: 'from-secondary/70 via-secondary/10 to-transparent',
  accent: 'from-accent/70 via-accent/10 to-transparent',
  none: 'from-surface-border via-surface-border/40 to-transparent',
}

const hoverShadow: Record<GlowColor, string> = {
  primary: 'hover:shadow-glow',
  secondary: 'hover:shadow-[0_0_24px_0_rgba(255,107,53,0.45)]',
  accent: 'hover:shadow-[0_0_24px_0_rgba(168,85,247,0.45)]',
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
