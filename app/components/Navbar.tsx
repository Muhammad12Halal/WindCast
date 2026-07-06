'use client'

import Link from 'next/link'
import { Wind } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="w-full px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <Wind className="text-cyan-500" size={28} />
          Wind Nowcast
        </Link>
        
        <ul className="flex gap-6 text-sm">
          <li><Link href="/" className="hover:text-cyan-400 transition">Dashboard</Link></li>
          <li><Link href="/history" className="hover:text-cyan-400 transition">History</Link></li>
          <li><Link href="/accuracy" className="hover:text-cyan-400 transition">Accuracy</Link></li>
          <li><Link href="/reports" className="hover:text-cyan-400 transition">Reports</Link></li>
        </ul>
      </div>
    </nav>
  )
}