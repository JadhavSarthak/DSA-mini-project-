# DESIGN.md

Design system for our website, inspired by https://cjpitisdonebro.com/

> **Read this first: what is verified and what is not.**
> The reference page was fetched as text only. The fetch returned its HTML metadata and visible copy, but **no stylesheet, no font files and no images**.
> Everything under "Verified" comes straight from that page. Everything under "Proposed" is my design decision in the same spirit, not a measured copy.
> To get a true 1:1 match, open the reference site, then use browser DevTools to read the real colour and font values, and replace the Proposed tokens below.

---

## 1. Verified from the reference site

| Item | Value | Source |
|---|---|---|
| Brand red / theme colour | `#E2261B` | `<meta name="theme-color">` |
| Hero imagery | A crosshair over a cockroach, on a solid red background | `og:image:alt` |
| Product type | Fact-check arcade game, free, no login | meta description |
| Tagline | "Big claims. Zero receipts." | meta description + hero |
| Viewport | `width=device-width, initial-scale=1, viewport-fit=cover` (edge-to-edge on phones, so safe-area insets matter) | meta viewport |
| Share image | 1200 x 630 | `og:image` |
| Page title | Heading set in two or three short lines: "CJP," / "It's done," / "Bro." | hero `h1` |

### Screens and controls that exist on the reference page
- **Home:** small kicker line ("Popping the propaganda."), top-bar links **Share** and **Receipts**, a big stacked headline, a two-line subhead, one primary button **Start playing →**.
- **In-game menu:** Resume, Restart level, Level select, Scoreboard, Sound on/off, Home.
- **Scoreboard:** tabs **ALL TIME / TODAY / MY SCORES**, a one-line rules note, **Copy result** and **Download score card** actions.

### Voice
Short, punchy, sarcastic. Sentence fragments. Verbs first: "pop", "bust", "check". No jargon.

---

## 2. Proposed design tokens (replace with real values after inspecting the site)

### Colour
| Token | Value | Use |
|---|---|---|
| `--red` | `#E2261B` (**verified**) | Page background on hero, primary surfaces, theme-color |
| `--red-deep` | `#B81C13` | Pressed states, shadows on red |
| `--ink` | `#0B0B0B` | Headline text on light surfaces, crosshair, outlines |
| `--paper` | `#FFF6EC` | Cards, scoreboard panels, text on red |
| `--white` | `#FFFFFF` | Text on red when contrast needs to be maximal |
| `--hit` | `#FFD400` | Score pops, active tab highlight, success flashes |
| `--muted` | `#7A1A14` | Secondary text on red |

Contrast notes (computed from the values above): white on `#E2261B` is about 4.5:1, so use it for large or bold text only; `#0B0B0B` on `#E2261B` is about 4.6:1. Body copy should sit on `--paper`, not on red.

### Typography (proposed, not measured)
- **Display / headline:** a heavy condensed or grotesque sans, 800-900 weight, tight leading (0.9), uppercase or sentence case, stacked on separate lines as on the reference. Suggested free options: *Anton*, *Bowlby One*, *Archivo Black*.
- **UI / body:** a clean sans, 400/600. Suggested: *Inter* or system-ui.
- **Scale:** hero `clamp(3.5rem, 14vw, 9rem)`; section `2rem`; body `1rem`; kicker/label `0.75rem` uppercase with `0.12em` letter-spacing.
- Always give fonts a fallback stack: `"Anton", Impact, "Arial Narrow Bold", sans-serif`.

### Spacing, shape, effects
- 8px base grid. Page padding `20px` mobile, `48px` desktop.
- Radius: buttons fully rounded (`999px`); panels `20px`.
- Borders: `3px solid var(--ink)` on buttons and cards (poster / sticker feel).
- Hard shadow, no blur: `box-shadow: 4px 4px 0 var(--ink)`; on press, translate by `(4px, 4px)` and drop the shadow.
- Motion: quick (120-180ms), springy "pop" scale on hit; respect `prefers-reduced-motion`.

---

## 3. Layout

**Home (mobile first)**
```
[ kicker ]                     [Share] [Receipts]
CJP,
IT'S DONE,                       <- stacked, huge, left-aligned
BRO.
Big claims. Zero receipts.
Let's see what survives.
[ Start playing -> ]             <- single dominant CTA, thumb reach
(crosshair motif behind / beside the headline)
```
- Full-bleed `--red` background; content max-width 1100px on desktop.
- Respect device cut-outs: `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`.

**Scoreboard**
- Paper-coloured panel on red. Three pill tabs (ALL TIME / TODAY / MY SCORES), active tab `--hit` with ink border.
- Ranked rows: rank, name, score. Rules note in small muted text under the list.
- Footer actions: **Copy result** (secondary), **Download score card** (primary).

---

## 4. Components

| Component | Spec |
|---|---|
| **Primary button** | `--ink` background, `--paper` text, 3px ink border, pill, hard shadow, label ends with an arrow `->` |
| **Secondary button** | `--paper` background, ink text, same border and shadow |
| **Top-bar link** | Uppercase 0.8rem, no underline, underline on hover/focus |
| **Tab** | Pill, 3px ink border; active = `--hit` fill |
| **Menu item** | Full-width row, 56px tall, large tap target, icon + label |
| **Toggle (Sound)** | Label shows state in words: "Sound: On" / "Sound: Off" |
| **Score pop** | `--hit` text, scale 0.6 -> 1.2 -> 1, fades after 600ms |

---

## 5. Accessibility rules
- Minimum tap target 44x44px.
- Visible focus ring: `3px solid var(--hit)` with `2px` offset on every interactive element.
- Never rely on colour alone for state (tabs also get weight and border change).
- Sound must be opt-out and its state announced in text.
- Honour `prefers-reduced-motion` and `prefers-color-scheme` (the red hero stays red in both modes; panels may switch from `--paper` to `#1A1A1A`).

---

## 6. What not to copy
Use the reference as inspiration for mood, layout and palette. Do **not** reuse its name, logo, cockroach/crosshair artwork, exact copy or share image. Create our own mark and wording.

---

## 7. CSS starter

```css
:root {
  --red: #E2261B;      /* verified */
  --red-deep: #B81C13;
  --ink: #0B0B0B;
  --paper: #FFF6EC;
  --hit: #FFD400;
  --muted: #7A1A14;
  --radius-pill: 999px;
  --radius-panel: 20px;
  --shadow-hard: 4px 4px 0 var(--ink);
  --font-display: "Anton", Impact, "Arial Narrow Bold", sans-serif;
  --font-ui: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
}

html { background: var(--red); color: var(--paper); }
body {
  margin: 0;
  font-family: var(--font-ui);
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}

h1.hero {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 14vw, 9rem);
  line-height: 0.9;
  text-transform: uppercase;
  margin: 0;
}

.btn {
  font: 700 1rem var(--font-ui);
  padding: 16px 28px;
  border: 3px solid var(--ink);
  border-radius: var(--radius-pill);
  background: var(--ink);
  color: var(--paper);
  box-shadow: var(--shadow-hard);
  cursor: pointer;
  transition: transform 120ms, box-shadow 120ms;
}
.btn:active { transform: translate(4px, 4px); box-shadow: 0 0 0 var(--ink); }
.btn:focus-visible { outline: 3px solid var(--hit); outline-offset: 2px; }

.tab { border: 3px solid var(--ink); border-radius: var(--radius-pill);
       background: var(--paper); color: var(--ink); padding: 8px 16px; font-weight: 700; }
.tab[aria-selected="true"] { background: var(--hit); }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
```
