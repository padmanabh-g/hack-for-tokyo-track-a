export interface StationRecord {
  latitude: number
  longitude: number
  name?: { en?: string; ja?: string } | string
  [key: string]: unknown
}

export interface WardProperties {
  ward_name: string
  station_count: number
  area_km2: number
  coverage_density: number
  waste_per_capita: number
  population: number
  waste_tonnes: number
  desert_severity: number
  severity_score: number
}

export interface GapLocation {
  lat: number
  lng: number
  gap_m: number
  bottles_per_year: number
}

export interface AnalysisResult {
  wards: GeoJSON.FeatureCollection
  stations: GeoJSON.FeatureCollection
  stats: {
    totalStations: number
    worstWard: string
    worstScore: number
    bestCoveredWard: string
    avgCoverage: number
  }
}
