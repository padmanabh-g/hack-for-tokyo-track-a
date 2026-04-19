import { readFileSync } from 'fs'
import { cache } from 'react'
import { filterTokyoStations, computeAnalysis } from './geo'
import type { AnalysisResult } from './types'

const WARD_GEO_URL = 'https://raw.githubusercontent.com/dataofjapan/land/master/tokyo.geojson'

export const getAllData = cache(async (): Promise<AnalysisResult> => {
  const mymizuPath = process.env.MYMIZU_DATA_PATH
  if (!mymizuPath) throw new Error('MYMIZU_DATA_PATH not set')

  const rawData = JSON.parse(readFileSync(mymizuPath, 'utf-8'))
  const stations = filterTokyoStations(rawData)

  const wardResp = await fetch(WARD_GEO_URL, { cache: 'no-store' })
  if (!wardResp.ok) throw new Error('Failed to fetch ward GeoJSON')
  const wardsRaw = await wardResp.json()
  // Filter to 23 special wards only
  const wards23 = {
    ...wardsRaw,
    features: wardsRaw.features.filter((f: GeoJSON.Feature) => (f.properties as Record<string, string>)?.area_en === 'Tokubu'),
  }

  return computeAnalysis(stations, wards23)
})
