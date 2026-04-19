import * as turf from '@turf/turf'
import type { Feature, Polygon, MultiPolygon } from 'geojson'
import { WARD_WASTE, WARD_POPULATION } from './constants'
import type { StationRecord, WardProperties, GapLocation, AnalysisResult } from './types'

const DEG_LAT_M = 111320.0
const DEG_LNG_M = 91290.0

export function filterTokyoStations(data: StationRecord[]): StationRecord[] {
  return data.filter(s =>
    s.latitude >= 35.50 && s.latitude <= 35.82 &&
    s.longitude >= 139.55 && s.longitude <= 139.92
  )
}

export function computeAnalysis(
  stations: StationRecord[],
  wardsRaw: GeoJSON.FeatureCollection
): AnalysisResult {
  // 1. Normalize ward names (strip " Ku")
  const wards = {
    ...wardsRaw,
    features: wardsRaw.features.map((f, i) => ({
      ...f,
      id: i,
      properties: {
        ...f.properties,
        ward_name: (f.properties?.ward_en as string ?? '').replace(/ Ku$/, ''),
      }
    }))
  }

  // 2. Count stations per ward via point-in-polygon
  const wardCounts: Record<string, number> = {}
  for (const station of stations) {
    const pt = turf.point([station.longitude, station.latitude])
    for (const ward of wards.features) {
      try {
        if (turf.booleanPointInPolygon(pt, ward as Feature<Polygon | MultiPolygon>)) {
          const name = ward.properties?.ward_name as string
          wardCounts[name] = (wardCounts[name] ?? 0) + 1
          break
        }
      } catch { /* skip malformed geometries */ }
    }
  }

  // 3. Compute metrics per ward
  const features = wards.features.map(ward => {
    const name = ward.properties?.ward_name as string
    const stationCount = wardCounts[name] ?? 0
    const areaKm2 = turf.area(ward as Feature) / 1e6
    const coverageDensity = stationCount / areaKm2
    const wastePerCapita = WARD_WASTE[name] ?? 47.0
    const population = WARD_POPULATION[name] ?? 300000
    const wasteTonnes = (wastePerCapita * population) / 1000
    const desertSeverity = wastePerCapita / (coverageDensity + 0.01)

    return {
      ...ward,
      properties: {
        ...ward.properties,
        ward_name: name,
        station_count: stationCount,
        area_km2: Math.round(areaKm2 * 100) / 100,
        coverage_density: Math.round(coverageDensity * 100) / 100,
        waste_per_capita: wastePerCapita,
        population,
        waste_tonnes: Math.round(wasteTonnes),
        desert_severity: desertSeverity,
        severity_score: 0,
      } as WardProperties,
    }
  })

  // 4. Normalize severity to [0, 100]
  const severities = features.map(f => (f.properties as WardProperties).desert_severity)
  const minS = Math.min(...severities)
  const maxS = Math.max(...severities)
  features.forEach(f => {
    const props = f.properties as WardProperties
    props.severity_score = Math.round(((props.desert_severity - minS) / (maxS - minS)) * 100 * 10) / 10
  })

  // 5. Build stations GeoJSON
  const stationsGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: stations.map((s, i) => ({
      type: 'Feature',
      id: i,
      properties: {
        name: typeof s.name === 'object'
          ? ((s.name as { en?: string; ja?: string })?.en || (s.name as { en?: string; ja?: string })?.ja || 'mymizu station')
          : (s.name || 'mymizu station'),
      },
      geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
    })),
  }

  // 6. Stats
  const sorted = [...features].sort((a, b) =>
    (b.properties as WardProperties).desert_severity - (a.properties as WardProperties).desert_severity
  )
  const bestCovered = [...features].sort((a, b) =>
    (b.properties as WardProperties).coverage_density - (a.properties as WardProperties).coverage_density
  )[0]
  const avgCoverage = features.reduce((sum, f) => sum + (f.properties as WardProperties).coverage_density, 0) / features.length

  return {
    wards: { type: 'FeatureCollection', features },
    stations: stationsGeoJSON,
    stats: {
      totalStations: stations.length,
      worstWard: (sorted[0].properties as WardProperties).ward_name,
      worstScore: (sorted[0].properties as WardProperties).severity_score,
      bestCoveredWard: (bestCovered.properties as WardProperties).ward_name,
      avgCoverage: Math.round(avgCoverage * 100) / 100,
    },
  }
}

export function findGapLocations(
  wardFeature: GeoJSON.Feature,
  stationCoords: [number, number][],
  n = 3,
  gridN = 40,
  minSepM = 350,
): GapLocation[] {
  const bbox = turf.bbox(wardFeature as Feature)
  const [minX, minY, maxX, maxY] = bbox

  const candidates: [number, number][] = []
  for (let i = 0; i < gridN; i++) {
    for (let j = 0; j < gridN; j++) {
      const x = minX + (maxX - minX) * (i / (gridN - 1))
      const y = minY + (maxY - minY) * (j / (gridN - 1))
      try {
        if (turf.booleanPointInPolygon(turf.point([x, y]), wardFeature as Feature<Polygon | MultiPolygon>)) {
          candidates.push([x, y])
        }
      } catch { /* skip */ }
    }
  }

  if (!candidates.length) {
    const c = turf.centroid(wardFeature as Feature)
    const [lng, lat] = c.geometry.coordinates
    return [{ lat, lng, gap_m: 500, bottles_per_year: gapToBottles(500) }]
  }

  const minGap = (lng: number, lat: number): number => {
    if (!stationCoords.length) return 9999
    return Math.min(...stationCoords.map(([slng, slat]) => {
      const dx = (lng - slng) * DEG_LNG_M
      const dy = (lat - slat) * DEG_LAT_M
      return Math.sqrt(dx * dx + dy * dy)
    }))
  }

  const scored = candidates
    .map(([lng, lat]) => ({ lng, lat, gap: minGap(lng, lat) }))
    .sort((a, b) => b.gap - a.gap)

  const results: GapLocation[] = []
  const used: [number, number][] = []

  for (const { lng, lat, gap } of scored) {
    const tooClose = used.some(([ulng, ulat]) => {
      const dx = (lng - ulng) * DEG_LNG_M
      const dy = (lat - ulat) * DEG_LAT_M
      return Math.sqrt(dx * dx + dy * dy) < minSepM
    })
    if (!tooClose) {
      results.push({ lat, lng, gap_m: gap, bottles_per_year: gapToBottles(gap) })
      used.push([lng, lat])
    }
    if (results.length >= n) break
  }

  return results
}

export function gapToBottles(gapM: number): number {
  // Catchment scales with gap size: larger gap = more underserved people
  const radiusKm = (gapM / 2) / 1000
  const catchmentPpl = Math.round(Math.PI * radiusKm ** 2 * 6000) // 6000 ppl/km² Tokyo avg
  const adoption = 0.05 // 5% of catchment switches to refill
  return Math.round(catchmentPpl * adoption * 2 * 250)
}
