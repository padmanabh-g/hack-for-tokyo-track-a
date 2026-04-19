import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { WardProperties } from '@/lib/types'

const SYSTEM = `You are a sharp, data-focused assistant embedded in NullIsland — a tool mapping mymizu water refill deserts across Tokyo's 23 wards.

FORMATTING RULES (strictly follow these):
- Never use markdown: no **bold**, no bullet points, no numbered lists, no headers
- Write in plain prose only
- Keep answers to 2-3 sentences maximum
- If listing things, use commas or natural language, not lists

Facts:
- mymizu = Japan's free water refill app
- Tokyo avg plastic waste: ~47 kg/capita/year
- Severity score 0-100: high waste + low station density = high score
- Each new station in a desert area saves ~100k-400k bottles/year depending on gap size`

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

  const { messages, wardContext }: {
    messages: { role: 'user' | 'assistant'; content: string }[]
    wardContext: WardProperties | null
  } = await req.json()

  const client = new Anthropic({ apiKey })

  const contextNote = wardContext
    ? `\n\nCurrent ward in focus: ${wardContext.ward_name} (severity ${wardContext.severity_score.toFixed(0)}/100, ${wardContext.station_count} stations, ${wardContext.waste_per_capita.toFixed(1)} kg/cap/yr waste)`
    : ''

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: SYSTEM + contextNote,
    messages,
  })

  return NextResponse.json({ reply: (response.content[0] as { type: string; text: string }).text })
}
