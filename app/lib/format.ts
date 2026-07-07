/** Shared formatting/derivation helpers used across the monitoring dashboard. */

export const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

const CARDINAL_DIRECTIONS_FULL = [
  'North',
  'North-East',
  'East',
  'South-East',
  'South',
  'South-West',
  'West',
  'North-West',
] as const

export function cardinalDirection(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360
  return CARDINAL_DIRECTIONS[Math.round(normalized / 45) % 8]
}

/** Spelled-out cardinal name, e.g. "North-West" — used where direction is the visual focus. */
export function cardinalDirectionFull(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360
  return CARDINAL_DIRECTIONS_FULL[Math.round(normalized / 45) % 8]
}

/** Circular mean of a set of wind-direction degrees (handles the 0/360 wraparound). */
export function circularMeanDeg(degrees: number[]): number {
  if (degrees.length === 0) return 0
  const sumSin = degrees.reduce((s, d) => s + Math.sin((d * Math.PI) / 180), 0)
  const sumCos = degrees.reduce((s, d) => s + Math.cos((d * Math.PI) / 180), 0)
  const meanRad = Math.atan2(sumSin / degrees.length, sumCos / degrees.length)
  return ((meanRad * 180) / Math.PI + 360) % 360
}

export function formatTimeAgo(timestamp: string | number): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export type StatusLevel = 'healthy' | 'warning' | 'critical'

export const STATUS_COLOR: Record<StatusLevel, string> = {
  healthy: '#22c55e',
  warning: '#facc15',
  critical: '#ef4444',
}

export function windSpeedStatus(speedKmh: number): StatusLevel {
  if (speedKmh < 10) return 'healthy'
  if (speedKmh < 20) return 'warning'
  return 'critical'
}

export function windSpeedTextClass(speedKmh: number): string {
  if (speedKmh < 5) return 'text-wind'
  if (speedKmh < 10) return 'text-healthy'
  if (speedKmh < 20) return 'text-warning'
  return 'text-critical'
}

export function batteryStatus(voltage: number): StatusLevel {
  if (voltage > 3.8) return 'healthy'
  if (voltage >= 3.5) return 'warning'
  return 'critical'
}

export function batteryTextClass(voltage: number): string {
  const status = batteryStatus(voltage)
  return status === 'healthy' ? 'text-healthy' : status === 'warning' ? 'text-warning' : 'text-critical'
}

export function signalStatus(dBm: number): StatusLevel {
  if (dBm > -70) return 'healthy'
  if (dBm >= -85) return 'warning'
  return 'critical'
}

export function signalTextClass(dBm: number): string {
  const status = signalStatus(dBm)
  return status === 'healthy' ? 'text-healthy' : status === 'warning' ? 'text-warning' : 'text-critical'
}

const BATTERY_MAX_V = 5

export function batteryPercent(voltage: number): number {
  return Math.min(100, Math.max(0, (voltage / BATTERY_MAX_V) * 100))
}

// Stations without a dedicated charge-controller reading are inferred from
// battery voltage alone — labelled distinctly from a real controller status.
export type ChargingStatus = 'Charging' | 'Trickle' | 'Not Charging'

export function chargingStatusFromBattery(voltage: number): ChargingStatus {
  if (voltage > 3.8) return 'Charging'
  if (voltage >= 3.5) return 'Trickle'
  return 'Not Charging'
}

export type ControllerStatus = 'Normal' | 'Fault'

export function controllerStatusFromBattery(voltage: number): ControllerStatus {
  return voltage < 3.2 ? 'Fault' : 'Normal'
}
