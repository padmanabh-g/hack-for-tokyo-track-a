# Track A — Refill Desert Detector
**Students@AI Tokyo | Zero Waste / mymizu | Deadline: 6:00 PM April 19, 2026**

---

## The One-Line Pitch

An AI-powered map that shows which Tokyo neighborhoods are "refill deserts" — high plastic waste, zero mymizu coverage — and tells city planners exactly where to put the next station and why.

---

## The Problem We're Solving

Tokyo generates 7.69M tonnes of plastic waste per year. mymizu has built 200,000+ refill spots globally, but coverage is uneven across Tokyo's 23 wards. There's no tool that cross-references *where plastic waste is worst* with *where refill infrastructure is missing*. That's the gap.

---

## What We Build

A Streamlit web app with an interactive Folium map of Tokyo:

- Each ward is colored by "Refill Desert Severity Score" (dark red = worst)
- Click any ward → Claude Sonnet generates a plain-English intervention brief:
  - Current waste stats
  - Nearest mymizu stations and their gap from commercial corridors
  - Top 3 recommended street corners for new stations (based on building density)
  - Projected plastic bottle reduction if stations are added

---

## Judging Criteria Mapping

| Criterion | Weight | How We Hit It |
|-----------|--------|---------------|
| Real-World Impact | 30% | Directly informs mymizu expansion strategy; actionable for ward governments |
| Technical Execution | 25% | GeoPandas spatial joins, Claude generates non-decorative insights |
| Data Usage | 20% | mymizu + ward waste stats + OSM/PLATEAU building density — all three joined |
| Creativity | 15% | "Refill desert" framing is novel; most teams will just map existing stations |
| Pitch | 10% | One compelling map tells the whole story |

---

## Tech Stack

```
Python 3.11+
├── pandas / geopandas       — data loading, spatial joins
├── shapely                  — buffer zones around stations
├── folium                   — interactive choropleth map
├── streamlit                — web app wrapper
├── osmnx (optional)         — building footprints / foot traffic proxy
└── anthropic SDK            — Claude Sonnet for ward narratives
```

---

## Data Sources

| Dataset | URL / Access | What We Use |
|---------|-------------|-------------|
| mymizu Refill Stations | Google Drive: https://drive.google.com/drive/folders/12r3XS2K1VX_MTyWVJ6OR_5IsgDQRdu7A | Station lat/lng, count per ward |
| Tokyo Ward Waste Stats | portal.data.metro.tokyo.lg.jp | Plastic waste kg/capita per ward |
| OSM Tokyo | osmnx.graph_from_place("Tokyo") or overpass API | Building density, commercial areas as footfall proxy |
| PLATEAU (optional) | geospatial.jp | Building floor area for demand scoring (use only if time permits) |

**Priority:** Get mymizu data working first. Ward waste stats from the Ministry of Environment site or TMG portal. OSM via osmnx is the fastest path to building density.

---

## The Algorithm

```python
# Pseudocode for the core scoring logic

for each ward in tokyo_23_wards:
    # Count mymizu stations within ward boundary
    stations_in_ward = spatial_join(mymizu_stations, ward_polygon)
    coverage_density = len(stations_in_ward) / ward_area_km2

    # Get ward plastic waste per capita (from TMG open data)
    waste_per_capita = ward_stats[ward]["plastic_waste_kg_per_capita"]

    # Score: high waste + low coverage = worst desert
    desert_severity = waste_per_capita / (coverage_density + 0.01)  # avoid div by zero

    # For top-N worst wards, find optimal new station locations
    # = commercial building centroids furthest from existing stations
    if desert_severity > threshold:
        commercial_buildings = osm_buildings[ward]
        gaps = find_coverage_gaps(commercial_buildings, stations_in_ward, buffer_m=300)
        top_locations = gaps.nlargest(3, "population_proxy")
```

Then pass ward stats + top locations to Claude Sonnet for a narrative summary.

