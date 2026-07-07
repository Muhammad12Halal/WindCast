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
  { icon: Sun, label: 'Solar Monitoring', href: '/#solar' },
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
      className={`group relative flex items-center justify-center rounded-lg p-3 transition-colors duration-200 ${
        active ? 'text-wind' : 'text-slate-500 hover:text-slate-200'
      }`}
    >
      {active && <span className="absolute inset-0 rounded-lg bg-wind/10" />}
      <Icon size={22} className="relative" />
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
