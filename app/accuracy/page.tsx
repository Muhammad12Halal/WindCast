import { Gauge } from 'lucide-react'

export default function AccuracyPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Gauge className="text-slate-600" size={40} />
      <h1 className="text-xl font-semibold text-slate-200">Accuracy</h1>
      <p className="text-sm text-slate-500">Coming soon</p>
    </div>
  )
}
