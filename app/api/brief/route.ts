import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { gapToBottles } from '@/lib/geo'
import type { GapLocation, WardProperties } from '@/lib/types'

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

  const { ward, gaps }: { ward: WardProperties; gaps: GapLocation[] } = await req.json()

  const client = new Anthropic({ apiKey })

  const locLines = gaps
    .map((g, i) =>
      `  ${i + 1}. (${g.lat.toFixed(4)}°N, ${g.lng.toFixed(4)}°E) — ${g.gap_m.toFixed(0)}m coverage gap, ~${gapToBottles(g.gap_m).toLocaleString()} bottles/yr saved`
    )
    .join('\n')

  const prompt = `You are a sustainability advisor for Tokyo's mymizu water refill network.

Ward: ${ward.ward_name}
Annual plastic waste: ${ward.waste_tonnes.toFixed(0)} tonnes (${ward.waste_per_capita.toFixed(1)} kg/capita)
Current mymizu stations: ${ward.station_count} (${ward.coverage_density.toFixed(2)} per km²)
Desert Severity Score: ${ward.severity_score.toFixed(0)}/100

Top 3 recommended new station locations (based on maximum coverage gap analysis):
${locLines}

Write exactly 3 sentences — no headers, no bullets, just prose. Be specific and direct.
Sentence 1: State the current severity (waste intensity vs station coverage gap).
Sentence 2: Explain why these specific locations were chosen (distance from existing stations, likely footfall).
Sentence 3: Give the projected total plastic bottle reduction per year across all 3 stations combined.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  return NextResponse.json({ brief: (message.content[0] as { type: string; text: string }).text })
}
