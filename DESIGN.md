# Design System — Tokyo Refill Desert Detector

**Direction:** Data-Serious with Mission Warmth

The app lives at the intersection of civic data tool and environmental mission. The visual language should feel like a serious analytical dashboard that a city planner would trust, not a pastel eco startup.

---

## Color Palette

| Role | Token | Hex |
|------|-------|-----|
| Background | `bg-base` | `#111111` |
| Surface | `bg-surface` | `#1C1C1C` |
| Elevated | `bg-elevated` | `#161616` |
| Border | `border-subtle` | `#2C2C2C` |
| Body text | `text-primary` | `#EBEBEB` |
| Muted text | `text-muted` | `#888888` |
| Accent / CTA | `coral` | `#FF6B35` |
| Impact numbers | `teal` | `#64FFDA` |

Neutral dark gray (`#111111`) communicates "serious analytical tool" while remaining softer than pure black. The coral accent adds warmth and draws attention to actions. Teal for impact numbers creates a visual language: this number matters, it represents real-world change.

---

## Typography

| Use | Font | Weight | Notes |
|-----|------|--------|-------|
| Display / headers | Space Grotesk | 700 | letter-spacing: -0.03em |
| Body / UI | Plus Jakarta Sans | 400/500/600 | Clean, readable at small sizes |
| Data / numbers | JetBrains Mono | 400/500 | All metric values, coordinates, scores |

Loaded via Google Fonts in `app/globals.css`.

---

## Component Patterns

**Metric hero block** — for impact numbers and key stats:
```
background: #161616
border: 1px solid #2C2C2C
border-radius: 8px
label: uppercase, 0.75rem, #888888
value: JetBrains Mono, varies by importance, #64FFDA or #FF6B35
```

**Recommendation cards** — for gap locations:
```
background: #1C1C1C
border: 1px solid #2C2C2C
border-radius: 8px
```

**Combined impact block** — teal accent:
```
background: #1C1C1C
border: 1px solid rgba(100, 255, 218, 0.2)
border-radius: 8px
```

**Buttons** — coral fill, white text, 8px radius.

---

## Map Styling

- Basemap: CartoDB Dark Matter GL (free, no API key)
- Choropleth: YlOrRd gradient (yellow-orange-red for desert severity — heat metaphor)
- Recommendation markers: coral circles with white number labels, 28px diameter
- Station clusters: blue circles (`#0077B6`) — intentional contrast (blue = water = refill)
- Ward hover: white fill at 0.1 opacity via feature-state API
- Selected ward: coral fill + 3px coral border

---

## Layout

- Header: `h-14`, `bg-surface`, `border-b border-subtle`
- Map: flex-1, full height minus header + chat bar
- Sidebar: `w-80 xl:w-96`, fixed right panel
- Chat bar: `h-14`, translucent bottom bar with glass-morphism blur
- Chat panel: absolutely positioned overlay, `max-w-2xl`, 55vh max height, glass backdrop

---

## Interaction States

All interactive elements show `cursor-pointer`. Disabled states use `opacity-40` + `cursor-not-allowed`.

Loading spinners: `border-t-teal` on dark `border-border-subtle` base.
