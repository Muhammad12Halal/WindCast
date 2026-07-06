/**
 * Design tokens for the wind monitoring dashboard.
 *
 * These mirror the CSS custom properties defined in `app/globals.css`
 * (`@theme`) so the same values can be reused in non-Tailwind contexts,
 * e.g. inline SVG/canvas rendering, chart libraries (Recharts), or
 * computed style logic that can't be expressed with utility classes.
 */

export const colors = {
  primary: '#00d4ff', // cyan - wind
  secondary: '#ff6b35', // orange - solar
  accent: '#a855f7', // purple - alerts
  background: '#0a0e27', // deep navy
  card: '#1a2847', // navy blue
  border: '#2d3f5b', // light navy
  foreground: '#f1f5f9',
} as const

export const typography = {
  fontFamily: {
    sans: 'var(--font-inter), Arial, Helvetica, sans-serif',
    mono: 'var(--font-space-mono), ui-monospace, monospace',
  },
  scale: {
    xs: { fontSize: '0.75rem', lineHeight: '1rem' },
    sm: { fontSize: '0.875rem', lineHeight: '1.25rem' },
    base: { fontSize: '1rem', lineHeight: '1.5rem' },
    lg: { fontSize: '1.125rem', lineHeight: '1.75rem' },
    xl: { fontSize: '1.25rem', lineHeight: '1.75rem' },
    '2xl': { fontSize: '1.5rem', lineHeight: '2rem' },
    '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem' },
    '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem' },
    '5xl': { fontSize: '3rem', lineHeight: '1' },
  },
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const

export const spacing = {
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const

export const shadows = {
  // Elevation shadow for cards sitting above the deep navy background.
  card: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
  // Subtle 1px border-like glow used alongside `glass` utility classes.
  glassRing: '0 0 0 1px rgba(0, 212, 255, 0.15)',
  glow: {
    primary: '0 0 24px rgba(0, 212, 255, 0.45)',
    secondary: '0 0 24px rgba(255, 107, 53, 0.45)',
    accent: '0 0 24px rgba(168, 85, 247, 0.45)',
  },
} as const

export const motion = {
  duration: {
    fast: '150ms',
    base: '250ms',
    slow: '400ms',
  },
  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

export const designTokens = {
  colors,
  typography,
  spacing,
  shadows,
  motion,
} as const

export type DesignTokens = typeof designTokens
