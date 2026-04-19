'use client'

import { Flame, Database, MousePointer } from 'lucide-react'
import type { WardProperties } from '@/lib/types'

interface OverviewPanelProps {
  wardsGeoJSON: GeoJSON.FeatureCollection
  stats: {
    totalStations: number
    worstWard: string
    worstScore: number
    bestCoveredWard: string
    avgCoverage: number
  }
  onWardClick: (wardName: string) => void
  visibleWardNames?: string[]
}

export function OverviewPanel({ wardsGeoJSON, stats, onWardClick, visibleWardNames }: OverviewPanelProps) {
  const allWards = [...wardsGeoJSON.features]
    .map(f => f.properties as WardProperties)
    .sort((a, b) => b.desert_severity - a.desert_severity)

  // When zoomed in, filter to visible wards only; fall back to top-5 globally
  const isFiltered = visibleWardNames && visibleWardNames.length > 0 && visibleWardNames.length < 23
  const displayWards = isFiltered
    ? allWards.filter(w => visibleWardNames!.includes(w.ward_name))
    : allWards.slice(0, 5)

  const getSeverityColor = (rank: number) => {
    if (rank <= 2) return 'text-coral'
    if (rank <= 4) return 'text-amber-400'
    return 'text-yellow-300'
  }

  const getScoreBg = (score: number) => {
    if (score >= 75) return 'bg-red-900/40 text-red-300 border border-red-800/50'
    if (score >= 50) return 'bg-orange-900/40 text-orange-300 border border-orange-800/50'
    if (score >= 25) return 'bg-yellow-900/40 text-yellow-300 border border-yellow-800/50'
    return 'bg-green-900/40 text-green-300 border border-green-800/50'
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex-none px-5 pt-5 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-1">
          <Flame size={17} className="text-coral" strokeWidth={1.5} />
          <h2 className="font-display font-bold text-lg text-text-primary tracking-tight">
            {isFiltered ? 'In View' : "Top Refill Deserts"}
          </h2>
          {isFiltered && (
            <span className="ml-1 text-xs font-mono text-text-muted bg-bg-elevated border border-border-subtle rounded px-1.5 py-0.5">
              {displayWards.length} ward{displayWards.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-text-muted text-xs leading-relaxed">
          {isFiltered
            ? 'Ranked by severity · zoom out to see all 23'
            : 'High plastic waste + low mymizu coverage = dark red'}
        </p>
      </div>

      {/* Ward cards */}
      <div className="flex-none px-4 py-4 space-y-2">
        {displayWards.length === 0 ? (
          <p className="text-text-muted text-xs text-center py-6">No wards in current view</p>
        ) : displayWards.map((ward, i) => (
          <button
            key={ward.ward_name}
            onClick={() => onWardClick(ward.ward_name)}
            className="w-full text-left cursor-pointer bg-bg-surface hover:bg-bg-elevated border border-border-subtle hover:border-coral/40 rounded-lg px-4 py-3 transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`font-display font-bold text-base leading-none flex-shrink-0 ${getSeverityColor(i + 1)}`}>
                  {i + 1}
                </span>
                <span className="font-semibold text-sm text-text-primary group-hover:text-white truncate">
                  {ward.ward_name}
                </span>
              </div>
              <span className={`flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded ${getScoreBg(ward.severity_score)}`}>
                {ward.severity_score.toFixed(0)}/100
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
              <span>
                <span className="font-mono">{ward.coverage_density.toFixed(2)}</span> /km²
              </span>
              <span className="text-border-subtle">·</span>
              <span>
                <span className="font-mono">{ward.station_count}</span> stations
              </span>
              <span className="text-border-subtle">·</span>
              <span>
                <span className="font-mono">{ward.waste_per_capita.toFixed(1)}</span> kg/cap
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Click hint */}
      <div className="flex-none px-5 pb-4">
        <div className="flex items-center gap-2 text-text-muted text-xs bg-bg-elevated rounded-lg px-3 py-2 border border-border-subtle">
          <MousePointer size={12} strokeWidth={1.5} className="flex-shrink-0" />
          <span>Click any ward on the map or above for AI analysis</span>
        </div>
      </div>

      {/* Dataset stats */}
      <div className="flex-none px-5 pb-5 border-t border-border-subtle pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Database size={14} className="text-text-muted" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Dataset
          </span>
        </div>

        <div className="space-y-2">
          <StatRow
            label="Total stations"
            value={stats.totalStations.toLocaleString()}
            valueColor="text-teal"
          />
          <StatRow
            label="Worst desert"
            value={`${stats.worstWard} (${stats.worstScore.toFixed(0)}/100)`}
            valueColor="text-coral"
          />
          <StatRow
            label="Best covered"
            value={stats.bestCoveredWard}
            valueColor="text-green-400"
          />
          <StatRow
            label="Avg coverage"
            value={`${stats.avgCoverage.toFixed(2)} stations/km²`}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex-none px-5 pb-5">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Severity Legend
        </div>
        <div className="flex items-center gap-1 h-3 rounded-sm overflow-hidden">
          {['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026'].map((color, i) => (
            <div
              key={i}
              className="flex-1 h-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="flex justify-between text-text-muted text-xs mt-1">
          <span>Low (0)</span>
          <span>High (100)</span>
        </div>
      </div>
    </div>
  )
}

function StatRow({
  label,
  value,
  valueColor = 'text-text-primary',
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-text-muted text-xs">{label}</span>
      <span className={`font-mono text-xs font-medium ${valueColor} text-right`}>{value}</span>
    </div>
  )
}
