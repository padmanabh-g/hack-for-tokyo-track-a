import { NextResponse } from 'next/server'
import { getAllData } from '@/lib/data'
import { findGapLocations } from '@/lib/geo'
import type { WardProperties } from '@/lib/types'

export async function POST(req: Request) {
  const { wardName } = await req.json()
  const { wards, stations } = await getAllData()

  const wardFeature = wards.features.find(
    f => (f.properties as WardProperties).ward_name === wardName
  )
  if (!wardFeature) return NextResponse.json({ error: 'Ward not found' }, { status: 404 })

  // Get station coordinates
  const wardStations = stations.features
    .filter(f => {
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
      return lng >= 139.55 && lng <= 139.92 && lat >= 35.50 && lat <= 35.82
    })
    .map(f => {
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
      return [lng, lat] as [number, number]
    })

  const gaps = findGapLocations(wardFeature, wardStations)
  return NextResponse.json({ gaps })
}
