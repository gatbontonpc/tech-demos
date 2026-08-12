import './style.css'
import type { CacheFile, ErrorsAtLead, LayerKey, StormCache, TrackPoint } from './types'
import { computeErrors, fmt } from './metrics'
import { renderErrorChart } from './chart'
import { createMap } from './mapView'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <h1>WeatherNext verification playground</h1>
      <p>Real ATCF tracks: WeatherNext cyclone mean (GDMI) vs NHC official (OFCL) against best track.</p>
      <div class="cache-pill" id="cache-pill"><span class="dot"></span><span id="cache-label">Loading cache…</span></div>
    </div>
  </header>
  <div class="layout">
    <section class="map-pane">
      <div id="map"></div>
      <div class="map-legend">
        <span><i class="swatch truth"></i> Best track (truth)</span>
        <span><i class="swatch wn"></i> WeatherNext GDMI</span>
        <span><i class="swatch baseline"></i> NHC OFCL</span>
        <span><i class="swatch ensemble"></i> WN related (GDMN/GDM2)</span>
      </div>
    </section>
    <aside class="side">
      <div class="panel">
        <h2>Controls</h2>
        <div class="controls">
          <label class="field">Storm
            <select id="storm"></select>
          </label>
          <label class="field">Forecast init (UTC)
            <select id="init"></select>
          </label>
          <div>
            <div class="lead-readout"><span>Lead time</span><span id="lead-label">+0 h</span></div>
            <input id="lead" type="range" min="0" max="120" step="12" value="48" />
          </div>
          <div class="toggles">
            <label><input type="checkbox" data-layer="truth" checked /> Truth</label>
            <label><input type="checkbox" data-layer="wn" checked /> WeatherNext</label>
            <label><input type="checkbox" data-layer="baseline" checked /> Baseline</label>
            <label><input type="checkbox" data-layer="ensemble" checked /> Ensemble / related</label>
          </div>
        </div>
      </div>
      <div class="panel">
        <h2>Scoreboard at scrubber</h2>
        <div class="scoreboard" id="scoreboard"></div>
      </div>
      <div class="panel">
        <h2>Does it beat ops?</h2>
        <p class="note">Track error vs best track by lead time for this init. Lower is better.</p>
        <div class="chart-wrap" id="chart"></div>
      </div>
      <p class="note" id="storm-note"></p>
    </aside>
  </div>
  <footer class="footer">
    <strong>Disclaimer:</strong> Not an official weather service. For warnings and guidance use
    <a href="https://www.nhc.noaa.gov/" target="_blank" rel="noreferrer">NHC</a> / your national met service.
    Data: NOAA ATCF archive (BEST / OFCL / GDMI). WeatherNext Cyclones operated as FNV3; NHC posts the mean as GDMI.
    Open-Meteo exposes WeatherNext 2 atmospheric fields, not ATCF cyclone tracks — this demo uses the archived track guidance.
  </footer>
`

async function loadCache(): Promise<CacheFile> {
  const res = await fetch('/data/storms.json')
  if (!res.ok) throw new Error('Missing public/data/storms.json — run npm run fetch-data')
  return (await res.json()) as CacheFile
}

function formatInit(iso: string): string {
  const d = new Date(iso)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const h = String(d.getUTCHours()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}Z`
}

function ageLabel(iso: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000))
  const when = new Date(iso).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
  return `Offline cache · fetched ${when} · ${days}d old`
}

function pickWnTrack(
  storm: StormCache,
  initIso: string,
): { wn: TrackPoint[]; baseline: TrackPoint[]; ensemble: TrackPoint[][] } {
  const init = storm.inits.find((i) => i.initTime === initIso)
  if (!init) return { wn: [], baseline: [], ensemble: [] }
  const wn = init.gdmi.length ? init.gdmi : init.gdmn
  const ensemble = [init.gdmn, init.gdm2].filter((t) => t.length > 0)
  return { wn, baseline: init.ofcl, ensemble }
}

