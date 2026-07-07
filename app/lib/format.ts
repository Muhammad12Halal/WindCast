/** Shared formatting/derivation helpers used across the monitoring dashboard. */

export const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

export function cardinalDirection(deg: number | null | undefined): string {
  const normalized = (((deg ?? 0) % 360) + 360) % 360
  return CARDINAL_DIRECTIONS[Math.round(normalized / 45) % 8]
}

/** Circular mean of a set of wind-direction degrees (handles the 0/360 wraparound). Missing readings default to 0°. */
export function circularMeanDeg(degrees: (number | null | undefined)[]): number {
  if (degrees.length === 0) return 0
  const values = degrees.map((d) => d ?? 0)
  const sumSin = values.reduce((s, d) => s + Math.sin((d * Math.PI) / 180), 0)
  const sumCos = values.reduce((s, d) => s + Math.cos((d * Math.PI) / 180), 0)
  const meanRad = Math.atan2(sumSin / values.length, sumCos / values.length)
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

export function windSpeedStatus(speedKmh: number | null | undefined): StatusLevel {
  const v = speedKmh ?? 0
  if (v < 10) return 'healthy'
  if (v < 20) return 'warning'
  return 'critical'
}

export function windSpeedTextClass(speedKmh: number | null | undefined): string {
  const v = speedKmh ?? 0
  if (v < 5) return 'text-wind'
  if (v < 10) return 'text-healthy'
  if (v < 20) return 'text-warning'
  return 'text-critical'
}

// Missing/null readings (device offline, field not reported) are treated as
// the worst case rather than silently passing a health check.
export function batteryStatus(voltage: number | null | undefined): StatusLevel {
  const v = voltage ?? 0
  if (v > 3.8) return 'healthy'
  if (v >= 3.5) return 'warning'
  return 'critical'
}

export function batteryTextClass(voltage: number | null | undefined): string {
  const status = batteryStatus(voltage)
  return status === 'healthy' ? 'text-healthy' : status === 'warning' ? 'text-warning' : 'text-critical'
}

export function signalStatus(dBm: number | null | undefined): StatusLevel {
  const v = dBm ?? -999
  if (v > -70) return 'healthy'
  if (v >= -85) return 'warning'
  return 'critical'
}

export function signalTextClass(dBm: number | null | undefined): string {
  const status = signalStatus(dBm)
  return status === 'healthy' ? 'text-healthy' : status === 'warning' ? 'text-warning' : 'text-critical'
}

const BATTERY_MAX_V = 5

export function batteryPercent(voltage: number | null | undefined): number {
  return Math.min(100, Math.max(0, ((voltage ?? 0) / BATTERY_MAX_V) * 100))
}

// Stations without a dedicated charge-controller reading are inferred from
// battery voltage alone — labelled distinctly from a real controller status.
export type ChargingStatus = 'Charging' | 'Trickle' | 'Not Charging'

export function chargingStatusFromBattery(voltage: number | null | undefined): ChargingStatus {
  const v = voltage ?? 0
  if (v > 3.8) return 'Charging'
  if (v >= 3.5) return 'Trickle'
  return 'Not Charging'
}

// Prefers the device's own reported charging_status (real telemetry field)
// over the battery-voltage heuristic, which is only a fallback for readings
// that don't report it.
export function chargingStatusLabel(
  deviceStatus: 'charging' | 'discharging' | 'idle' | null | undefined,
  voltage: number | null | undefined,
): ChargingStatus {
  if (deviceStatus === 'charging') return 'Charging'
  if (deviceStatus === 'discharging') return 'Not Charging'
  if (deviceStatus === 'idle') return 'Trickle'
  return chargingStatusFromBattery(voltage)
}

export type ControllerStatus = 'Normal' | 'Fault'

export function controllerStatusFromBattery(voltage: number | null | undefined): ControllerStatus {
  return (voltage ?? 0) < 3.2 ? 'Fault' : 'Normal'
}
