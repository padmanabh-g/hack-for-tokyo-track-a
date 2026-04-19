'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { OverviewPanel } from './OverviewPanel'
import { WardPanel } from './WardPanel'
import { Droplets } from 'lucide-react'
import type { AnalysisResult, GapLocation, WardProperties } from '@/lib/types'

const Map = dynamic(() => import('./Map').then(m => m.Map), { ssr: false })

export function MapView({ data }: { data: AnalysisResult }) {
  const [selectedWard, setSelectedWard] = useState<string | null>(null)
  const [gapLocations, setGapLocations] = useState<GapLocation[]>([])
  const [gapLoading, setGapLoading] = useState(false)
  const [briefs, setBriefs] = useState<Record<string, string>>({})
  const [briefLoading, setBriefLoading] = useState(false)
  const [visibleWardNames, setVisibleWardNames] = useState<string[]>([])

  const handleWardClick = useCallback(async (wardName: string) => {
    if (wardName === selectedWard) return
    setSelectedWard(wardName)
    setGapLocations([])
    setGapLoading(true)
    try {
      const res = await fetch('/api/gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardName }),
      })
      const json = await res.json()
      setGapLocations(json.gaps ?? [])
    } finally {
      setGapLoading(false)
    }
  }, [selectedWard])

  const handleBack = useCallback(() => {
    setSelectedWard(null)
    setGapLocations([])
  }, [])

  const handleGenerateBrief = useCallback(async () => {
    if (!selectedWard) return
    const ward = data.wards.features.find(
      f => (f.properties as WardProperties).ward_name === selectedWard
    )?.properties as WardProperties
    if (!ward) return

    setBriefLoading(true)
    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ward, gaps: gapLocations }),
      })
      const json = await res.json()
      setBriefs(prev => ({ ...prev, [selectedWard]: json.brief }))
    } finally {
      setBriefLoading(false)
    }
  }, [selectedWard, gapLocations, data])

  const selectedWardProps = selectedWard
    ? data.wards.features.find(
        f => (f.properties as WardProperties).ward_name === selectedWard
      )?.properties as WardProperties | undefined
    : undefined

  const allSeverities = data.wards.features
    .map(f => ({
      name: (f.properties as WardProperties).ward_name,
      severity: (f.properties as WardProperties).desert_severity,
    }))
    .sort((a, b) => b.severity - a.severity)

  const getRank = (wardName: string) =>
    allSeverities.findIndex(w => w.name === wardName) + 1

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex-none h-14 bg-bg-surface border-b border-border-subtle px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Droplets size={22} className="text-teal" strokeWidth={1.5} />
          <h1 className="font-display font-bold text-lg tracking-tight text-text-primary">
            Tokyo Refill Desert Detector
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-sm text-text-muted font-mono">
          <span>
            <span className="text-teal font-medium">{data.stats.totalStations.toLocaleString()}</span>{' '}
            stations
          </span>
          <span>
            <span className="text-coral font-medium">{data.stats.worstWard}</span> worst desert
          </span>
          <span>
            <span className="text-text-primary font-medium">23</span> wards scored
          </span>
        </div>
      </header>

      {/* Main: map + panel */}
      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          <Map
            wardsGeoJSON={data.wards}
            stationsGeoJSON={data.stations}
            selectedWard={selectedWard}
            gapLocations={gapLocations}
            onWardClick={handleWardClick}
            onViewportChange={setVisibleWardNames}
          />
        </div>

        {/* Detail panel */}
        <aside className="flex-none w-80 xl:w-96 bg-bg-base border-l border-border-subtle flex flex-col overflow-hidden">
          {selectedWardProps ? (
            <WardPanel
              ward={selectedWardProps}
              rank={getRank(selectedWardProps.ward_name)}
              totalWards={23}
              gapLocations={gapLocations}
              gapLoading={gapLoading}
              brief={briefs[selectedWard!] ?? null}
              briefLoading={briefLoading}
              onGenerateBrief={handleGenerateBrief}
              onBack={handleBack}
            />
          ) : (
            <OverviewPanel
              wardsGeoJSON={data.wards}
              stats={data.stats}
              onWardClick={handleWardClick}
              visibleWardNames={visibleWardNames}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
