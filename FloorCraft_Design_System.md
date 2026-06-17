# FloorCraft — Design System Specification

> **Companion document to:** `docs/PRODUCT_SPEC.md` and `docs/BACKEND_SPEC.md`
> Version 1.0 | June 2025

---

## Table of Contents

1. [Design Direction](#1-design-direction)
2. [Color](#2-color)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [The Hero](#5-the-hero)
6. [3D Asset System](#6-3d-asset-system)
7. [Component Library](#7-component-library)
8. [Motion & Interaction](#8-motion--interaction)
9. [Page Structure](#9-page-structure)
10. [Responsive Behavior](#10-responsive-behavior)
11. [Accessibility](#11-accessibility)
12. [Implementation Notes](#12-implementation-notes)

---

## 1. Design Direction

### 1.1 The Vibe

**Industrial precision.** FloorCraft is a tool for people making real spatial decisions with real measurements. The design should feel like a well-made instrument — not a lifestyle product, not a SaaS dashboard. Think drafting table, steel rule, architectural blueprint. Every visual decision should earn its place by communicating capability and seriousness.

The three reference sites share a consistent underlying grammar that this system codifies:

- **FERRO** — oversized wordmark type bleeding off-canvas, 3D object as the hero focal point, large stat numbers as a secondary narrative device
- **RE—CO** — monochromatic restraint with a single strong accent, white-on-white 3D rendering creating depth without color, editorial negative space
- **Industry Inc.** — near-black ground, full-bleed type behind a physical object, ultra-condensed scale contrast between hero type and body copy

FloorCraft synthesizes all three: **dark ground, industrial type scale, a single cold accent, and a 3D floor plan object as the hero centerpiece.**

### 1.2 The Signature Element

> A **3D isometric floor plan object** — rendered as a precise architectural model hovering above the hero — that responds to scroll by slowly rotating to reveal its top-down 2D view, directly communicating the product's core transformation (3D → 2D planning).

This is the one place the design spends its boldness. Everything else is disciplined and quiet.

### 1.3 What This Design Is Not

- Not warm or residential — no wood tones, no soft creams, no lifestyle photography
- Not a SaaS gradient soup — no purple-to-teal gradients, no glassmorphism cards
- Not maximalist — the industrial aesthetic is achieved through precision and weight, not decoration
- Not playful — the copy is direct, the type is heavy, the palette is cold

---

## 2. Color

All color values are defined as CSS custom properties on `:root`. Components reference only these variables — never hardcoded hex values.

### 2.1 Palette

```css
:root {
  /* Grounds */
  --color-ground:        #0E0E0E;   /* Near-black. Primary page background. */
  --color-surface:       #161616;   /* Slightly lifted surface. Cards, panels. */
  --color-border:        #2A2A2A;   /* Subtle structural borders. */
  --color-border-strong: #404040;   /* Emphasis borders, dividers. */

  /* Type */
  --color-text-primary:  #F0EDE8;   /* Warm off-white. All primary body and display copy. */
  --color-text-secondary:#8A8A8A;   /* Mid-grey. Captions, labels, meta text. */
  --color-text-muted:    #4A4A4A;   /* Low-contrast. Placeholders, disabled states. */

  /* Accent — used sparingly */
  --color-accent:        #4A7FD4;   /* Blueprint blue. The single chromatic accent. */
  --color-accent-dim:    #1E3A5F;   /* Dimmed accent. Hover backgrounds, subtle fills. */
  --color-accent-glow:   rgba(74, 127, 212, 0.15); /* Accent with low opacity for glows. */

  /* Feedback */
  --color-success:       #3D7A5F;
  --color-warning:       #8A6A2A;
  --color-error:         #8A3A3A;
}
```

### 2.2 Usage Rules

| Token | Use | Never use for |
|---|---|---|
| `--color-ground` | Page background, hero background | Text, borders |
| `--color-surface` | Cards, panels, editor canvas chrome | Page background |
| `--color-border` | All structural dividers and outlines | Text |
| `--color-text-primary` | H1–H4, body copy, labels | Backgrounds |
| `--color-text-secondary` | Captions, metadata, stat labels | H1–H2 |
| `--color-accent` | CTAs, active states, links, the 3D object accent highlight | Backgrounds, large fills |
| `--color-accent-dim` | Hover states on accent elements | Text |

### 2.3 The Accent Discipline

`--color-accent` (blueprint blue) appears in **at most three places per page view** at any given time. Its rarity is what gives it weight. The reference sites all enforce this — RE—CO's single blue rectangle, FERRO's sparse pink-red detail on an otherwise dark palette, Industry Inc.'s near-monochromatic restraint.

Correct uses of the accent:
- Primary CTA button fill
- Active navigation indicator
- The glowing edge detail on the hero 3D object
- Hyperlinks in body text
- Focus ring on interactive elements

---

## 3. Typography

### 3.1 Typeface Roles

| Role | Family | Fallback | Notes |
|---|---|---|---|
| **Display** | [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue) | `Impact, Arial Narrow, sans-serif` | Hero headline, stat numbers, section titles. All-caps only. |
| **Body** | [Inter](https://fonts.google.com/specimen/Inter) | `system-ui, -apple-system, sans-serif` | All body copy, UI labels, navigation. Variable font — use weight axis. |
| **Mono / Data** | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | `Menlo, Consolas, monospace` | Dimension values, coordinates, measurement overlays in the editor. |

**The pairing logic:** Bebas Neue's extreme condensed width creates the massive type-as-architecture effect seen across all three references. Inter handles everything functional with clarity. JetBrains Mono signals precision and technical data in the editor context.

### 3.2 Type Scale

```css
:root {
  /* Display — Bebas Neue, uppercase only */
  --type-display-2xl: clamp(7rem, 15vw, 14rem);    /* Hero wordmark / single-word blast */
  --type-display-xl:  clamp(4rem, 8vw, 8rem);      /* Hero headline lines */
  --type-display-lg:  clamp(2.5rem, 5vw, 5rem);    /* Section titles */
  --type-display-md:  clamp(1.75rem, 3vw, 3rem);   /* Sub-section headers */

  /* Body — Inter */
  --type-body-lg:     1.125rem;   /* 18px — Lead / intro paragraphs */
  --type-body-md:     1rem;       /* 16px — Standard body copy */
  --type-body-sm:     0.875rem;   /* 14px — Captions, secondary labels */
  --type-body-xs:     0.75rem;    /* 12px — Metadata, timestamps */

  /* Mono — JetBrains Mono */
  --type-mono-md:     0.9375rem;  /* 15px — Editor dimension labels */
  --type-mono-sm:     0.8125rem;  /* 13px — Coordinate/value readouts */

  /* Line heights */
  --lh-display:       0.92;       /* Tight — display type should be dense */
  --lh-body:          1.6;        /* Comfortable reading */
  --lh-mono:          1.4;

  /* Letter spacing */
  --ls-display:       -0.02em;    /* Slight optical tightening on large type */
  --ls-label:          0.08em;    /* Tracking on small all-caps labels */
  --ls-mono:           0em;
}
```

### 3.3 Type Treatment Rules

- Display type (`--type-display-*`) is **always uppercase, always Bebas Neue**
- Body type is sentence case — no decorative casing
- Small labels (nav items, stat labels, eyebrows) use **Inter at weight 500, all-caps, `--ls-label` tracking** — never display type at small sizes
- Dimension values in the editor always use JetBrains Mono — this is a functional signal that they are data
- No text shadows. No gradient text. Type is type.

### 3.4 Eyebrow Labels

Used above section headlines to categorize content. Format:

```
[thin rule]  LABEL TEXT  [thin rule]
```

```css
.eyebrow {
  font-family: var(--font-body);
  font-size: var(--type-body-xs);
  font-weight: 500;
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  color: var(--color-accent);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.eyebrow::before,
.eyebrow::after {
  content: '';
  display: block;
  width: 2rem;
  height: 1px;
  background: var(--color-accent);
}
```

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

Based on a 4px base unit. All spacing values in the system derive from this scale.

```css
:root {
  --space-1:   0.25rem;   /*  4px */
  --space-2:   0.5rem;    /*  8px */
  --space-3:   0.75rem;   /* 12px */
  --space-4:   1rem;      /* 16px */
  --space-5:   1.25rem;   /* 20px */
  --space-6:   1.5rem;    /* 24px */
  --space-8:   2rem;      /* 32px */
  --space-10:  2.5rem;    /* 40px */
  --space-12:  3rem;      /* 48px */
  --space-16:  4rem;      /* 64px */
  --space-20:  5rem;      /* 80px */
  --space-24:  6rem;      /* 96px */
  --space-32:  8rem;      /* 128px */
  --space-40:  10rem;     /* 160px */
}
```

### 4.2 Grid

The layout uses a **12-column grid** with generous gutters. The hero intentionally **breaks out of the grid** for the oversized type effect.

```css
:root {
  --grid-columns:     12;
  --grid-gutter:      clamp(1rem, 3vw, 2rem);
  --grid-margin:      clamp(1.5rem, 5vw, 5rem);
  --content-max-width: 1440px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  gap: var(--grid-gutter);
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding-inline: var(--grid-margin);
}
```

### 4.3 Layout Zones

```
┌─────────────────────────────────────────────────────┐
│  NAV  (full bleed, transparent over hero)           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  HERO (full viewport height, full bleed)            │
│  ┌───────────────────────────────────────────┐      │
│  │  DISPLAY TYPE (bleeds left edge)          │      │
│  │  3D OBJECT (centered, overlapping type)   │      │
│  │  CTA (bottom-left, small)                 │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
├─────────────────────────────────────────────────────┤
│  STATS BAR (full bleed, thin border top/bottom)     │
├─────────────────────────────────────────────────────┤
│  FEATURE SECTIONS (grid, contained)                 │
│  PROCESS SECTION (grid, contained)                  │
│  EDITOR PREVIEW (full bleed dark panel)             │
│  FOOTER (contained)                                 │
└─────────────────────────────────────────────────────┘
```

### 4.4 Section Rhythm

Sections breathe with consistent vertical cadence. Do not use headings to create visual rhythm — use space.

```css
.section {
  padding-block: var(--space-32);  /* 128px top and bottom */
}

.section + .section {
  border-top: 1px solid var(--color-border);
}

.section--flush {
  padding-block: 0;  /* Full-bleed sections override the default */
}
```

---

## 5. The Hero

This is the design's thesis statement. It takes visual cues from all three references simultaneously.

### 5.1 Composition

```
┌─────────────────────────────────────────────────────────┐
│  [nav — transparent, white text]                        │
│                                                         │
│  FLOOR                                                  │
│  ──────── [3D floor plan model, centered] ──────────   │
│  CRAFT                                                  │
│                                                         │
│  [eyebrow: PLAN YOUR SPACE]                             │
│  [one-line descriptor: 14–16px Inter]                   │
│  [CTA button: "Upload Floor Plan →"]                    │
│                                                         │
│                                            scroll ↓     │
└─────────────────────────────────────────────────────────┘
```

- **"FLOOR"** sits at the top, Bebas Neue at `--type-display-2xl`, left-aligned, nearly touching the left viewport edge (8px margin). It is behind the 3D object in z-index.
- **"CRAFT"** sits below the 3D object, same treatment. Together the two words frame the object vertically like a vise.
- The **3D object** sits centered between the two type lines at approximately 45–55% viewport height. It casts a subtle radial shadow onto the background.
- The CTA and descriptor live in the lower-left, at small scale — deliberately subordinate to the type and object.
- No background imagery. The background is pure `--color-ground`.

### 5.2 Hero CSS Structure

```css
.hero {
  position: relative;
  width: 100%;
  height: 100svh;
  min-height: 600px;
  background: var(--color-ground);
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
}

.hero__word {
  font-family: var(--font-display);
  font-size: var(--type-display-2xl);
  line-height: var(--lh-display);
  color: var(--color-text-primary);
  letter-spacing: var(--ls-display);
  padding-left: 0.08em;         /* Optical margin alignment */
  user-select: none;
  pointer-events: none;
}

.hero__word--top {
  align-self: start;
  padding-top: var(--space-20); /* Clear the nav */
  z-index: 1;
}

.hero__word--bottom {
  align-self: end;
  padding-bottom: var(--space-16);
  z-index: 1;
}

.hero__canvas {
  position: absolute;
  inset: 0;
  z-index: 2;                   /* 3D canvas sits above the type */
  pointer-events: auto;
}

.hero__cta-group {
  position: absolute;
  bottom: var(--space-16);
  left: var(--grid-margin);
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
```

### 5.3 Below-the-Fold Hero Extension

Directly below the hero: a **stats bar** — three to four metrics about the tool rendered in large display type, matching the FERRO and Industry Inc. references.

```
┌────────────────────────────────────────────────────────┐
│  BORDER-TOP: --color-border-strong                     │
│                                                        │
│   6        ·    50+        ·    2         ·  Free      │
│   Room types    Furniture       View modes   Always    │
│                 items                                  │
│                                                        │
│  BORDER-BOTTOM: --color-border-strong                  │
└────────────────────────────────────────────────────────┘
```

Stat numbers use Bebas Neue at `--type-display-lg`. Labels use Inter at `--type-body-xs`, uppercase, `--color-text-secondary`.

---

## 6. 3D Asset System

### 6.1 Technology

The hero 3D object is built with **Three.js** — the same library used for the editor's 3D viewer, allowing shared utilities.

The object is an **isometric apartment floor plan model**: a top-down architectural shell (walls as extruded boxes, rooms as flat planes at slightly different elevations) that looks like a physical architectural maquette. It is not photorealistic — it uses flat materials in the palette's color language.

### 6.2 Material Palette for the 3D Hero Object

```javascript
// Matches the design system's cold industrial palette
const materials = {
  walls:        new THREE.MeshStandardMaterial({ color: 0x2A2A2A, roughness: 0.8, metalness: 0.3 }),
  floor:        new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.9, metalness: 0.1 }),
  accentEdge:   new THREE.MeshStandardMaterial({ color: 0x4A7FD4, roughness: 0.3, metalness: 0.8, emissive: 0x1E3A5F }),
  grid:         new THREE.MeshStandardMaterial({ color: 0x0E0E0E, roughness: 1.0, metalness: 0.0 }),
};

// Lighting — three-point: key (cool white), fill (near-black), rim (accent blue)
const keyLight  = new THREE.DirectionalLight(0xF0EDE8, 1.2);
const fillLight = new THREE.AmbientLight(0x161616, 0.5);
const rimLight  = new THREE.PointLight(0x4A7FD4, 0.8, 10);  // Sits behind/above
```

### 6.3 Scroll Interaction — The Signature Motion

The hero's 3D object **rotates on scroll** from an angled isometric view (showing the 3D architectural model) to a flat top-down 2D view (showing the floor plan as it appears in the editor). This directly communicates the product's core transformation.

```javascript
// Conceptual implementation — use in the Three.js scene
const START_ROTATION = { x: Math.PI / 4, y: Math.PI / 6, z: 0.2 };  // Isometric angle
const END_ROTATION   = { x: 0, y: 0, z: 0 };                          // Top-down / 2D view

window.addEventListener('scroll', () => {
  const scrollRatio = window.scrollY / window.innerHeight;
  const t = Math.min(scrollRatio * 2, 1);  // Complete by 50% scroll

  model.rotation.x = lerp(START_ROTATION.x, END_ROTATION.x, easeInOutCubic(t));
  model.rotation.y = lerp(START_ROTATION.y, END_ROTATION.y, easeInOutCubic(t));
  model.rotation.z = lerp(START_ROTATION.z, END_ROTATION.z, easeInOutCubic(t));
});
```

### 6.4 Hover Interaction

When the cursor enters the Three.js canvas:
- The object gently drifts in the direction of cursor offset (parallax, max ±8° on each axis)
- The accent rim light intensifies slightly (`intensity: 0.8 → 1.4`)
- Cursor changes to `grab`, becomes `grabbing` on mousedown for drag-to-rotate

On mobile: the drift parallax is driven by `deviceorientation` instead.

### 6.5 Editor 3D Objects

Inside the editor's 3D viewer, furniture items are rendered as simple labeled box geometries — not detailed models. This is intentional and matches the product philosophy.

```javascript
// Standard furniture box in the editor
const furnitureBox = new THREE.Mesh(
  new THREE.BoxGeometry(widthM, heightM, depthM),
  new THREE.MeshStandardMaterial({
    color: item.color_hex,
    roughness: 0.7,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  })
);
// Each box gets a CSS2DObject label showing its name and dimensions
```

---

## 7. Component Library

### 7.1 Navigation

Transparent over the hero. Gains a `background: rgba(14,14,14,0.92)` + `backdrop-filter: blur(12px)` backdrop on scroll past 80px.

```
┌─────────────────────────────────────────────────────────┐
│  [FC monogram]  Home  Product  How It Works  Open App → │
└─────────────────────────────────────────────────────────┘
```

- Height: 64px
- Logo: "FC" in Bebas Neue at 1.5rem, `--color-accent`
- Nav links: Inter 500, 14px, `--color-text-secondary` → `--color-text-primary` on hover
- CTA: outlined button (see 7.2) right-aligned
- Active link: `--color-text-primary` with 2px `--color-accent` underline offset

### 7.2 Buttons

**Primary — filled:**
```css
.btn-primary {
  font-family: var(--font-body);
  font-size: var(--type-body-sm);
  font-weight: 600;
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  color: var(--color-ground);
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  padding: var(--space-3) var(--space-6);
  border-radius: 0;             /* No border radius — industrial, not friendly */
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.btn-primary:hover {
  background: var(--color-text-primary);
  border-color: var(--color-text-primary);
}
```

**Secondary — outlined:**
```css
.btn-secondary {
  /* Same as primary except: */
  color: var(--color-text-primary);
  background: transparent;
  border: 1px solid var(--color-border-strong);
}

.btn-secondary:hover {
  border-color: var(--color-text-primary);
  background: transparent;
}
```

**No border-radius on any button.** Square corners are the industrial design signature at the component level. This applies to inputs, cards, and panels as well.

### 7.3 Cards

Used in the feature section below the hero.

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: var(--space-8);
  transition: border-color 200ms ease;
}

.card:hover {
  border-color: var(--color-border-strong);
}

.card__eyebrow {
  /* Uses .eyebrow class — see 3.4 */
  margin-bottom: var(--space-6);
}

.card__title {
  font-family: var(--font-display);
  font-size: var(--type-display-md);
  line-height: var(--lh-display);
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
}

.card__body {
  font-size: var(--type-body-md);
  line-height: var(--lh-body);
  color: var(--color-text-secondary);
}
```

### 7.4 Form Inputs (Editor & Auth)

```css
.input {
  font-family: var(--font-body);
  font-size: var(--type-body-md);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: var(--space-3) var(--space-4);
  width: 100%;
  outline: none;
  transition: border-color 120ms ease;
}

.input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-glow);
}

.input::placeholder {
  color: var(--color-text-muted);
}
```

Dimension inputs in the editor use `--font-mono` to signal they are data values, not prose.

### 7.5 Dimension Label (Editor Canvas)

Overlaid on furniture items in the 2D canvas and as CSS2DObject labels in 3D.

```css
.dimension-label {
  font-family: var(--font-mono);
  font-size: var(--type-mono-sm);
  color: var(--color-text-primary);
  background: rgba(14, 14, 14, 0.75);
  border: 1px solid var(--color-border-strong);
  padding: 2px 6px;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}
```

### 7.6 Badge / Status Pill

Used for CV processing status, room type labels.

```css
.badge {
  font-family: var(--font-body);
  font-size: var(--type-body-xs);
  font-weight: 500;
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  padding: var(--space-1) var(--space-3);
  border: 1px solid currentColor;
  border-radius: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.badge--accent   { color: var(--color-accent); }
.badge--muted    { color: var(--color-text-secondary); }
.badge--success  { color: var(--color-success); }
.badge--error    { color: var(--color-error); }
```

### 7.7 Divider

```css
.divider {
  width: 100%;
  height: 1px;
  background: var(--color-border);
  border: none;
  margin: 0;
}

.divider--strong {
  background: var(--color-border-strong);
}
```

---

## 8. Motion & Interaction

### 8.1 Principles

- **One orchestrated moment** (the 3D scroll rotation) is the design's motion signature. All other animation is subtle and functional.
- Respect `prefers-reduced-motion`. All scroll-driven animations and hover effects pause; only essential feedback (focus rings, button hover) remain.
- No page load animations. The hero appears immediately — no fade-in delay, no staggered reveal. The type is there when the page loads.
- Transition durations: `120ms` for immediate feedback (hover, focus), `300ms` for state changes (panel open/close), `600ms` for scroll-driven reveals.

### 8.2 Scroll-Triggered Reveals (Below the Hero)

Feature sections and cards below the hero use a subtle `translateY` + `opacity` reveal on scroll into view. This is implemented with `IntersectionObserver`, not a library.

```javascript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // Reveal once only
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
```

```css
[data-reveal] {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 600ms ease, transform 600ms ease;
}

[data-reveal].is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

### 8.3 Easing Functions

```css
:root {
  --ease-out-cubic:  cubic-bezier(0.33, 1, 0.68, 1);    /* UI transitions */
  --ease-in-out:     cubic-bezier(0.65, 0, 0.35, 1);    /* Scroll animations */
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1); /* Playful — used sparingly */
}
```

### 8.4 Editor-Specific Interactions

| Interaction | Behavior |
|---|---|
| Furniture drag | Item lifts: `opacity: 0.8`, `box-shadow: 0 8px 32px rgba(0,0,0,0.6)` |
| Snap to wall | Snap indicator: 2px `--color-accent` line flashes for 150ms |
| Collision | Item shakes (3px horizontal keyframe, 120ms) and rejects position |
| 2D → 3D toggle | Canvas cross-fades over 300ms |
| Room selection | Selected room border pulses once with `--color-accent` |
| Dimension label hover | Label transitions from `--color-text-secondary` to `--color-text-primary` |

---

## 9. Page Structure

### 9.1 Landing Page Sections

```
1. NAV
   — Transparent, 64px, position: fixed

2. HERO
   — 100svh, full bleed
   — "FLOOR" + 3D object + "CRAFT"
   — Scroll = object rotates to top-down view

3. STATS BAR
   — Full bleed, ~100px tall
   — 4 metrics: Room Types · Furniture Items · View Modes · Always Free
   — Bebas Neue numbers, Inter labels

4. WHAT IT DOES  [eyebrow: THE TOOL]
   — Two-column: left = large display headline, right = 3 short paragraphs
   — "Upload a floor plan. Place your furniture. See how it fits."

5. HOW IT WORKS  [eyebrow: THE PROCESS]
   — Three steps in a horizontal row:
     1. UPLOAD → 2. DETECT → 3. PLACE
   — Each step: large step number (Bebas Neue), short title, one-sentence description
   — Connected by a thin horizontal rule with arrow

6. FEATURE CALLOUTS  [eyebrow: BUILT FOR REAL SPACES]
   — 2×2 card grid
   — Card 1: 2D Editor — precision placement with snapping
   — Card 2: 3D View — see how objects fill volume
   — Card 3: Room Detection — CV extracts rooms from your upload
   — Card 4: Furniture Catalog — 50+ items, all real-world dimensions

7. EDITOR PREVIEW
   — Full-bleed dark panel, slightly lighter than --color-ground
   — Screenshot or live React embed of the 2D editor interface
   — Caption: "The editor. No clutter. Just your floor plan and a tape measure."

8. OPEN SOURCE CALLOUT
   — Full bleed, --color-accent-dim background
   — "Free. Open source. Always."
   — GitHub link, MIT badge

9. FOOTER
   — Three columns: Brand / Links / Legal
   — --color-text-muted for most text
   — --color-border-strong top border
```

### 9.2 App Pages (Editor, Dashboard)

App pages use a **different shell** from the marketing pages — no hero, no landing nav. They use a persistent top bar and sidebar layout.

```
┌────────────────────────────────────────────────────────────┐
│  TOP BAR: [FC] [Project Name ▾] [Save] [Share] [Export]   │
├──────────────┬─────────────────────────────────────────────┤
│              │                                             │
│  SIDEBAR     │  CANVAS (2D or 3D)                         │
│  Catalog     │                                             │
│  Rooms       │                                             │
│  Properties  │                                             │
│              │                                             │
│  (300px)     │  (flex-grow: 1)                             │
└──────────────┴─────────────────────────────────────────────┘
```

- Top bar: 56px, `--color-surface`, `border-bottom: 1px solid --color-border`
- Sidebar: 300px, `--color-surface`, `border-right: 1px solid --color-border`
- Canvas area: `--color-ground` background

---

## 10. Responsive Behavior

### 10.1 Breakpoints

```css
:root {
  --bp-sm:  480px;    /* Large phones */
  --bp-md:  768px;    /* Tablets */
  --bp-lg:  1024px;   /* Small laptops */
  --bp-xl:  1280px;   /* Desktop */
  --bp-2xl: 1440px;   /* Wide desktop */
}
```

### 10.2 Hero Responsive Behavior

| Viewport | Behavior |
|---|---|
| Desktop (≥1024px) | Full hero as described — type flanking the 3D object |
| Tablet (768–1023px) | Type scales down via `clamp`. 3D object scales to 60% size. |
| Mobile (<768px) | Hero becomes single-column. "FLOORCRAFT" stacks vertically. 3D object is static (no scroll interaction — performance). Editing tools hidden. |

### 10.3 Editor on Mobile

On mobile, the editor canvas is read-only (view mode). A persistent banner reads: **"Editing is available on desktop."** The user can still orbit the 3D view and zoom the 2D view. The sidebar collapses to a bottom drawer.

---

## 11. Accessibility

- All interactive elements have visible focus states using `--color-accent` ring: `outline: 2px solid var(--color-accent); outline-offset: 2px`
- Color contrast: `--color-text-primary` on `--color-ground` = 14.5:1 (exceeds AAA). `--color-text-secondary` on `--color-ground` = 5.2:1 (AA).
- `--color-accent` on `--color-ground` = 4.8:1 (AA for large text, passes for normal text ≥14px bold)
- The 3D hero canvas has `aria-label="Interactive 3D floor plan model"` and `role="img"` when in view-only mode
- All furniture items in the editor are keyboard navigable (Tab to select, arrow keys to move, R to rotate, Delete to remove)
- `prefers-reduced-motion` collapses all scroll and hover animations (see Section 8.1)
- Form labels always visible — no placeholder-as-label pattern

---

## 12. Implementation Notes

### 12.1 CSS Custom Properties Setup

All tokens should be declared in a single `tokens.css` file imported first in the app. Component files reference only the tokens — never hardcoded values.

```
frontend/src/
├── styles/
│   ├── tokens.css       ← All CSS custom properties (color, type, space, easing)
│   ├── reset.css        ← Minimal reset (box-sizing, margin, padding)
│   ├── base.css         ← Body, html, root font settings
│   └── utilities.css    ← .grid, .section, .eyebrow, .divider, [data-reveal]
```

### 12.2 Font Loading

```html
<!-- In index.html <head> — preconnect first, then load -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 12.3 Three.js Canvas Setup

The Three.js canvas for the hero renders into a `<canvas>` element inside `.hero__canvas`. It uses `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — cap at 2x to avoid performance issues on high-DPI screens. The editor's Three.js viewer is a separate renderer instance.

### 12.4 Shared Design Tokens in JavaScript

For values that Three.js needs (colors, etc.), export tokens from a JS file that mirrors the CSS:

```javascript
// frontend/src/styles/tokens.js
export const tokens = {
  colorGround:       '#0E0E0E',
  colorSurface:      '#161616',
  colorAccent:       '#4A7FD4',
  colorAccentDim:    '#1E3A5F',
  colorTextPrimary:  '#F0EDE8',
  colorTextSecondary:'#8A8A8A',
  colorBorder:       '#2A2A2A',
  colorBorderStrong: '#404040',
};
```

### 12.5 Icon System

Use [Lucide Icons](https://lucide.dev/) — already a dependency from the frontend stack. Stroke weight: 1.5px throughout. Size: 16px for UI, 20px for nav, 24px for empty states. Do not use filled icon variants — they conflict with the design's sparse aesthetic.

---

*This document is a companion to `docs/PRODUCT_SPEC.md` and `docs/BACKEND_SPEC.md`. It is the authoritative reference for all visual and interaction decisions in FloorCraft.*
