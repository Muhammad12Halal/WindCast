'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Home, Map, Sun, Gauge, Database, Settings, Menu, X, Wind } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SidebarNavProps {
  /** Current route, used to highlight the active icon. */
  currentPath: string
}

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Map, label: 'Map', href: '/#map' },
  { icon: Wind, label: 'Site Monitoring', href: '/#sites' },
  { icon: Sun, label: 'Power System Health', href: '/#power-system' },
  { icon: Gauge, label: 'Performance Analysis', href: '/#performance' },
  { icon: Database, label: 'History', href: '/history' },
  { icon: Settings, label: 'Reports', href: '/reports' },
]

function isActive(currentPath: string, href: string): boolean {
  const [path] = href.split('#')
  return path === currentPath
}

function NavIcon({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-label={item.label}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center justify-center rounded-lg p-3 transition-all duration-200 ease-out hover:-translate-y-0.5 ${
        active ? 'text-wind' : 'text-slate-500 hover:text-slate-100'
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-wind transition-opacity duration-200 ${
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
        }`}
        aria-hidden
      />
      <span
        className={`absolute inset-0 rounded-lg transition-all duration-200 ${
          active ? 'bg-wind/12 shadow-glow-wind' : 'bg-transparent group-hover:bg-surface-border/50'
        }`}
        aria-hidden
      />
      <Icon size={22} className="relative shrink-0 transition-transform duration-200 group-hover:scale-110" />
      <span className="pointer-events-none absolute left-full z-10 ml-2 hidden -translate-x-1 whitespace-nowrap rounded-md border border-surface-border bg-surface-card px-2.5 py-1.5 text-xs font-medium text-slate-200 opacity-0 shadow-card transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 md:block">
        {item.label}
      </span>
    </Link>
  )
}

export default function SidebarNav({ currentPath }: SidebarNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile nav trigger — a bottom-right FAB so it never competes with the sticky header's z-index. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed bottom-4 right-4 z-[60] flex items-center justify-center rounded-full border border-surface-border bg-surface-card p-3 text-slate-200 shadow-card hover:text-wind md:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex md:hidden">
          <div className="flex w-20 flex-col items-center gap-2 bg-surface-raised py-4">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="mb-2 flex items-center justify-center rounded-lg p-3 text-slate-400 hover:text-slate-200"
            >
              <X size={24} />
            </button>
            {NAV_ITEMS.map((item) => (
              <NavIcon
                key={item.href}
                item={item}
                active={isActive(currentPath, item.href)}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop/tablet vertical sidebar */}
      <nav
        aria-label="Primary"
        className="sticky top-20 hidden h-[calc(100vh-5rem)] w-16 shrink-0 flex-col items-center gap-1 border-r border-surface-border bg-surface-raised py-4 md:flex"
      >
        {NAV_ITEMS.map((item) => (
          <NavIcon key={item.href} item={item} active={isActive(currentPath, item.href)} />
        ))}
      </nav>
    </>
  )
}
