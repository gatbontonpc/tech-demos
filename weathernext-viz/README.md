# WeatherNext verification playground

Interactive offline-capable demo that verifies **real** Google DeepMind WeatherNext cyclone track guidance against **real** NHC official forecasts and NOAA best track.

**Not an official weather service.** For watches, warnings, and life-safety decisions, use the [National Hurricane Center](https://www.nhc.noaa.gov/) or your national meteorological service.

## Quick start

```bash
cd weathernext-viz
npm install
npm run dev
```

Open **http://localhost:5173**.

The UI reads a tiny cached JSON subset under `public/data/storms.json` so the demo runs without API keys.

## What you are looking at

| Layer | Source | ATCF tech |
| --- | --- | --- |
| Best track (truth) | NHC ATCF b-deck | `BEST` |
| WeatherNext mean | NHC ATCF a-deck (2025 ops) | `GDMI` (FNV3 / WeatherNext Cyclones ensemble mean, 6-h interpolated); `GDMN` native mean also cached |
| Baseline | NHC official forecast | `OFCL` |
| Ensemble / related | Same a-deck | `GDMN` + `GDM2` when present (public NHC archive does not retain `F000`–`F049` member spaghetti) |

Storms in the default cache: **Erin, Gabrielle, Humberto, Melissa** (Atlantic 2025) — chosen for overlapping GDMI + OFCL coverage and public recognition (Melissa is the DeepMind/NHC Jamaica landfall case).

Scoreboard + chart compute track error (haversine km) and intensity error (|ΔVmax| kt, |ΔMSLP| hPa when present) vs best track at each lead time for the selected init.

## Refresh the cache

```bash
npm run fetch-data
```

This downloads compressed ATCF a/b decks from the public NHC archive, extracts only the needed techs/init cadence, and rewrites `public/data/storms.json`. Cache freshness is shown in the UI pill.

Open-Meteo’s [Google WeatherNext API](https://open-meteo.com/en/docs/google-weathernext-api) serves **atmospheric ensemble fields**, not cyclone track lines. Cyclone track verification here uses the **archived NHC ATCF WeatherNext guidance** that ran in operations during 2025. Weather Lab historical downloads require Google sign-in; this demo deliberately stays on the public ATCF feed so it works offline.

## Data sources & citations

- NHC ATCF archive: https://ftp.nhc.noaa.gov/atcf/archive/
- NHC data page / HURDAT2: https://www.nhc.noaa.gov/data/
- IBTrACS: https://www.ncei.noaa.gov/products/international-best-track-archive
- WeatherNext cyclone breakthrough: https://deepmind.google/blog/weathernext-ai-model-achieves-breakthrough-in-forecasting-cyclones/
- WeatherNext code: https://github.com/google-deepmind/weathernext
- Open-Meteo WeatherNext API: https://open-meteo.com/en/docs/google-weathernext-api
- NHC 2025 verification report (GDMI discussion): https://www.nhc.noaa.gov/verification/pdfs/Verification_2025.pdf

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port **5173** |
| `npm run build` | Production build |
| `npm run preview` | Preview build on port **5173** |
| `npm run fetch-data` | Refresh cached real ATCF storm pairs |

## Notes

- No multi-GB model weights are vendored.
- Cached JSON is a few storms / strided inits only — enough for a meaningful verification playground, not a research-grade archive.
