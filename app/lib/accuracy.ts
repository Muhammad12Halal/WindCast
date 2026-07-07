/**
 * Sensor-accuracy computation: pairs each low-cost site with its nearest
 * reference (commercial) site by geographic distance, aligns their readings
 * by timestamp, and computes standard error/agreement statistics.
 */

import type { Reading, Site } from './supabase'

const EARTH_RADIUS_KM = 6371

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

export interface SitePair {
  reference: Site
  lowCost: Site
  distanceKm: number
}

/** Pairs every low-cost site with its geographically nearest reference site. */
export function pairSites(sites: Site[]): SitePair[] {
  const references = sites.filter((s) => s.is_reference)
  const lowCost = sites.filter((s) => !s.is_reference)
  if (references.length === 0) return []

  return lowCost.map((site) => {
    let nearest = references[0]
    let minDistance = haversineDistanceKm(site.latitude, site.longitude, nearest.latitude, nearest.longitude)
    for (const ref of references.slice(1)) {
      const distance = haversineDistanceKm(site.latitude, site.longitude, ref.latitude, ref.longitude)
      if (distance < minDistance) {
        minDistance = distance
        nearest = ref
      }
    }
    return { reference: nearest, lowCost: site, distanceKm: minDistance }
  })
}

export interface AlignedPoint {
  timestamp: string
  reference: number
  lowCost: number
}

const DEFAULT_MAX_GAP_MINUTES = 10

/** Aligns two readings series by nearest timestamp within a tolerance window. */
export function alignByTimestamp(
  referenceReadings: Reading[],
  lowCostReadings: Reading[],
  maxGapMinutes: number = DEFAULT_MAX_GAP_MINUTES,
): AlignedPoint[] {
  const maxGapMs = maxGapMinutes * 60_000
  const sortedLowCost = [...lowCostReadings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  const points: AlignedPoint[] = []
  for (const ref of referenceReadings) {
    const refTime = new Date(ref.timestamp).getTime()
    let closest: Reading | null = null
    let closestGap = Infinity
    for (const lc of sortedLowCost) {
      const gap = Math.abs(new Date(lc.timestamp).getTime() - refTime)
      if (gap < closestGap) {
        closestGap = gap
        closest = lc
      }
    }
    if (closest && closestGap <= maxGapMs) {
      points.push({ timestamp: ref.timestamp, reference: ref.wind_speed_kmh ?? 0, lowCost: closest.wind_speed_kmh ?? 0 })
    }
  }
  return points
}

export interface AccuracyStats {
  n: number
  mae: number
  rmse: number
  bias: number
  correlation: number
  accuracyPct: number
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 2) return 0
  const meanX = xs.reduce((s, v) => s + v, 0) / n
  const meanY = ys.reduce((s, v) => s + v, 0) / n
  let cov = 0
  let varX = 0
  let varY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    cov += dx * dy
    varX += dx * dx
    varY += dy * dy
  }
  if (varX === 0 || varY === 0) return 0
  return cov / Math.sqrt(varX * varY)
}

/** Computes MAE/RMSE/bias/correlation/derived-accuracy from aligned wind-speed pairs. */
export function computeAccuracyStats(points: AlignedPoint[]): AccuracyStats | null {
  if (points.length === 0) return null

  const n = points.length
  const refs = points.map((p) => p.reference)
  const lows = points.map((p) => p.lowCost)

  const absErrors = points.map((p) => Math.abs(p.lowCost - p.reference))
  const sqErrors = points.map((p) => (p.lowCost - p.reference) ** 2)
  const signedErrors = points.map((p) => p.lowCost - p.reference)

  const mae = absErrors.reduce((s, v) => s + v, 0) / n
  const rmse = Math.sqrt(sqErrors.reduce((s, v) => s + v, 0) / n)
  const bias = signedErrors.reduce((s, v) => s + v, 0) / n
  const correlation = pearsonCorrelation(refs, lows)

  const meanReference = refs.reduce((s, v) => s + v, 0) / n
  const accuracyPct = meanReference > 0 ? Math.max(0, Math.min(100, 100 * (1 - mae / meanReference))) : 0

  return { n, mae, rmse, bias, correlation, accuracyPct }
}

export interface PairAnalysis extends SitePair {
  points: AlignedPoint[]
  stats: AccuracyStats | null
}

const MIN_POINTS_FOR_STATS = 3

/** Groups a flat readings array by site, pairs sites, aligns and scores every pair. */
export function analyzeSitePairs(sites: Site[], readings: Reading[]): PairAnalysis[] {
  const bySite = new Map<string, Reading[]>()
  for (const reading of readings) {
    const list = bySite.get(reading.site_id)
    if (list) list.push(reading)
    else bySite.set(reading.site_id, [reading])
  }

  return pairSites(sites).map((pair) => {
    const refReadings = bySite.get(pair.reference.site_id) ?? []
    const lowCostReadings = bySite.get(pair.lowCost.site_id) ?? []
    const points = alignByTimestamp(refReadings, lowCostReadings)
    const stats = points.length >= MIN_POINTS_FOR_STATS ? computeAccuracyStats(points) : null
    return { ...pair, points, stats }
  })
}
