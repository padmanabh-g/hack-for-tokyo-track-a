import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { WardProperties } from '@/lib/types'

const SYSTEM = `You are a knowledgeable assistant for the Tokyo Refill Desert Detector — a tool that maps mymizu water refill station coverage gaps across Tokyo's 23 special wards.

Key facts you know:
- mymizu is Japan's free water refill app connecting people to refill stations
- Tokyo generates significant plastic bottle waste (~47 kg per capita per year on average)
- The "23 special wards" (特別区) are the urban core of Tokyo
- Refill deserts are areas with high plastic waste + low mymizu station coverage
- Each new refill station in a desert area can eliminate tens of thousands of plastic bottles per year
- The app uses severity scores from 0-100 based on waste per capita vs coverage density

Be concise, specific, and data-driven. Answer in 2-4 sentences max unless asked for more detail.`

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
    max_tokens: 400,
    system: SYSTEM + contextNote,
    messages,
  })

  return NextResponse.json({ reply: (response.content[0] as { type: string; text: string }).text })
}
