import L from 'leaflet'
import type { LayerKey, TrackPoint } from './types'
import { interpolateAlongTrack } from './metrics'

const COLORS = {
  truth: '#f4f1e8',
  wn: '#3ecfcf',
  baseline: '#f0a35e',
  ensemble: '#7aa2ff',
  marker: '#ffffff',
}

export type MapController = {
  setTracks: (tracks: {
    truth: TrackPoint[]
    wn: TrackPoint[]
    baseline: TrackPoint[]
    ensemble: TrackPoint[][]
  }) => void
  setLayers: (layers: Record<LayerKey, boolean>) => void
  setLeadHours: (lead: number, initTime: string) => void
  fit: () => void
}

export function createMap(container: HTMLElement): MapController {
  const map = L.map(container, {
    zoomControl: true,
    attributionControl: true,
  }).setView([20, -60], 4)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 18,
  }).addTo(map)

  const truthLine = L.polyline([], { color: COLORS.truth, weight: 3.5, opacity: 0.95 }).addTo(map)
  const wnLine = L.polyline([], { color: COLORS.wn, weight: 3, opacity: 0.95 }).addTo(map)
  const baseLine = L.polyline([], {
    color: COLORS.baseline,
    weight: 3,
    opacity: 0.9,
    dashArray: '8 6',
  }).addTo(map)
  const ensembleGroup = L.layerGroup().addTo(map)
  const markerGroup = L.layerGroup().addTo(map)

  let tracks = {
    truth: [] as TrackPoint[],
    wn: [] as TrackPoint[],
    baseline: [] as TrackPoint[],
    ensemble: [] as TrackPoint[][],
  }
  let layers: Record<LayerKey, boolean> = {
    truth: true,
    wn: true,
    baseline: true,
    ensemble: true,
  }

  function latLngs(pts: TrackPoint[]): L.LatLngExpression[] {
    return pts.map((p) => [p.lat, p.lon] as L.LatLngExpression)
  }

  function syncVisibility() {
    const set = (layer: L.Layer, on: boolean) => {
      if (on) {
        if (!map.hasLayer(layer)) layer.addTo(map)
      } else if (map.hasLayer(layer)) {
        map.removeLayer(layer)
      }
    }
    set(truthLine, layers.truth)
    set(wnLine, layers.wn)
    set(baseLine, layers.baseline)
    set(ensembleGroup, layers.ensemble)
  }

  function redrawLines() {
    truthLine.setLatLngs(latLngs(tracks.truth))
    wnLine.setLatLngs(latLngs(tracks.wn))
    baseLine.setLatLngs(latLngs(tracks.baseline))
    ensembleGroup.clearLayers()
    for (const member of tracks.ensemble) {
      L.polyline(latLngs(member), {
        color: COLORS.ensemble,
        weight: 1.25,
        opacity: 0.45,
      }).addTo(ensembleGroup)
    }
    syncVisibility()
  }

  function setTracks(next: typeof tracks) {
    tracks = next
    redrawLines()
  }

  function setLayers(next: Record<LayerKey, boolean>) {
    layers = next
    syncVisibility()
  }

  function setLeadHours(lead: number, initTime: string) {
    markerGroup.clearLayers()
    const initMs = new Date(initTime).getTime()
    const truthAt = tracks.truth.find((p) => {
      const leadH = (new Date(p.time).getTime() - initMs) / 3600_000
      return Math.abs(leadH - lead) < 3
    })
    const candidates: { pt: TrackPoint | null; color: string; label: string; show: boolean }[] = [
      { pt: truthAt ?? null, color: COLORS.truth, label: 'Best track', show: layers.truth },
      {
        pt: interpolateAlongTrack(tracks.wn, lead),
        color: COLORS.wn,
        label: 'WeatherNext',
        show: layers.wn,
      },
      {
        pt: interpolateAlongTrack(tracks.baseline, lead),
        color: COLORS.baseline,
        label: 'NHC OFCL',
        show: layers.baseline,
      },
    ]
    for (const c of candidates) {
      if (!c.show || !c.pt) continue
      L.circleMarker([c.pt.lat, c.pt.lon], {
        radius: 6,
        color: c.color,
        weight: 2,
        fillColor: COLORS.marker,
        fillOpacity: 0.9,
      })
        .bindTooltip(`${c.label} · +${lead}h`, { direction: 'top' })
        .addTo(markerGroup)
    }
  }

  function fit() {
    const all = [...tracks.truth, ...tracks.wn, ...tracks.baseline, ...tracks.ensemble.flat()]
    if (all.length === 0) return
    const bounds = L.latLngBounds(all.map((p) => [p.lat, p.lon] as [number, number]))
    map.fitBounds(bounds.pad(0.2))
    setTimeout(() => map.invalidateSize(), 50)
  }

  return { setTracks, setLayers, setLeadHours, fit }
}
