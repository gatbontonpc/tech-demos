export type TrackPoint = {
  time: string
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

export type LayerKey = 'truth' | 'wn' | 'baseline' | 'ensemble'

export type ErrorsAtLead = {
  leadHours: number
  wnTrackKm: number | null
  baselineTrackKm: number | null
  wnWindKt: number | null
  baselineWindKt: number | null
  wnMslpHpa: number | null
  baselineMslpHpa: number | null
}
