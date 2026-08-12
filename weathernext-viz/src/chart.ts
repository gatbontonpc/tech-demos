import type { ErrorsAtLead } from './types'

export function renderErrorChart(el: HTMLElement, series: ErrorsAtLead[], scrubLead: number): void {
  const width = 520
  const height = 220
  const pad = { top: 18, right: 16, bottom: 36, left: 44 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const leads = series.map((s) => s.leadHours)
  const vals = series.flatMap((s) => [s.wnTrackKm, s.baselineTrackKm]).filter((v): v is number => v != null)
  const maxY = Math.max(50, ...(vals.length ? vals : [100])) * 1.1
  const minX = Math.min(...leads, 0)
  const maxX = Math.max(...leads, 120)

  const x = (lead: number) => pad.left + ((lead - minX) / (maxX - minX || 1)) * innerW
  const y = (km: number) => pad.top + innerH - (km / maxY) * innerH

  const pathFor = (key: 'wnTrackKm' | 'baselineTrackKm') => {
    const pts = series
      .filter((s) => s[key] != null)
      .map((s) => `${x(s.leadHours)},${y(s[key] as number)}`)
    return pts.length ? `M ${pts.join(' L ')}` : ''
  }

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxY)
  const scrubX = x(scrubLead)

  el.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Track error versus lead time">
      <rect class="chart-bg" x="0" y="0" width="${width}" height="${height}" rx="10" />
      ${gridYs
        .map(
          (g) => `
        <line class="grid" x1="${pad.left}" y1="${y(g)}" x2="${width - pad.right}" y2="${y(g)}" />
        <text class="tick" x="${pad.left - 6}" y="${y(g) + 3}" text-anchor="end">${Math.round(g)}</text>
      `,
        )
        .join('')}
      <text class="axis-label" x="${pad.left - 34}" y="${pad.top + innerH / 2}" transform="rotate(-90 ${pad.left - 34} ${pad.top + innerH / 2})">Track error (km)</text>
      <text class="axis-label" x="${pad.left + innerW / 2}" y="${height - 8}" text-anchor="middle">Lead time (h)</text>
      ${[0, 24, 48, 72, 96, 120]
        .filter((h) => h >= minX && h <= maxX)
        .map(
          (h) => `
        <text class="tick" x="${x(h)}" y="${height - 18}" text-anchor="middle">${h}</text>
      `,
        )
        .join('')}
      <path class="series-wn" d="${pathFor('wnTrackKm')}" fill="none" />
      <path class="series-base" d="${pathFor('baselineTrackKm')}" fill="none" />
      <line class="scrub" x1="${scrubX}" y1="${pad.top}" x2="${scrubX}" y2="${pad.top + innerH}" />
      <g class="legend">
        <rect x="${pad.left}" y="4" width="10" height="3" class="series-wn-swatch" />
        <text x="${pad.left + 14}" y="10">WeatherNext (GDMI)</text>
        <rect x="${pad.left + 150}" y="4" width="10" height="3" class="series-base-swatch" />
        <text x="${pad.left + 164}" y="10">NHC official (OFCL)</text>
      </g>
    </svg>
  `
}
