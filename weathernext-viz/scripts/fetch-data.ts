/**
 * Refresh cached real cyclone forecast + best-track pairs from NOAA NHC ATCF.
 *
 * WeatherNext Cyclones ran operationally in 2025 as FNV3; NHC archives the
 * ensemble-mean guidance as GDMI (6-h interpolated) and GDMN (native).
 * Official NHC forecasts are OFCL. Best track comes from b-deck BEST rows.
 *
 * Usage: npm run fetch-data
 */
import { createGunzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '../public/data')
const ATCF_BASE = 'https://ftp.nhc.noaa.gov/atcf/archive'

/** Well-known 2025 Atlantic storms with overlapping GDMI + OFCL coverage. */
const STORMS = [
  {
    id: 'AL052025',
    name: 'Erin',
    year: 2025,
    basin: 'al',
    number: '05',
    note: 'Major Atlantic hurricane; dense WeatherNext (GDMI) + NHC coverage.',
  },
  {
    id: 'AL072025',
    name: 'Gabrielle',
    year: 2025,
    basin: 'al',
    number: '07',
    note: 'Late-season hurricane with multi-day overlapping init times.',
  },
  {
    id: 'AL082025',
    name: 'Humberto',
    year: 2025,
    basin: 'al',
    number: '08',
    note: 'Atlantic hurricane concurrent with Imelda period.',
  },
  {
    id: 'AL132025',
    name: 'Melissa',
    year: 2025,
    basin: 'al',
    number: '13',
    note: 'Historic Jamaica landfall case highlighted by DeepMind / NHC collaboration.',
  },
] as const

const FORECAST_TECHS = new Set(['OFCL', 'GDMI', 'GDMN', 'GDM2'])
/** Keep every N hours of init times to bound cache size. */
const INIT_STRIDE_HOURS = 12
/** Prefer these lead times for verification (hours). */
const KEEP_TAUS = new Set([0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 144, 168])

export type TrackPoint = {
  time: string // ISO UTC
  lat: number
  lon: number
  vmaxKt: number | null
  mslpHpa: number | null
  leadHours?: number
}

export type ForecastInit = {
  initTime: string
  ofcl: TrackPoint[]
  gdmi: TrackPoint[]
  gdmn: TrackPoint[]
  gdm2: TrackPoint[]
}

export type StormCache = {
  id: string
  name: string
  year: number
  basin: string
  number: string
  note: string
  bestTrack: TrackPoint[]
  inits: ForecastInit[]
}

export type CacheFile = {
  generatedAt: string
  source: {
    atcfArchive: string
    weathernextTech: string
    baselineTech: string
    bestTrack: string
    citations: string[]
  }
  storms: StormCache[]
}

function parseLat(raw: string): number | null {
  const m = raw.trim().match(/^(\d+)(\.\d+)?([NS])$/i)
  if (!m) return null
  const v = Number(m[1] + (m[2] ?? '')) / (m[2] ? 1 : 10)
  return m[3].toUpperCase() === 'S' ? -v : v
}

function parseLon(raw: string): number | null {
  const m = raw.trim().match(/^(\d+)(\.\d+)?([EW])$/i)
  if (!m) return null
  const v = Number(m[1] + (m[2] ?? '')) / (m[2] ? 1 : 10)
  return m[3].toUpperCase() === 'W' ? -v : v
}

function ymdhToIso(ymdh: string): string {
  const y = ymdh.slice(0, 4)
  const mo = ymdh.slice(4, 6)
  const d = ymdh.slice(6, 8)
  const h = ymdh.slice(8, 10)
  return `${y}-${mo}-${d}T${h}:00:00.000Z`
}

function addHoursIso(iso: string, hours: number): string {
  const t = new Date(iso).getTime() + hours * 3600_000
  return new Date(t).toISOString()
}

async function fetchGunzipText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  // Some tiny files may not be gzip; detect magic.
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const chunks: Buffer[] = []
    await pipeline(
      Readable.from(buf),
      createGunzip(),
      async function* (source) {
        for await (const chunk of source) {
          chunks.push(Buffer.from(chunk))
        }
      },
    )
    return Buffer.concat(chunks).toString('utf8')
  }
  return buf.toString('utf8')
}

type RawPt = {
  init: string
  tech: string
  tau: number
  lat: number
  lon: number
  vmaxKt: number | null
  mslpHpa: number | null
}

function parseAdeck(text: string): RawPt[] {
  const out: RawPt[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const p = line.split(',').map((s) => s.trim())
    if (p.length < 10) continue
    const tech = p[4]
    if (!FORECAST_TECHS.has(tech)) continue
    const tau = Number(p[5])
    if (!Number.isFinite(tau) || !KEEP_TAUS.has(tau)) continue
    const lat = parseLat(p[6])
    const lon = parseLon(p[7])
    if (lat == null || lon == null) continue
    const vmax = Number(p[8])
    const mslp = Number(p[9])
    out.push({
      init: p[2],
      tech,
      tau,
      lat,
      lon,
      vmaxKt: Number.isFinite(vmax) && vmax > 0 ? vmax : null,
      mslpHpa: Number.isFinite(mslp) && mslp > 0 ? mslp : null,
    })
  }
  return out
}

