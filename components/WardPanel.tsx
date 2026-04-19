'use client'

import { ArrowLeft, MapPin, Zap, RotateCw, Sparkles, Layers, Database } from 'lucide-react'
import type { GapLocation, WardProperties } from '@/lib/types'

interface WardPanelProps {
  ward: WardProperties
  rank: number
  totalWards: number
  gapLocations: GapLocation[]
  gapLoading: boolean
  brief: string | null
  briefLoading: boolean
  onGenerateBrief: () => void
  onBack: () => void
}

function SeverityDot({ rank }: { rank: number }) {
  const color =
    rank <= 5 ? '#FF6B35' : rank <= 12 ? '#FFC107' : '#4ADE80'
  const label =
    rank <= 5 ? 'critical' : rank <= 12 ? 'moderate' : 'good'
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-text-muted text-xs">{label}</span>
    </span>
  )
}

export function WardPanel({
  ward,
  rank,
  totalWards,
  gapLocations,
  gapLoading,
  brief,
  briefLoading,
  onGenerateBrief,
  onBack,
}: WardPanelProps) {
  const totalBottles = gapLocations.reduce((sum, g) => sum + g.bottles_per_year, 0)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex-none px-5 pt-4 pb-3 border-b border-border-subtle">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-3 transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          <span>Overview</span>
        </button>

        <div className="flex items-start gap-2">
          <MapPin size={18} className="text-coral mt-0.5 flex-shrink-0" strokeWidth={1.5} />
          <h2 className="font-display font-bold text-xl text-text-primary leading-tight">
            {ward.ward_name}
          </h2>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <span className="text-text-muted text-xs">
            <strong className="text-text-primary">#{rank}</strong> worst of {totalWards} wards
          </span>
          <SeverityDot rank={rank} />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="flex-none px-5 py-4">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Severity Score"
            value={`${ward.severity_score.toFixed(0)}/100`}
            valueColor="text-coral"
          />
          <MetricCard
            label="Stations"
            value={String(ward.station_count)}
          />
          <MetricCard
            label="Waste"
            value={`${ward.waste_per_capita.toFixed(1)} kg/cap/yr`}
          />
          <MetricCard
            label="Coverage"
            value={`${ward.coverage_density.toFixed(2)}/km²`}
          />
        </div>

        <div className="mt-3 px-3 py-2.5 bg-bg-elevated rounded-lg border border-border-subtle">
          <span className="text-text-muted text-xs uppercase tracking-widest">Annual waste</span>
          <div className="font-mono text-teal text-lg font-medium mt-0.5">
            {ward.waste_tonnes.toLocaleString()} tonnes
          </div>
        </div>
      </div>

      {/* Gap locations */}
      <div className="flex-none px-5 pb-4 border-t border-border-subtle pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={14} className="text-text-muted" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Recommended New Stations
          </span>
        </div>

        {gapLoading ? (
          <div className="flex items-center gap-2 py-4 text-text-muted text-sm">
            <span className="w-4 h-4 border-2 border-border-subtle border-t-teal rounded-full animate-spin" />
            Analyzing coverage gaps…
          </div>
        ) : gapLocations.length > 0 ? (
          <>
            <div className="space-y-2">
              {gapLocations.map((gap, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 bg-bg-surface rounded-lg px-3 py-2.5 border border-border-subtle"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-coral text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-text-primary">
                      {gap.lat.toFixed(4)}°N, {gap.lng.toFixed(4)}°E
                    </div>
                    <div className="text-text-muted text-xs mt-0.5">
                      <span className="font-mono">{gap.gap_m.toFixed(0)}m</span> gap ·{' '}
                      <span className="text-teal font-mono">{gap.bottles_per_year.toLocaleString()}</span> bottles/yr saved
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Combined impact */}
            <div className="mt-3 px-4 py-3 bg-bg-surface border border-teal/20 rounded-lg">
              <div className="text-text-muted text-xs uppercase tracking-widest mb-1">
                Combined Annual Impact
              </div>
              <div className="font-mono text-teal text-2xl font-bold tracking-tight">
                ~{totalBottles.toLocaleString()}
              </div>
              <div className="text-text-muted text-xs mt-0.5">
                plastic bottles eliminated per year
              </div>
            </div>
          </>
        ) : (
          <div className="text-text-muted text-sm py-2">
            Gap analysis will appear here
          </div>
        )}
      </div>

      {/* AI Brief */}
      <div className="flex-1 px-5 pb-5 border-t border-border-subtle pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-text-muted" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            AI Brief
          </span>
        </div>

        {brief ? (
          <div>
            <div className="text-sm text-text-primary leading-relaxed border-l-2 border-teal pl-3 py-1 bg-bg-elevated rounded-r-lg pr-3">
              {brief}
            </div>
            <button
              onClick={onGenerateBrief}
              disabled={briefLoading}
              className="mt-3 flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary border border-border-subtle hover:border-coral rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {briefLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-border-subtle border-t-teal rounded-full animate-spin" />
              ) : (
                <RotateCw size={13} strokeWidth={1.5} />
              )}
              Regenerate
            </button>
          </div>
        ) : briefLoading ? (
          <div className="flex items-center gap-2 py-4 text-text-muted text-sm">
            <span className="w-4 h-4 border-2 border-border-subtle border-t-teal rounded-full animate-spin" />
            Asking Claude…
          </div>
        ) : (
          <button
            onClick={onGenerateBrief}
            disabled={gapLoading || gapLocations.length === 0}
            className="flex items-center gap-2 bg-coral hover:bg-coral/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Sparkles size={15} strokeWidth={1.5} />
            Generate AI Brief
          </button>
        )}
      </div>

      {/* Dataset hint */}
      <div className="flex-none px-5 pb-4">
        <div className="flex items-center gap-1.5 text-text-muted text-xs">
          <Database size={12} strokeWidth={1.5} />
          <span>mymizu data · Tokyo Statistical Yearbook 2023</span>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  valueColor = 'text-teal',
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2.5">
      <div className="text-text-muted text-xs uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-mono text-sm font-medium ${valueColor}`}>{value}</div>
    </div>
  )
}
