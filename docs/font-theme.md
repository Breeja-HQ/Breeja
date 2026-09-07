Neo-brutalist / editorial. Hard 2px black borders, hard offset shadows (no blur), no border-radius except pills, flat oklch paper background.

---

## 1. Fonts

Three Google fonts via `next/font/google`:

```tsx
// app/layout.tsx
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";

const inter        = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const jetbrainsMono= JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

<html className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}>
```

Tailwind v4 mapping (`@theme inline` in globals.css — there is no tailwind.config.js):

```css
@theme inline {
  --font-sans:    var(--font-inter);
  --font-display: var(--font-space-grotesk);
  --font-mono:    var(--font-jetbrains-mono);
}
```

| Role | Family | Used for |
|---|---|---|
| sans | Inter | body, UI, default |
| display | Space Grotesk | headings / hero |
| mono | JetBrains Mono | status bars, codes, numbers, labels |

Inline mono fallback used throughout: `ui-monospace, SFMono-Regular, monospace`

---

## 2. Color Theme

All scoped under a single `.overflow-theme` wrapper class.

```css
.overflow-theme {
  --of-ink:      oklch(0.145 0.035 248);   /* near-black, all text + borders */
  --of-paper:    oklch(0.965 0.006 248);   /* off-white page background */
  --of-warm:     oklch(0.925 0.025 82);    /* warm cream panel */
  --of-grid:     oklch(0.72 0.16 252 / 0.5); /* grid-paper lines */
  --of-muted:    oklch(0.49 0.018 248);    /* secondary text */

  --of-blue:     #5BA4FF;
  --of-yellow:   #FFCC33;
  --of-mint:     #53DCA2;
  --of-orange:   #FF841F;   /* also the focus-visible ring */
  --of-lavender: #D0A1FF;
  --of-violet:   #9D72FF;
  --of-pink:     #FF86B9;

  --of-line: 2px solid var(--of-ink);      /* THE border token */

  min-height: 100dvh;
  padding-top: 72px;                        /* fixed header offset */
  background: var(--of-paper);
  color: var(--of-ink);
  font-family: ui-sans-serif, system-ui, sans-serif;
  letter-spacing: -0.025em;                 /* global tight tracking */
  overflow-x: clip;
}

@media (max-width: 680px) {
  .overflow-theme { padding-top: 64px; }
}
```

Base resets that go with it:

```css
.overflow-theme * { box-sizing: border-box; }
.overflow-theme button,
.overflow-theme a { color: inherit; font: inherit; }
.overflow-theme button { cursor: pointer; }
.overflow-theme :focus-visible {
  outline: 3px solid var(--of-orange);
  outline-offset: 3px;
}
```

Tailwind v4 dropped the default `cursor: pointer` on `<button>`, so declare it globally:

```css
@layer base {
  button:not(:disabled), a, [role="button"] { cursor: pointer; }
  button:disabled { cursor: not-allowed; }
}
```

### Grid-paper background utility

```css
.of-grid-paper {
  background-color: var(--of-paper);
  background-image:
    linear-gradient(var(--of-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--of-grid) 1px, transparent 1px);
  background-size: 64px 64px;
}
```

---

## 3. Typography Scale

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

---

## 4. Layout

### Containers

```css
max-width: 1080px;   /* main page container */
max-width: 46rem;    /* prose / narrow content */
max-width: 42rem;    /* tighter prose */
```

### Fixed header

```css
.of-header {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 90;
  min-height: 72px;                                 /* 64px under 680px */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  border: var(--of-line);
  background: var(--of-paper);
}
```

Body compensates with `padding-top: 72px` (→ `64px` mobile).

### Grid patterns

```css
/* Split hero — asymmetric, content-weighted */
grid-template-columns: minmax(320px, 0.85fr) minmax(520px, 1.15fr);
grid-template-columns: minmax(360px, 0.92fr) minmax(440px, 1.08fr);

/* Sidebar layouts */
grid-template-columns: minmax(0, 1fr) minmax(260px, 390px);
grid-template-columns: minmax(190px, 0.35fr) minmax(0, 0.65fr);

/* Even card grids */
grid-template-columns: repeat(2, minmax(0, 1fr));
grid-template-columns: repeat(3, minmax(0, 1fr));
grid-template-columns: repeat(4, minmax(0, 1fr));
```

All collapse to `grid-template-columns: 1fr` at the mobile breakpoint.

### Fluid section padding

```css
padding: clamp(48px, 7vw, 116px) clamp(28px, 7vw, 128px);
```

### Breakpoints

`680px` is the primary breakpoint (11 uses). `1120px` is the secondary desktop step.

```css
@media (max-width: 680px)  { }   /* primary mobile */
@media (max-width: 1120px) { }   /* tablet / small desktop */
@media (min-width: 681px) and (max-width: 1120px) { }
@media (max-width: 860px)  { }
@media (max-width: 620px)  { }
@media (max-width: 430px)  { }   /* small phone */
@media (prefers-reduced-motion: reduce) { }
```

---

## 5. Elevation & Shape

Hard offset shadows, **zero blur** — the neo-brutalist signature.

```css
box-shadow: 3px  3px  0 var(--of-ink);
box-shadow: 4px  4px  0 var(--of-ink);    /* common */
box-shadow: 6px  6px  0 var(--of-ink);    /* common */
box-shadow: 8px  8px  0 var(--of-ink);
box-shadow: 10px 10px 0 var(--of-yellow); /* accent variant */
box-shadow: 6px  6px  0 var(--of-blue);
box-shadow: 6px  6px  0 var(--of-orange);
```

`border-radius` is used exactly once: `999px` for pills. Everything else is a hard corner.

Logo treatment: `filter: drop-shadow(4px 4px 0 var(--of-ink));`

### Motion

```css
--ease-precise: cubic-bezier(0.22, 1, 0.36, 1);   /* primary easing */
                cubic-bezier(0.16, 1, 0.3, 1);    /* entrance easing */

transition: transform 110ms var(--ease-precise),
            box-shadow 160ms,
            background 160ms;
```

Durations cluster at `110ms` (transform), `160–180ms` (shadow/color), `420ms` (fades), `720ms+` (page-level).

---

## 6. Porting Checklist

1. Install fonts — Inter, Space Grotesk, JetBrains Mono.
2. Copy the `@theme inline` font mapping into your `globals.css` (Tailwind v4 — no config file).
3. Copy the `.overflow-theme` block; wrap your app in `<div className="overflow-theme">`.
4. Copy the base resets + `@layer base` cursor rules.
5. Use `var(--of-line)` for every border — never write `2px solid black` directly.
6. Use hard offset shadows with no blur; keep corners square.
7. Constrain headings with `ch` max-widths, not px.
8. Use `680px` as your primary breakpoint.