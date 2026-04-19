# Design System — Tokyo Refill Desert Detector

**Direction:** Data-Serious with Mission Warmth

The app lives in the intersection of civic data tool and environmental mission. The visual language should feel like a serious analytical dashboard that a city planner would trust, not a pastel eco startup.

---

## Color Palette

| Role | Token | Hex |
|------|-------|-----|
| Background | `bg-base` | `#0A1628` |
| Surface | `bg-surface` | `#112240` |
| Border | `border-subtle` | `#1E3A5F` |
| Body text | `text-primary` | `#E2E8F0` |
| Muted text | `text-muted` | `#8BA3BC` |
| Accent / CTA | `coral` | `#FF6B35` |
| Impact numbers | `teal` | `#64FFDA` |

The deep ocean navy (`#0A1628`) was chosen deliberately over typical eco greens. It communicates "serious analytical tool" first. The coral accent adds warmth and draws attention to actions. Teal for impact numbers creates a visual language: this number matters, it represents real world change.

---

## Typography

| Use | Font | Weight | Notes |
|-----|------|--------|-------|
| Display / headers | Space Grotesk | 700 | letter-spacing: -0.03em |
| Body / UI | Plus Jakarta Sans | 400/500 | Clean, readable at small sizes |
| Data / numbers | JetBrains Mono | 700 | All metric values, coordinates, scores |

Loading via Google Fonts in `_inject_styles()`.

---

## Component Patterns

**Metric hero block** — for impact numbers and key stats:
```
background: #112240
border: 1px solid #64FFDA33
border-radius: 8px
label: uppercase, 0.75rem, #8BA3BC
value: JetBrains Mono, 1.6rem, #64FFDA
```

**Recommendation cards** — for gap locations (via `st.info()`):
```
background: #112240
border-left: 3px solid #FF6B35
```

**Buttons** — coral fill, dark navy text, no rounded pill shape.

---

## Map Styling

- Choropleth: `YlOrRd` (yellow-orange-red for desert severity — heat metaphor works)
- Recommendation markers: orange circles with white number labels, 32px diameter
- Station clusters: default blue MarkerCluster (intentional contrast — blue = water = refill)
- Layer control: `collapsed=True` to reduce visual noise

---

## Streamlit Theme (`.streamlit/config.toml`)

```toml
[theme]
primaryColor = "#FF6B35"
backgroundColor = "#0A1628"
secondaryBackgroundColor = "#112240"
textColor = "#E2E8F0"
font = "sans serif"
```
