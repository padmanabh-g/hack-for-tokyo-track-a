"""
Tokyo Refill Desert Detector
Students@AI Tokyo Hackathon 2026 — Track A (Zero Waste / mymizu)

Cross-references plastic waste intensity with mymizu station coverage
to identify refill deserts and recommend optimal new station locations.
"""

import os
import json
import numpy as np
import pandas as pd
import geopandas as gpd
import folium
from folium.plugins import MarkerCluster
import requests
import streamlit as st
from streamlit_folium import st_folium
from shapely.geometry import Point
import anthropic
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Tokyo Refill Desert Detector",
    page_icon="💧",
    layout="wide",
    initial_sidebar_state="collapsed",
)

MYMIZU_PATH = os.getenv(
    "MYMIZU_DATA_PATH",
    str(Path.home() / "Downloads" / "japan_taps_20260416_144839.json"),
)
WARD_GEO_URL = "https://raw.githubusercontent.com/dataofjapan/land/master/tokyo.geojson"
TOKYO_LAT = (35.50, 35.82)
TOKYO_LNG = (139.55, 139.92)

# Plastic waste kg/capita/year per ward
# Tokyo average: ~47 kg/capita/yr (Ministry of Environment FY2023)
# Commercial/business wards skew higher due to office packaging + visitor density
WARD_WASTE = {
    "Chiyoda": 67.2,    # Marunouchi CBD, massive daytime office population
    "Chuo": 63.8,       # Ginza, Nihonbashi — dense retail and tourism
    "Minato": 58.9,     # Roppongi, Shiodome, foreign consulates
    "Taito": 59.3,      # Asakusa tourist corridor
    "Shinjuku": 55.7,   # Kabukicho, Takashimaya Times Square, commuter nexus
    "Shibuya": 52.4,    # Scramble crossing, youth consumption hub
    "Toshima": 52.1,    # Ikebukuro second-largest station
    "Adachi": 51.2,     # Dense residential outer ward
    "Edogawa": 50.1,    # Outer residential
    "Katsushika": 49.7,
    "Sumida": 48.4,     # Asakusabashi, near Skytree
    "Arakawa": 48.8,
    "Shinagawa": 48.2,  # Major terminal + hotel district
    "Nakano": 46.8,
    "Kita": 47.1,
    "Itabashi": 47.5,
    "Meguro": 47.6,
    "Bunkyo": 46.5,     # University area, moderate
    "Suginami": 45.9,
    "Ota": 46.3,        # Industrial + residential mix
    "Koto": 44.8,       # Waterfront residential
    "Setagaya": 44.6,   # Largest ward by population, residential
    "Nerima": 44.2,     # Outer residential, lowest commercial density
}

# Rough population estimates per ward (people)
# Source: Tokyo Statistical Yearbook 2023
WARD_POPULATION = {
    "Adachi": 690000, "Arakawa": 215000, "Bunkyo": 236000, "Chiyoda": 67000,
    "Chuo": 170000, "Edogawa": 700000, "Itabashi": 560000, "Katsushika": 455000,
    "Kita": 345000, "Koto": 525000, "Meguro": 283000, "Minato": 262000,
    "Nakano": 328000, "Nerima": 750000, "Ota": 740000, "Setagaya": 940000,
    "Shibuya": 240000, "Shinagawa": 415000, "Shinjuku": 347000, "Suginami": 577000,
    "Sumida": 274000, "Taito": 204000, "Toshima": 300000,
}


# ──────────────────────────────────────────────────────────────────────────────
# Data loading (cached)
# ──────────────────────────────────────────────────────────────────────────────

@st.cache_data
def load_mymizu() -> gpd.GeoDataFrame:
    with open(MYMIZU_PATH) as f:
        data = json.load(f)
    df = pd.DataFrame(data)
    df = df.dropna(subset=["latitude", "longitude"])
    mask = df.latitude.between(*TOKYO_LAT) & df.longitude.between(*TOKYO_LNG)
    df = df[mask].reset_index(drop=True)
    gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df.longitude, df.latitude),
        crs="EPSG:4326",
    )
    return gdf


@st.cache_data
def load_wards() -> gpd.GeoDataFrame:
    resp = requests.get(WARD_GEO_URL, timeout=30)
    resp.raise_for_status()
    gdf = gpd.read_file(resp.text)
    # Keep only the 23 special wards (Tokubu area)
    gdf = gdf[gdf["area_en"] == "Tokubu"].copy()
    gdf = gdf.set_crs("EPSG:4326", allow_override=True)
    # Normalize ward name: "Shinjuku Ku" → "Shinjuku"
    gdf["ward_name"] = gdf["ward_en"].str.replace(" Ku", "", regex=False)
    gdf = gdf.reset_index(drop=True)
    return gdf


