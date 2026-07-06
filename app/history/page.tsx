'use client'

import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useSites, useReadingHistory } from '../lib/hooks'

const TIME_RANGES = [
  { label: 'Last 6 hours', hours: 6 },
  { label: 'Last 24 hours', hours: 24 },
  { label: 'Last 7 days', hours: 24 * 7 },
] as const

export default function HistoryPage() {
  const { sites, loading: sitesLoading, error: sitesError } = useSites()
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [hours, setHours] = useState<number>(24)

  const siteId = selectedSiteId || sites[0]?.site_id || ''

  const { data, loading: historyLoading, error: historyError } = useReadingHistory(siteId, hours)
  const error = sitesError || historyError

  const chartData = data.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleString('en-MY', {
      ...(hours > 24
        ? { day: '2-digit', month: 'short' }
        : { hour: '2-digit', minute: '2-digit' }),
    }),
    windSpeed: reading.wind_speed_kmh,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Wind Speed History</h1>
        <p className="text-sm text-slate-500 mt-1">Historical wind speed readings by site</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <select
          value={siteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          disabled={sitesLoading}
          className="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600"
        >
          {sites.map((site) => (
            <option key={site.id} value={site.site_id}>
              {site.site_name}
            </option>
          ))}
        </select>

        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-600"
        >
          {TIME_RANGES.map((range) => (
            <option key={range.hours} value={range.hours}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-5 flex items-start gap-3">
          <AlertTriangle className="text-red-400 shrink-0" size={24} />
          <div>
            <p className="font-medium text-slate-100">Unable to load data</p>
            <p className="text-sm text-slate-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 h-[420px]">
        {sitesLoading || historyLoading ? (
          <div className="flex items-center justify-center gap-2 h-full text-slate-500">
            <Loader2 className="animate-spin" size={20} />
            Loading history...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            No readings available for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} tick={{ fill: '#94a3b8' }} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tick={{ fill: '#94a3b8' }}
                label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#f1f5f9' }}
                itemStyle={{ color: '#22d3ee' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Line
                type="monotone"
                dataKey="windSpeed"
                name="Wind Speed (km/h)"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
