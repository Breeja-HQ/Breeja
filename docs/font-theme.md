Typography reference only — font families, sizes, weights, spacing, line-height. No colors, borders, shadows, or layout tokens here; the frontend's actual theme lives in `frontend/app/globals.css`.

---

## 1. Fonts

Geist Sans and Geist Mono via `next/font/google` (or `geist` package), matching the frontend's live setup.

| Role | Family | Used for |
|---|---|---|
| sans | Geist Sans | body, UI, headings, default |
| mono | Geist Mono | status bars, codes, numbers, labels |

---

## 2. Typography Scale

Fluid `clamp()` for display type, fixed rem for UI type.

### Display / fluid

| Element | font-size | weight | line-height | letter-spacing | max-width |
|---|---|---|---|---|---|
| Hero h1 | `clamp(5rem, 9vw, 10.5rem)` | 900 | 0.94 | -0.055em | — |
| Hero h2 | `clamp(1.55rem, 2.4vw, 2.55rem)` | 800 | 1 | -0.035em | 11ch |
| Hero lede | `clamp(1rem, 1.25vw, 1.24rem)` | 600 | 1.52 | — | 42ch |
| Section h2 | `clamp(2.8rem, 4.8vw, 5rem)` | 900 | 0.92 | -0.055em | 13ch |
| Section lede | `clamp(1.08rem, 1.45vw, 1.5rem)` | 600 | 1.42 | — | 44ch |

### Fixed UI sizes (most-used first)

| Size | Typical use |
|---|---|
| `0.82rem` | status bars, meta, small labels (most common) |
| `0.86–0.90rem` | secondary body, captions |
| `0.78rem` | mono ticker / badge text |
| `0.72–0.75rem` | eyebrow labels, tags |
| `1.1–1.2rem` | card titles, brand name |

### Weights

Only heavy weights are used — `600`, `700`, `800`, `900`. Nothing lighter than 600.
- `900` — display headings
- `800` — subheads, buttons, emphasis (most common)
- `700` — labels, small bold
- `600` — body copy / ledes

### Letter-spacing

- Global body: `-0.025em`
- Display headings: `-0.045em` to `-0.055em` (tighter as size grows)
- Uppercase eyebrows/labels: `+0.08em`, `+0.12em`, `+0.16em`

### Line-height

- Display: `0.92 – 1.02`
- Subheads: `1.12 – 1.35`
- Body: `1.42 – 1.65` (`1.5` most common)

### Measure caps

Headings are constrained by character count, not pixels: `10ch`, `11ch`, `12ch`, `13ch` for display; `34ch`, `36ch`, `40ch`, `42ch`, `44ch`, `62ch` for body.