@st.cache_data
def compute_analysis(_stations: gpd.GeoDataFrame, _wards: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    stations = _stations.copy()
    wards = _wards.copy()

    # Spatial join: stations → wards
    joined = gpd.sjoin(stations, wards[["ward_name", "geometry"]], how="left", predicate="within")
    counts = joined.groupby("ward_name").size().reset_index(name="station_count")
    wards = wards.merge(counts, on="ward_name", how="left")
    wards["station_count"] = wards["station_count"].fillna(0).astype(int)

    # Area in km² (project to UTM 54N for Japan)
    wards["area_km2"] = wards.to_crs("EPSG:32654").area / 1e6

    # Coverage density: stations per km²
    wards["coverage_density"] = wards["station_count"] / wards["area_km2"]

    # Waste per capita and total
    wards["waste_per_capita"] = wards["ward_name"].map(WARD_WASTE).fillna(47.0)
    wards["population"] = wards["ward_name"].map(WARD_POPULATION).fillna(300000).astype(int)
    wards["waste_tonnes"] = (wards["waste_per_capita"] * wards["population"] / 1000).round(0)

    # Desert severity: high waste + low coverage = worst desert
    wards["desert_severity"] = wards["waste_per_capita"] / (wards["coverage_density"] + 0.01)

    # Normalize to [0, 100] for display
    mn, mx = wards["desert_severity"].min(), wards["desert_severity"].max()
    wards["severity_score"] = ((wards["desert_severity"] - mn) / (mx - mn) * 100).round(1)

    return wards


# ──────────────────────────────────────────────────────────────────────────────
# Gap analysis
# ──────────────────────────────────────────────────────────────────────────────

# Conversion factors at Tokyo latitude (~35.7°N)
_DEG_LAT_M = 111320.0
_DEG_LNG_M = 91290.0


def find_gap_locations(
    ward_polygon,
    station_lnglat: list,
    n: int = 3,
    grid_n: int = 40,
    min_sep_m: float = 350.0,
) -> list:
    """
    Returns up to n locations (lat, lng, gap_m) that are farthest from
    existing mymizu stations within the ward polygon.
    """
    minx, miny, maxx, maxy = ward_polygon.bounds
    xs = np.linspace(minx, maxx, grid_n)
    ys = np.linspace(miny, maxy, grid_n)

    candidates = [
        Point(x, y)
        for x in xs
        for y in ys
        if ward_polygon.contains(Point(x, y))
    ]

    if not candidates:
        c = ward_polygon.centroid
        return [(c.y, c.x, 500.0)] * n

    def min_gap(pt: Point) -> float:
        if not station_lnglat:
            return 9999.0
        best = float("inf")
        for slng, slat in station_lnglat:
            dx = (pt.x - slng) * _DEG_LNG_M
            dy = (pt.y - slat) * _DEG_LAT_M
            d = (dx * dx + dy * dy) ** 0.5
            if d < best:
                best = d
        return best

    scored = sorted(((min_gap(p), p) for p in candidates), reverse=True)

    results = []
    used: list[Point] = []

    for gap_m, pt in scored:
        too_close = any(
            ((pt.x - u.x) * _DEG_LNG_M) ** 2 + ((pt.y - u.y) * _DEG_LAT_M) ** 2
            < min_sep_m ** 2
            for u in used
        )
        if not too_close:
            results.append((pt.y, pt.x, gap_m))
            used.append(pt)
        if len(results) >= n:
            break

    # Pad with centroid if fewer than n found
    c = ward_polygon.centroid
    while len(results) < n:
        results.append((c.y, c.x, 200.0))

    return results


def gap_to_bottles(gap_m: float) -> int:
    """Projected plastic bottles avoided per year for one new station at this location.

    Methodology:
    - Catchment: 300m walking radius ≈ 0.28 km²
    - Tokyo avg residential density: ~10,000 ppl/km² → ~2,800 catchment residents
    - Adoption scales with gap size (more underserved = higher unmet need)
    - Frequency: 2 bottles replaced per commute day × 250 days/year
    """
    catchment_ppl = int(3.14159 * 0.3 ** 2 * 10000)  # ≈ 2,827
    adoption = min(0.07 + max(gap_m - 300, 0) / 10000, 0.15)
    return int(catchment_ppl * adoption * 2 * 250)


# ──────────────────────────────────────────────────────────────────────────────
# Claude integration
# ──────────────────────────────────────────────────────────────────────────────

def generate_brief(ward_data: dict) -> str:
    """Generate a 3-sentence intervention brief via Claude Sonnet."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return "Set ANTHROPIC_API_KEY to enable AI-generated briefs."

    client = anthropic.Anthropic(api_key=api_key)
    gaps = ward_data["gap_locations"]

    loc_lines = "\n".join(
        f"  {i+1}. ({lat:.4f}°N, {lng:.4f}°E) — {gap_m:.0f}m coverage gap, "
        f"~{gap_to_bottles(gap_m):,} bottles/yr saved"
        for i, (lat, lng, gap_m) in enumerate(gaps)
    )

    prompt = f"""You are a sustainability advisor for Tokyo's mymizu water refill network.

Ward: {ward_data['ward_name']}
Annual plastic waste: {ward_data['waste_tonnes']:.0f} tonnes ({ward_data['waste_per_capita']:.1f} kg/capita)
Current mymizu stations: {ward_data['station_count']} ({ward_data['coverage_density']:.2f} per km²)
Desert Severity Score: {ward_data['severity_score']:.0f}/100

Top 3 recommended new station locations (based on maximum coverage gap analysis):
{loc_lines}

Write exactly 3 sentences — no headers, no bullets, just prose. Be specific and direct.
Sentence 1: State the current severity (waste intensity vs station coverage gap).
Sentence 2: Explain why these specific locations were chosen (distance from existing stations, likely footfall).
Sentence 3: Give the projected total plastic bottle reduction per year across all 3 stations combined."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


# ──────────────────────────────────────────────────────────────────────────────
# Map builder
# ──────────────────────────────────────────────────────────────────────────────

def _severity_color(score: float) -> str:
    """Map severity score [0,100] to a hex color (green → red)."""
    r = int(score * 2.2)
    g = int((100 - score) * 2.2)
    return f"#{min(r,220):02x}{min(g,200):02x}40"


def build_map(
    wards: gpd.GeoDataFrame,
    stations: gpd.GeoDataFrame,
    selected_ward: str | None = None,
    gap_locs: list | None = None,
) -> folium.Map:
    m = folium.Map(
        location=[35.685, 139.69],
        zoom_start=11,
        tiles="CartoDB positron",
        prefer_canvas=True,
    )

    # Choropleth: wards colored by desert severity
    wards_json = wards[
        ["ward_name", "severity_score", "station_count", "waste_per_capita",
         "coverage_density", "waste_tonnes", "geometry"]
    ].to_json()

    folium.Choropleth(
        geo_data=wards_json,
        data=wards[["ward_name", "severity_score"]],
        columns=["ward_name", "severity_score"],
        key_on="feature.properties.ward_name",
        fill_color="YlOrRd",
        fill_opacity=0.75,
        line_opacity=0.6,
        line_color="#ffffff",
        legend_name="Refill Desert Severity (0 = fine, 100 = critical)",
        nan_fill_color="#cccccc",
        highlight=True,
        name="Desert Severity",
    ).add_to(m)

    # Transparent GeoJson overlay for tooltips + click detection
    folium.GeoJson(
        wards_json,
        name="Ward Info",
        style_function=lambda _: {
            "fillOpacity": 0.0,
            "weight": 1.5,
            "color": "white",
        },
        highlight_function=lambda _: {
            "weight": 3,
            "color": "#FF6B35",
            "fillOpacity": 0.15,
        },
        tooltip=folium.GeoJsonTooltip(
            fields=["ward_name", "severity_score", "station_count", "waste_per_capita"],
            aliases=["Ward", "Severity Score", "mymizu Stations", "Waste kg/cap/yr"],
            localize=True,
            sticky=True,
        ),
    ).add_to(m)

    # mymizu station markers (sample for performance)
    cluster = MarkerCluster(
        name="mymizu Stations",
        show=True,
        options={"maxClusterRadius": 30},
    ).add_to(m)

    sample = stations.sample(min(len(stations), 600), random_state=42)
    for _, row in sample.iterrows():
        name_field = row.get("name", {})
        if isinstance(name_field, dict):
            label = name_field.get("en") or name_field.get("ja") or "mymizu station"
        else:
            label = str(name_field) if name_field else "mymizu station"

        folium.CircleMarker(
            location=[row.latitude, row.longitude],
            radius=4,
            color="#0077B6",
            fill=True,
            fill_color="#0077B6",
            fill_opacity=0.7,
            tooltip=label or "mymizu station",
            popup=label or "mymizu station",
        ).add_to(cluster)

    # Highlight selected ward + recommended locations
    if selected_ward and gap_locs:
        ward_row = wards[wards["ward_name"] == selected_ward]
        if not ward_row.empty:
            ward_geom = ward_row.iloc[0].geometry
            folium.GeoJson(
                gpd.GeoDataFrame(geometry=[ward_geom], crs="EPSG:4326").to_json(),
                style_function=lambda _: {
                    "fillColor": "#FF6B35",
                    "fillOpacity": 0.25,
                    "color": "#FF6B35",
                    "weight": 3,
                },
                name="Selected Ward",
            ).add_to(m)

        icons = ["1", "2", "3"]
        for i, (lat, lng, gap_m) in enumerate(gap_locs[:3]):
            folium.Marker(
                location=[lat, lng],
                icon=folium.DivIcon(
                    html=f"""<div style="
                        background:#FF6B35;color:white;font-weight:bold;
                        width:26px;height:26px;border-radius:50%;
                        display:flex;align-items:center;justify-content:center;
                        font-size:13px;border:2px solid white;
                        box-shadow:0 2px 4px rgba(0,0,0,0.4);">
                        {icons[i]}</div>""",
                    icon_size=(26, 26),
                    icon_anchor=(13, 13),
                ),
                tooltip=f"Recommended #{i+1}: {gap_m:.0f}m gap · ~{gap_to_bottles(gap_m):,} bottles/yr saved",
                popup=f"Recommended location #{i+1}<br>{lat:.4f}°N, {lng:.4f}°E<br>Gap: {gap_m:.0f}m",
            ).add_to(m)

    folium.LayerControl(collapsed=False).add_to(m)
    return m


# ──────────────────────────────────────────────────────────────────────────────
# Main UI
# ──────────────────────────────────────────────────────────────────────────────

def main():
    # Header
    st.markdown(
        """
        <h1 style='margin-bottom:0'>💧 Tokyo Refill Desert Detector</h1>
        <p style='color:#666;margin-top:4px'>
        AI-powered map identifying where Tokyo's plastic waste is worst and refill coverage is lowest.
        Built for mymizu's expansion strategy.
        </p>
        """,
        unsafe_allow_html=True,
    )

    # ── Load data ──
    with st.spinner("Loading mymizu stations and ward data..."):
        try:
            stations = load_mymizu()
        except FileNotFoundError:
            st.error(
                f"**mymizu data not found.** Expected at:\n```\n{MYMIZU_PATH}\n```\n"
                "Set `MYMIZU_DATA_PATH` environment variable or place the file at the path above."
            )
            st.stop()

        try:
            wards = load_wards()
        except Exception as e:
            st.error(f"**Failed to load ward boundaries:** {e}")
            st.stop()

        wards = compute_analysis(stations, wards)

    # ── Session state ──
    if "selected_ward" not in st.session_state:
        st.session_state.selected_ward = None
    if "claude_briefs" not in st.session_state:
        st.session_state.claude_briefs = {}
    if "gap_locations" not in st.session_state:
        st.session_state.gap_locations = {}

    top5 = wards.nlargest(5, "desert_severity")

    # ── Layout ──
    col_map, col_detail = st.columns([3, 1], gap="medium")

    with col_map:
        st.markdown(
            f"**{len(stations):,} mymizu stations** in Tokyo · "
            f"**23 wards** scored by plastic waste + coverage gap · "
            f"_Click any ward for AI analysis_"
        )

        current_gaps = st.session_state.gap_locations.get(st.session_state.selected_ward)
        m = build_map(
            wards,
            stations,
            selected_ward=st.session_state.selected_ward,
            gap_locs=current_gaps,
        )

        map_data = st_folium(m, use_container_width=True, height=580)

        # Click detection: lat/lng → point-in-polygon
        clicked = map_data.get("last_clicked") if map_data else None
        if clicked and clicked.get("lat"):
            click_pt = Point(clicked["lng"], clicked["lat"])
            for _, row in wards.iterrows():
                if row.geometry and row.geometry.contains(click_pt):
                    if row["ward_name"] != st.session_state.selected_ward:
                        st.session_state.selected_ward = row["ward_name"]
                        # Pre-compute gap locations for this ward
                        ward_stations = stations[
                            stations.geometry.within(row.geometry)
                        ][["longitude", "latitude"]].values.tolist()
                        gaps = find_gap_locations(
                            row.geometry,
                            ward_stations,
                        )
                        st.session_state.gap_locations[row["ward_name"]] = gaps
                    st.rerun()
                    break

    with col_detail:
        if st.session_state.selected_ward:
            ward = wards[wards["ward_name"] == st.session_state.selected_ward].iloc[0]
            gaps = st.session_state.gap_locations.get(ward["ward_name"], [])

            st.markdown(f"## 📍 {ward['ward_name']}")

            # Rank among 23 wards
            rank = wards["desert_severity"].rank(ascending=False).loc[ward.name]
            severity_color = "🔴" if rank <= 5 else "🟡" if rank <= 12 else "🟢"
            st.markdown(
                f"{severity_color} **#{int(rank)} worst** of 23 wards"
            )

            ca, cb = st.columns(2)
            ca.metric("Severity Score", f"{ward['severity_score']:.0f}/100")
            cb.metric("Stations", ward["station_count"])
            ca.metric("Waste", f"{ward['waste_per_capita']:.1f} kg/cap/yr")
            cb.metric("Coverage", f"{ward['coverage_density']:.2f}/km²")

            st.markdown(f"**Annual plastic waste:** {ward['waste_tonnes']:,.0f} tonnes")

            # Gap locations
            if gaps:
                total_bottles = sum(gap_to_bottles(g[2]) for g in gaps)
                st.divider()
                st.markdown("**Recommended new station locations:**")
                for i, (lat, lng, gap_m) in enumerate(gaps, 1):
                    bottles = gap_to_bottles(gap_m)
                    st.markdown(
                        f"**{i}.** `{lat:.4f}°N {lng:.4f}°E`  \n"
                        f"↳ {gap_m:.0f}m gap · {bottles:,} bottles/yr saved"
                    )
                st.success(f"**Combined impact: ~{total_bottles:,} plastic bottles/year**")

            # Claude brief
            st.divider()
            ward_name = ward["ward_name"]

            if ward_name in st.session_state.claude_briefs:
                st.markdown("**AI Intervention Brief:**")
                st.info(st.session_state.claude_briefs[ward_name])
                if st.button("🔄 Regenerate", key="regen"):
                    del st.session_state.claude_briefs[ward_name]
                    st.rerun()
            else:
                if not os.getenv("ANTHROPIC_API_KEY"):
                    st.warning("Add `ANTHROPIC_API_KEY` to `.env` to enable AI briefs.")
                else:
                    if st.button("✨ Generate AI Brief", type="primary", key="gen_brief"):
                        with st.spinner("Asking Claude..."):
                            ward_data = {
                                "ward_name": ward_name,
                                "waste_tonnes": ward["waste_tonnes"],
                                "waste_per_capita": ward["waste_per_capita"],
                                "station_count": ward["station_count"],
                                "coverage_density": ward["coverage_density"],
                                "severity_score": ward["severity_score"],
                                "gap_locations": gaps,
                            }
                            brief = generate_brief(ward_data)
                        st.session_state.claude_briefs[ward_name] = brief
                        st.rerun()

            if st.button("← Back to overview", key="back"):
                st.session_state.selected_ward = None
                st.rerun()

        else:
            # Overview panel
            st.markdown("## Tokyo's Top Refill Deserts")
            st.caption("High plastic waste + low mymizu coverage = dark red")

            for i, (_, row) in enumerate(top5.iterrows(), 1):
                with st.container():
                    st.markdown(
                        f"**{i}. {row['ward_name']}**  \n"
                        f"Score: **{row['severity_score']:.0f}/100** · "
                        f"{row['station_count']} stations · "
                        f"{row['waste_per_capita']:.1f} kg/cap/yr"
                    )
                st.divider()

            st.caption("👆 Click any ward on the map for detailed analysis + AI brief")

            # Summary stats
            st.markdown("---")
            st.markdown("**Dataset summary:**")
            st.markdown(
                f"- {len(stations):,} mymizu stations in Tokyo\n"
                f"- Worst ward: **{top5.iloc[0]['ward_name']}** "
                f"({top5.iloc[0]['severity_score']:.0f}/100)\n"
                f"- Best covered: **{wards.nsmallest(1, 'desert_severity').iloc[0]['ward_name']}**\n"
                f"- Average coverage: {wards['coverage_density'].mean():.2f} stations/km²"
            )

    # ── Bottom metrics bar ──
    st.divider()
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Tokyo Stations", f"{len(stations):,}")
    c2.metric("Worst Desert", top5.iloc[0]["ward_name"])
    c3.metric("Worst Score", f"{top5.iloc[0]['severity_score']:.0f}/100")
    worst_coverage = wards.nsmallest(1, "coverage_density").iloc[0]
    c4.metric("Lowest Coverage", f"{worst_coverage['ward_name']} ({worst_coverage['coverage_density']:.2f}/km²)")
    best_ward = wards.nlargest(1, "coverage_density").iloc[0]
    c5.metric("Best Coverage", f"{best_ward['ward_name']} ({best_ward['coverage_density']:.2f}/km²)")


if __name__ == "__main__":
    main()
