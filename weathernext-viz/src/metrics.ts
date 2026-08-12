import type { ErrorsAtLead, TrackPoint } from './types'

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance (haversine) in km. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

function nearestBest(best: TrackPoint[], validTime: string): TrackPoint | null {
  if (best.length === 0) return null
  const t = new Date(validTime).getTime()
  let bestPt = best[0]
  let bestDiff = Math.abs(new Date(best[0].time).getTime() - t)
  for (const p of best) {
    const d = Math.abs(new Date(p.time).getTime() - t)
    if (d < bestDiff) {
      bestDiff = d
      bestPt = p
    }
  }
  // Require match within 3 hours of a synoptic best-track point.
  if (bestDiff > 3 * 3600_000) return null
  return bestPt
}

function errorSeries(
  forecast: TrackPoint[],
  best: TrackPoint[],
): Map<number, { trackKm: number; windKt: number | null; mslpHpa: number | null }> {
  const out = new Map<number, { trackKm: number; windKt: number | null; mslpHpa: number | null }>()
  for (const fp of forecast) {
    const lead = fp.leadHours
    if (lead == null || lead < 0) continue
    const bt = nearestBest(best, fp.time)
    if (!bt) continue
    const trackKm = haversineKm(fp, bt)
    const windKt =
      fp.vmaxKt != null && bt.vmaxKt != null ? Math.abs(fp.vmaxKt - bt.vmaxKt) : null
    const mslpHpa =
      fp.mslpHpa != null && bt.mslpHpa != null ? Math.abs(fp.mslpHpa - bt.mslpHpa) : null
    out.set(lead, { trackKm, windKt, mslpHpa })
  }
  return out
}

export function computeErrors(
  best: TrackPoint[],
  wn: TrackPoint[],
  baseline: TrackPoint[],
): ErrorsAtLead[] {
  const wnMap = errorSeries(wn, best)
  const baseMap = errorSeries(baseline, best)
  const leads = [...new Set([...wnMap.keys(), ...baseMap.keys()])].sort((a, b) => a - b)
  return leads.map((leadHours) => {
    const w = wnMap.get(leadHours)
    const b = baseMap.get(leadHours)
    return {
      leadHours,
      wnTrackKm: w?.trackKm ?? null,
      baselineTrackKm: b?.trackKm ?? null,
      wnWindKt: w?.windKt ?? null,
      baselineWindKt: b?.windKt ?? null,
      wnMslpHpa: w?.mslpHpa ?? null,
      baselineMslpHpa: b?.mslpHpa ?? null,
    }
  })
}

export function fmt(n: number | null, digits = 0, unit = ''): string {
  if (n == null || Number.isNaN(n)) return '—'
  return `${n.toFixed(digits)}${unit}`
}

export function interpolateAlongTrack(
  track: TrackPoint[],
  leadHours: number,
): TrackPoint | null {
  if (track.length === 0) return null
  const sorted = [...track].sort((a, b) => (a.leadHours ?? 0) - (b.leadHours ?? 0))
  if (leadHours <= (sorted[0].leadHours ?? 0)) return sorted[0]
  if (leadHours >= (sorted[sorted.length - 1].leadHours ?? 0)) return sorted[sorted.length - 1]
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    const la = a.leadHours ?? 0
    const lb = b.leadHours ?? 0
    if (leadHours >= la && leadHours <= lb) {
      const t = lb === la ? 0 : (leadHours - la) / (lb - la)
      return {
        time: a.time,
        lat: a.lat + (b.lat - a.lat) * t,
        lon: a.lon + (b.lon - a.lon) * t,
        vmaxKt:
          a.vmaxKt != null && b.vmaxKt != null ? a.vmaxKt + (b.vmaxKt - a.vmaxKt) * t : a.vmaxKt,
        mslpHpa:
          a.mslpHpa != null && b.mslpHpa != null
            ? a.mslpHpa + (b.mslpHpa - a.mslpHpa) * t
            : a.mslpHpa,
        leadHours,
      }
    }
  }
  return null
}
