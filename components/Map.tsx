'use client'

import { useEffect, useRef, useCallback } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GapLocation } from '@/lib/types'

// Dynamic import to avoid SSR issues with maplibre
let maplibregl: typeof import('maplibre-gl') | null = null

interface MapProps {
  wardsGeoJSON: GeoJSON.FeatureCollection
  stationsGeoJSON: GeoJSON.FeatureCollection
  selectedWard: string | null
  gapLocations: GapLocation[]
  onWardClick: (wardName: string) => void
  onViewportChange?: (visibleWardNames: string[]) => void
}

const CARTO_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const SEVERITY_COLOR_EXPR = [
  'interpolate',
  ['linear'],
  ['get', 'severity_score'],
  0, '#ffffb2',
  25, '#fecc5c',
  50, '#fd8d3c',
  75, '#f03b20',
  100, '#bd0026',
] as maplibregl.ExpressionSpecification

export function Map({
  wardsGeoJSON,
  stationsGeoJSON,
  selectedWard,
  gapLocations,
  onWardClick,
  onViewportChange,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const gapMarkersRef = useRef<maplibregl.Marker[]>([])
  const hoveredWardRef = useRef<string | null>(null)
  const onWardClickRef = useRef(onWardClick)
  onWardClickRef.current = onWardClick
  const onViewportChangeRef = useRef(onViewportChange)
  onViewportChangeRef.current = onViewportChange

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let mapInstance: maplibregl.Map

    import('maplibre-gl').then((ml) => {
      maplibregl = ml

      mapInstance = new ml.Map({
        container: containerRef.current!,
        style: CARTO_STYLE,
        center: [139.69, 35.685],
        zoom: 10.5,
        minZoom: 9,
        maxZoom: 17,
        attributionControl: false,
      })

      mapRef.current = mapInstance

      // Scale control
      mapInstance.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-left')

      // Navigation control
      mapInstance.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right')

      // Popup for hover
      popupRef.current = new ml.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 8,
      })

      mapInstance.on('load', () => {
        // ── Ward fill source ──
        mapInstance.addSource('wards', {
          type: 'geojson',
          data: wardsGeoJSON,
          generateId: true,
        })

        // Ward fill layer with choropleth
        mapInstance.addLayer({
          id: 'ward-fill',
          type: 'fill',
          source: 'wards',
          paint: {
            'fill-color': SEVERITY_COLOR_EXPR,
            'fill-opacity': 0.75,
          },
        })

        // Ward border layer
        mapInstance.addLayer({
          id: 'ward-line',
          type: 'line',
          source: 'wards',
          paint: {
            'line-color': '#ffffff',
            'line-width': 1,
            'line-opacity': 0.6,
          },
        })

        // Selected ward highlight layer
        mapInstance.addLayer({
          id: 'ward-selected',
          type: 'fill',
          source: 'wards',
          paint: {
            'fill-color': '#FF6B35',
            'fill-opacity': [
              'case',
              ['==', ['get', 'ward_name'], selectedWard ?? ''],
              0.3,
              0,
            ],
          },
        })

        // Selected ward border
        mapInstance.addLayer({
          id: 'ward-selected-line',
          type: 'line',
          source: 'wards',
          paint: {
            'line-color': '#FF6B35',
            'line-width': [
              'case',
              ['==', ['get', 'ward_name'], selectedWard ?? ''],
              3,
              0,
            ],
            'line-opacity': 1,
          },
        })

        // Hover layer
        mapInstance.addLayer({
          id: 'ward-hover',
          type: 'fill',
          source: 'wards',
          paint: {
            'fill-color': '#ffffff',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.1,
              0,
            ],
          },
        })

        // ── Station cluster source ──
        mapInstance.addSource('stations', {
          type: 'geojson',
          data: stationsGeoJSON,
          cluster: true,
          clusterRadius: 30,
          clusterMaxZoom: 14,
        })

        // Cluster circles
        mapInstance.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'stations',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#0077B6',
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              10,
              10, 14,
              50, 18,
              200, 24,
            ],
            'circle-opacity': 0.8,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 0.4,
          },
        })

        // Cluster count labels
        mapInstance.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'stations',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Noto Sans Regular'],
            'text-size': 11,
          },
          paint: {
            'text-color': '#ffffff',
          },
        })

        // Unclustered station dots
        mapInstance.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'stations',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#0077B6',
            'circle-radius': 4,
            'circle-opacity': 0.75,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 0.4,
          },
        })

        // ── Viewport change: emit visible ward names on move/zoom ──
        const emitVisibleWards = () => {
          if (!onViewportChangeRef.current) return
          const features = mapInstance.queryRenderedFeatures(undefined, { layers: ['ward-fill'] })
          const names = [...new Set(
            features
              .map(f => f.properties?.ward_name as string)
              .filter(Boolean)
          )]
          onViewportChangeRef.current(names)
        }

        mapInstance.on('moveend', emitVisibleWards)
        mapInstance.on('zoomend', emitVisibleWards)
        // Emit once after initial render so panel starts in sync
        setTimeout(emitVisibleWards, 300)

        // ── Event handlers ──

        // Click on ward
        mapInstance.on('click', 'ward-fill', (e) => {
          const features = e.features
          if (!features || !features.length) return
          const wardName = features[0].properties?.ward_name as string
          if (wardName) onWardClickRef.current(wardName)
        })

        // Hover: show popup + feature state
        mapInstance.on('mousemove', 'ward-fill', (e) => {
          if (!e.features || !e.features.length) return
          mapInstance.getCanvas().style.cursor = 'pointer'

          const feature = e.features[0]
          const wardName = feature.properties?.ward_name as string
          const severityScore = feature.properties?.severity_score as number
          const stationCount = feature.properties?.station_count as number
          const wastePerCapita = feature.properties?.waste_per_capita as number

          // Update hover feature state
          if (hoveredWardRef.current !== wardName) {
            if (hoveredWardRef.current) {
              // Clear previous hover — find by ward_name
              const features = mapInstance.querySourceFeatures('wards', {
                sourceLayer: undefined,
                filter: ['==', 'ward_name', hoveredWardRef.current],
              })
              features.forEach(f => {
                if (f.id !== undefined) {
                  mapInstance.setFeatureState({ source: 'wards', id: f.id }, { hover: false })
                }
              })
            }

            hoveredWardRef.current = wardName

            if (feature.id !== undefined) {
              mapInstance.setFeatureState({ source: 'wards', id: feature.id }, { hover: true })
            }
          }

          // Show popup
          popupRef.current
            ?.setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family:'Plus Jakarta Sans',sans-serif;">
                <div style="font-weight:600;font-size:14px;color:#E2E8F0;margin-bottom:6px;">${wardName}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;">
                  <span style="color:#8BA3BC;font-size:12px;">Severity</span>
                  <span style="color:#FF6B35;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500;">${typeof severityScore === 'number' ? severityScore.toFixed(0) : '—'}/100</span>
                  <span style="color:#8BA3BC;font-size:12px;">Stations</span>
                  <span style="color:#E2E8F0;font-family:'JetBrains Mono',monospace;font-size:12px;">${stationCount ?? '—'}</span>
                  <span style="color:#8BA3BC;font-size:12px;">Waste</span>
                  <span style="color:#E2E8F0;font-family:'JetBrains Mono',monospace;font-size:12px;">${typeof wastePerCapita === 'number' ? wastePerCapita.toFixed(1) : '—'} kg/cap</span>
                </div>
              </div>
            `)
            .addTo(mapInstance)
        })

        mapInstance.on('mouseleave', 'ward-fill', () => {
          mapInstance.getCanvas().style.cursor = ''
          popupRef.current?.remove()

          if (hoveredWardRef.current) {
            const features = mapInstance.querySourceFeatures('wards', {
              filter: ['==', 'ward_name', hoveredWardRef.current],
            })
            features.forEach(f => {
              if (f.id !== undefined) {
                mapInstance.setFeatureState({ source: 'wards', id: f.id }, { hover: false })
              }
            })
            hoveredWardRef.current = null
          }
        })

        // Pointer on clusters
        mapInstance.on('mouseenter', 'clusters', () => {
          mapInstance.getCanvas().style.cursor = 'pointer'
        })
        mapInstance.on('mouseleave', 'clusters', () => {
          mapInstance.getCanvas().style.cursor = ''
        })
      })
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Update selected ward paint when selectedWard changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const update = () => {
      if (!map.getLayer('ward-selected')) return
      map.setPaintProperty('ward-selected', 'fill-opacity', [
        'case',
        ['==', ['get', 'ward_name'], selectedWard ?? ''],
        0.3,
        0,
      ])
      if (map.getLayer('ward-selected-line')) {
        map.setPaintProperty('ward-selected-line', 'line-width', [
          'case',
          ['==', ['get', 'ward_name'], selectedWard ?? ''],
          3,
          0,
        ])
      }
    }

    if (map.isStyleLoaded()) {
      update()
    } else {
      map.once('load', update)
    }
  }, [selectedWard])

  // Update gap markers when gapLocations changes
  const updateGapMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map || !maplibregl) return

    // Remove old markers
    gapMarkersRef.current.forEach(m => m.remove())
    gapMarkersRef.current = []

    if (!gapLocations.length) return

    gapLocations.forEach((gap, i) => {
      const el = document.createElement('div')
      el.style.cssText = `
        background: #FF6B35;
        color: white;
        font-weight: 700;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        font-family: 'Plus Jakarta Sans', sans-serif;
        cursor: default;
        user-select: none;
      `
      el.textContent = String(i + 1)

      const marker = new maplibregl!.Marker({ element: el, anchor: 'center' })
        .setLngLat([gap.lng, gap.lat])
        .setPopup(
          new maplibregl!.Popup({ offset: 16, closeButton: false }).setHTML(`
            <div style="font-family:'Plus Jakarta Sans',sans-serif;">
              <div style="font-weight:600;color:#FF6B35;margin-bottom:4px;">Recommended #${i + 1}</div>
              <div style="color:#8BA3BC;font-size:12px;">${gap.lat.toFixed(4)}°N, ${gap.lng.toFixed(4)}°E</div>
              <div style="margin-top:4px;font-size:12px;">
                <span style="color:#8BA3BC;">Gap:</span> <span style="color:#E2E8F0;font-family:'JetBrains Mono',monospace;">${gap.gap_m.toFixed(0)}m</span>
              </div>
              <div style="font-size:12px;">
                <span style="color:#8BA3BC;">Saves:</span> <span style="color:#64FFDA;font-family:'JetBrains Mono',monospace;">~${gap.bottles_per_year.toLocaleString()}</span>
                <span style="color:#8BA3BC;"> bottles/yr</span>
              </div>
            </div>
          `)
        )
        .addTo(map)

      gapMarkersRef.current.push(marker)
    })
  }, [gapLocations])

  useEffect(() => {
    updateGapMarkers()
  }, [updateGapMarkers])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#0A1628' }}
    />
  )
}