function parseBdeck(text: string): TrackPoint[] {
  const byTime = new Map<string, TrackPoint>()
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const p = line.split(',').map((s) => s.trim())
    if (p.length < 10) continue
    if (p[4] !== 'BEST') continue
    const lat = parseLat(p[6])
    const lon = parseLon(p[7])
    if (lat == null || lon == null) continue
    const vmax = Number(p[8])
    const mslp = Number(p[9])
    const time = ymdhToIso(p[2])
    byTime.set(time, {
      time,
      lat,
      lon,
      vmaxKt: Number.isFinite(vmax) && vmax > 0 ? vmax : null,
      mslpHpa: Number.isFinite(mslp) && mslp > 0 ? mslp : null,
    })
  }
  return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time))
}

function dedupeTrack(points: RawPt[], initIso: string): TrackPoint[] {
  const byTau = new Map<number, TrackPoint>()
  for (const p of points) {
    if (!byTau.has(p.tau)) {
      byTau.set(p.tau, {
        time: addHoursIso(initIso, p.tau),
        lat: p.lat,
        lon: p.lon,
        vmaxKt: p.vmaxKt,
        mslpHpa: p.mslpHpa,
        leadHours: p.tau,
      })
    }
  }
  return [...byTau.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v)
}

function selectInits(ymdhList: string[]): string[] {
  const sorted = [...new Set(ymdhList)].sort()
  if (sorted.length === 0) return []
  const picked: string[] = []
  let lastMs = -Infinity
  for (const y of sorted) {
    const ms = new Date(ymdhToIso(y)).getTime()
    if (ms - lastMs >= INIT_STRIDE_HOURS * 3600_000 - 1) {
      picked.push(y)
      lastMs = ms
    }
  }
  // Always include first and last overlapping init.
  if (!picked.includes(sorted[0])) picked.unshift(sorted[0])
  if (!picked.includes(sorted[sorted.length - 1])) picked.push(sorted[sorted.length - 1])
  return [...new Set(picked)].sort()
}

async function buildStorm(meta: (typeof STORMS)[number]): Promise<StormCache> {
  const aUrl = `${ATCF_BASE}/${meta.year}/a${meta.basin}${meta.number}${meta.year}.dat.gz`
  const bUrl = `${ATCF_BASE}/${meta.year}/b${meta.basin}${meta.number}${meta.year}.dat.gz`
  console.log(`Fetching ${meta.name} (${meta.id})…`)
  const [aText, bText] = await Promise.all([fetchGunzipText(aUrl), fetchGunzipText(bUrl)])
  const bestTrack = parseBdeck(bText)
  const adeck = parseAdeck(aText)

  const byInitTech = new Map<string, RawPt[]>()
  for (const row of adeck) {
    const key = `${row.init}|${row.tech}`
    const arr = byInitTech.get(key) ?? []
    arr.push(row)
    byInitTech.set(key, arr)
  }

  const ofclInits = new Set<string>()
  const wnInits = new Set<string>()
  for (const key of byInitTech.keys()) {
    const [init, tech] = key.split('|')
    if (tech === 'OFCL') ofclInits.add(init)
    if (tech === 'GDMI' || tech === 'GDMN') wnInits.add(init)
  }
  const overlap = [...ofclInits].filter((i) => wnInits.has(i))
  const chosen = selectInits(overlap)

  const inits: ForecastInit[] = chosen.map((init) => {
    const initIso = ymdhToIso(init)
    const grab = (tech: string) => dedupeTrack(byInitTech.get(`${init}|${tech}`) ?? [], initIso)
    return {
      initTime: initIso,
      ofcl: grab('OFCL'),
      gdmi: grab('GDMI'),
      gdmn: grab('GDMN'),
      gdm2: grab('GDM2'),
    }
  })

  console.log(
    `  best-track points=${bestTrack.length}, overlapping inits kept=${inits.length} (of ${overlap.length})`,
  )
  return { ...meta, bestTrack, inits }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const storms: StormCache[] = []
  for (const s of STORMS) {
    storms.push(await buildStorm(s))
  }

  const cache: CacheFile = {
    generatedAt: new Date().toISOString(),
    source: {
      atcfArchive: ATCF_BASE,
      weathernextTech: 'GDMI (WeatherNext Cyclones / FNV3 ensemble mean; GDMN native mean also cached)',
      baselineTech: 'OFCL (NHC official forecast)',
      bestTrack: 'ATCF b-deck BEST (NHC best track; aligns with HURDAT2 / IBTrACS for AL)',
      citations: [
        'https://ftp.nhc.noaa.gov/atcf/archive/',
        'https://www.nhc.noaa.gov/data/',
        'https://www.ncei.noaa.gov/products/international-best-track-archive',
        'https://deepmind.google/blog/weathernext-ai-model-achieves-breakthrough-in-forecasting-cyclones/',
        'https://github.com/google-deepmind/weathernext',
        'https://open-meteo.com/en/docs/google-weathernext-api',
        'https://www.nhc.noaa.gov/verification/pdfs/Verification_2025.pdf',
      ],
    },
    storms,
  }

  const outPath = path.join(OUT_DIR, 'storms.json')
  await writeFile(outPath, JSON.stringify(cache))
  const kb = (Buffer.byteLength(JSON.stringify(cache)) / 1024).toFixed(1)
  console.log(`Wrote ${outPath} (${kb} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