---

## Build Timeline (6 hours)

```
10:30–11:30  Hour 1: Data loading
             - Download mymizu dataset from Drive
             - Load Tokyo ward boundaries (GeoJSON from TMG or naturalearth)
             - Load ward plastic waste stats (CSV from env.go.jp or TMG portal)
             - Verify all datasets load cleanly

11:30–12:30  Hour 2: Spatial analysis core
             - Spatial join: stations → wards (count per ward)
             - Compute desert_severity score per ward
             - Identify top 5 worst wards

12:30–13:30  Hour 3: Folium map
             - Choropleth: wards colored by desert_severity
             - Station markers overlaid
             - Click handler → opens ward detail panel

13:30–14:30  Hour 4: Claude integration
             - Build prompt template with ward data
             - Call Claude Sonnet for each of the top 5 wards
             - Display narrative in sidebar on ward click

14:30–15:30  Lunch (Zero-Waste Lunch 2:30–3:30)

15:30–16:30  Hour 5: Polish + edge cases
             - Handle wards with zero waste data gracefully
             - Mobile-friendly layout check
             - Add "Projected Impact" calculation (# bottles eliminated)

16:30–17:30  Hour 6: Pitch deck + video
             - 8 slides: problem → data → method → demo → impact → next steps
             - 2-min screen recording of the app in action
             - Submit via Ausna

17:30–18:00  Buffer / submission
```

---

## The Demo Moment

1. Open the app → Tokyo map appears, wards colored dark red to green
2. Narrator: "This is Tokyo's plastic waste intensity. The darker, the worse."
3. Click Shinjuku (dark red) → right panel shows:
   - "Shinjuku ward: 3,847 tonnes plastic/year. 2.3 stations per km². Commercial corridor at Kabukicho has 0 stations within 400m."
   - "Claude recommends: Add stations at [Coordinate 1], [Coordinate 2], [Coordinate 3]. Combined catchment: 84,000 daily commuters. Projected reduction: ~240,000 plastic bottles/year."
4. Show the impact stat. Done.

---

## Deliverables Checklist

- [ ] Working Streamlit app (demo on localhost)
- [ ] GitHub repo with clean README + requirements.txt
- [ ] Pitch deck (8 slides max), named: `TrackA_[TeamName]_pitch_deck`
- [ ] 2-min video pitch uploaded to Ausna
- [ ] Datasets NOT committed to repo (use .gitignore, reference Drive link)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| PLATEAU CityGML is slow to parse | Skip PLATEAU, use OSM buildings (osmnx) instead |
| Ward waste stats are hard to find | Use national data from env.go.jp aggregated to ward level; or hardcode top-level figures |
| mymizu API key takes time | Use the provided Drive dataset (already downloaded) |
| Folium tooltip rendering is buggy | Fall back to Streamlit sidebar for ward detail |

---

## Claude Prompt Template

```python
WARD_BRIEF_PROMPT = """
You are a sustainability advisor for Tokyo's mymizu water refill network.

Ward: {ward_name}
Annual plastic waste: {waste_tonnes} tonnes ({waste_per_capita} kg/capita)
Current mymizu stations: {station_count} ({coverage_density:.1f} per km²)
Nearest commercial corridor gap: {max_gap_m}m from any station
Top 3 recommended locations for new stations:
  1. {loc1} (covers {pop1} estimated daily commuters)
  2. {loc2} (covers {pop2} estimated daily commuters)
  3. {loc3} (covers {pop3} estimated daily commuters)

Write a 3-sentence intervention brief for this ward. Be specific and direct.
Include: current severity, why these locations were chosen, projected plastic bottle reduction per year.
"""
```

---

## Prize Context

- Winner: ¥50,000 + internship interviews at mymizu
- Sponsor judges: mymizu team (they know their network; show you understand their expansion strategy)
- Key angle to land: "This tool tells mymizu where to grow next, backed by data."
