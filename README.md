# NullIsland

**Track A — Students@AI Tokyo Hackathon 2026**  
Built for mymizu's expansion strategy.

Live: **https://null-island.vercel.app**

---

## What It Does

A full-stack AI web app that cross-references Tokyo's plastic waste intensity with mymizu station coverage to identify **refill deserts** — wards where plastic waste is high but refill infrastructure is absent.

Click any ward on the interactive choropleth map to get:
- Desert severity score (0–100, waste intensity vs. station density)
- Top 3 recommended new station locations based on maximum coverage gap
- AI-generated intervention brief with projected annual plastic bottle reduction
- Live chat assistant for any question about Tokyo's refill situation

## Key Finding

mymizu's network is concentrated in high-footfall commercial areas (Shibuya, Shinjuku, Chuo). The real deserts are outer residential wards — **Adachi, Katsushika, Edogawa** — where 500K+ residents have almost no refill access. Adding 3 stations in Adachi alone could eliminate ~636,000 plastic bottles per year.

## Stack

- **Next.js 15** (App Router, server components)
- **MapLibre GL JS** — WebGL choropleth map with live viewport sync
- **@turf/turf** — spatial joins, gap analysis (40×40 grid per ward)
- **Anthropic Claude** — ward AI briefs + chat assistant
- **Tailwind CSS** — design system
- **Vercel** — deployment

## Run Locally

```bash
npm install
```

Create `.env`:
```
ANTHROPIC_API_KEY=your_key_here
```

```bash
npm run dev
```

Open http://localhost:3000

## How the Score Works

```
desert_severity = waste_per_capita / (stations_per_km² + 0.01)
```

Higher waste + fewer stations per km² = higher severity (darker red on map).  
Scores are normalized to [0, 100] across all 23 wards.

## Gap Analysis Algorithm

For each selected ward:
1. Sample a 40×40 grid of candidate points within the ward polygon
2. For each candidate, compute distance to the nearest existing mymizu station
3. Return the top 3 candidates with maximum gap, spaced ≥350m apart
4. Estimate annual bottles saved: `π × (gap/2)² × 6000 ppl/km² × 5% adoption × 500 uses/yr`

## Data Sources

| Dataset | Source |
|---------|--------|
| mymizu stations (3,224 in Tokyo) | mymizu open dataset |
| Tokyo ward boundaries | github.com/dataofjapan/land |
| Ward waste per capita | Ministry of Environment FY2023 + TMG Open Data |

## Repo

https://github.com/padmanabh-g/hack-for-tokyo-track-a