function renderScoreboard(el: HTMLElement, series: ErrorsAtLead[], lead: number) {
  const row = series.find((s) => s.leadHours === lead) ?? null
  const beat =
    row && row.wnTrackKm != null && row.baselineTrackKm != null
      ? row.wnTrackKm < row.baselineTrackKm
        ? 'WeatherNext closer on track at this lead'
        : row.wnTrackKm > row.baselineTrackKm
          ? 'NHC closer on track at this lead'
          : 'Tied on track at this lead'
      : 'Insufficient overlap at this lead'

  el.innerHTML = `
    <div class="score-row">
      <div></div>
      <div class="score-head wn">WeatherNext</div>
      <div class="score-head baseline">NHC OFCL</div>
    </div>
    <div class="score-row">
      <div class="label">Track error</div>
      <div class="val wn">${fmt(row?.wnTrackKm ?? null, 0, ' km')}</div>
      <div class="val baseline">${fmt(row?.baselineTrackKm ?? null, 0, ' km')}</div>
    </div>
    <div class="score-row">
      <div class="label">|ΔVmax|</div>
      <div class="val wn">${fmt(row?.wnWindKt ?? null, 0, ' kt')}</div>
      <div class="val baseline">${fmt(row?.baselineWindKt ?? null, 0, ' kt')}</div>
    </div>
    <div class="score-row">
      <div class="label">|ΔMSLP|</div>
      <div class="val wn">${fmt(row?.wnMslpHpa ?? null, 0, ' hPa')}</div>
      <div class="val baseline">${fmt(row?.baselineMslpHpa ?? null, 0, ' hPa')}</div>
    </div>
    <p class="note" style="margin-top:0.35rem">${beat}. Intensity uses available vmax/mslp in ATCF rows (OFCL often omits MSLP).</p>
  `
}

async function main() {
  const cache = await loadCache()
  const cacheLabel = document.querySelector('#cache-label')!
  cacheLabel.textContent = ageLabel(cache.generatedAt)

  const stormSelect = document.querySelector<HTMLSelectElement>('#storm')!
  const initSelect = document.querySelector<HTMLSelectElement>('#init')!
  const leadInput = document.querySelector<HTMLInputElement>('#lead')!
  const leadLabel = document.querySelector('#lead-label')!
  const scoreboard = document.querySelector<HTMLElement>('#scoreboard')!
  const chartEl = document.querySelector<HTMLElement>('#chart')!
  const stormNote = document.querySelector('#storm-note')!
  const map = createMap(document.querySelector('#map')!)

  const layers: Record<LayerKey, boolean> = {
    truth: true,
    wn: true,
    baseline: true,
    ensemble: true,
  }

  for (const s of cache.storms) {
    const opt = document.createElement('option')
    opt.value = s.id
    opt.textContent = `${s.name} (${s.id})`
    stormSelect.appendChild(opt)
  }

  function currentStorm(): StormCache {
    return cache.storms.find((s) => s.id === stormSelect.value) ?? cache.storms[0]
  }

  function refillInits() {
    const storm = currentStorm()
    initSelect.innerHTML = ''
    for (const init of storm.inits) {
      const opt = document.createElement('option')
      opt.value = init.initTime
      const hasWn = init.gdmi.length || init.gdmn.length
      opt.textContent = `${formatInit(init.initTime)} · WN ${hasWn ? '✓' : '—'} · OFCL ${init.ofcl.length ? '✓' : '—'}`
      initSelect.appendChild(opt)
    }
    // Prefer an init near peak intensity / mid-life if available.
    if (storm.inits.length) {
      const mid = storm.inits[Math.floor(storm.inits.length / 2)]
      initSelect.value = mid.initTime
    }
    stormNote.textContent = storm.note
  }

  function refresh() {
    const storm = currentStorm()
    const initIso = initSelect.value
    const { wn, baseline, ensemble } = pickWnTrack(storm, initIso)
    const lead = Number(leadInput.value)
    leadLabel.textContent = `+${lead} h`

    map.setLayers(layers)
    map.setTracks({
      truth: storm.bestTrack,
      wn,
      baseline,
      ensemble,
    })
    map.setLeadHours(lead, initIso)

    const series = computeErrors(storm.bestTrack, wn, baseline)
    const maxLead = Math.max(120, ...series.map((s) => s.leadHours), 0)
    leadInput.max = String(Math.min(168, maxLead))
    renderScoreboard(scoreboard, series, lead)
    renderErrorChart(chartEl, series, lead)
  }

  stormSelect.addEventListener('change', () => {
    refillInits()
    refresh()
    map.fit()
  })
  initSelect.addEventListener('change', () => {
    refresh()
    map.fit()
  })
  leadInput.addEventListener('input', () => refresh())

  for (const input of document.querySelectorAll<HTMLInputElement>('input[data-layer]')) {
    input.addEventListener('change', () => {
      const key = input.dataset.layer as LayerKey
      layers[key] = input.checked
      refresh()
    })
  }

  refillInits()
  // Default to Melissa if present.
  const melissa = cache.storms.find((s) => s.name === 'Melissa')
  if (melissa) stormSelect.value = melissa.id
  refillInits()
  // Prefer Melissa init around 2025-10-25 00Z (RI / Jamaica approach) when present.
  const preferred = currentStorm().inits.find((i) => i.initTime.startsWith('2025-10-25T00'))
  if (preferred) initSelect.value = preferred.initTime
  leadInput.value = '72'
  refresh()
  map.fit()
}

main().catch((err) => {
  app.innerHTML = `<pre style="padding:2rem;color:#ff8f8f">Failed to start: ${String(err)}</pre>`
  console.error(err)
})
