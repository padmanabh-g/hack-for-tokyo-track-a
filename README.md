# Tokyo Refill Desert Detector

**Track A — Students@AI Tokyo Hackathon 2026**  
Built for mymizu's expansion strategy.

---

## What It Does

An AI-powered Streamlit web app that cross-references Tokyo's plastic waste intensity with mymizu station coverage to identify **refill deserts** — wards where plastic waste is high but refill infrastructure is missing.

Click any ward on the interactive map to get:
- Desert severity score (waste intensity vs. station coverage)
- Top 3 recommended new station locations (based on coverage gap analysis)
- Claude-generated intervention brief with projected plastic bottle reduction

## Key Finding

mymizu's network is concentrated in high-footfall commercial areas (Shibuya, Shinjuku, Chuo). The real deserts are outer residential wards — **Adachi, Katsushika, Edogawa** — where 500K+ residents have almost no refill access. Adding 3 stations in Adachi alone could eliminate ~636,000 plastic bottles per year.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file:
```
ANTHROPIC_API_KEY=your_key_here
MYMIZU_DATA_PATH=/path/to/japan_taps_20260416_144839.json
```

> **Data note:** The mymizu dataset is restricted — do not commit it to this repo.  
> Access via: https://drive.google.com/drive/folders/12r3XS2K1VX_MTyWVJ6OR_5IsgDQRdu7A

## Run

```bash
streamlit run app.py
```

Then open http://localhost:8501

## How the Score Works

```
desert_severity = waste_per_capita / (stations_per_km² + 0.01)
```

Higher waste + fewer stations per km² = higher severity (darker red on map).  
Scores are normalized to [0, 100] across all 23 wards for the choropleth.

## Recommended Locations Algorithm

For each ward, the app:
1. Samples a 40×40 grid of candidate points within the ward polygon
2. For each candidate, computes distance to the nearest existing mymizu station
3. Returns the top 3 candidates with maximum gap (minimum coverage), spaced ≥350m apart

## Tech Stack

- **Streamlit** — web app
- **GeoPandas + Shapely** — spatial joins, polygon analysis
- **Folium + streamlit-folium** — interactive choropleth map
- **Anthropic Claude Sonnet** — ward intervention briefs
- **mymizu open dataset** — 11,769 Japan refill stations
- **dataofjapan/land** — Tokyo 23-ward GeoJSON boundaries

## Data Sources

| Dataset | Source |
|---------|--------|
| mymizu stations | Google Drive (restricted) |
| Tokyo ward boundaries | github.com/dataofjapan/land |
| Ward waste estimates | Ministry of Environment FY2023 + TMG Open Data (calibrated) |
