---
name: frontend-design
description: "Design and polish accessible Allura frontend interfaces."
---

# Frontend Design Skill — Allura Memory

> Synthesized from [Impeccable](https://github.com/pbakaus/impeccable) + [Huashu-Design](https://github.com/alchaincyf/huashu-design), adapted for Team RAM / Next.js / Tailwind / ForceGraph2D.

---

## Core Workflow

```
Shape → Explore (3 directions) → Select → Systematize → Build (Woz) → Audit → Polish → Harden
```

**Never skip Shape. Never merge all three directions. Never hand off to Woz without a confirmed brief.**

---

## Commands

| Command | What it does |
|---------|-------------|
| `$frontend-design shape` | Define the UX intent, screen contract, states, and constraints before any code |
| `$frontend-design explore` | Generate 3 distinct visual directions (conservative / distinctive / experimental) |
| `$frontend-design select` | Choose one direction and explicitly reject the others |
| `$frontend-design systematize` | Convert selected direction into tokens, layout rules, component contracts |
| `$frontend-design audit` | Score across A11y, performance, theming, interaction states, responsiveness |
| `$frontend-design polish` | Final design system alignment pass |
| `$frontend-design harden` | Edge cases — empty states, errors, overflow, keyboard focus, reduced motion |
| `$frontend-design prototype` | Generate an HTML prototype for a section or component for visual review |

---

## Setup Gates (run before any design work)

| Gate | Check |
|------|-------|
| **Brand context** | Load `AGENTS.md` design tokens. Confirm active color set (allura-coral / primary / surface-subtle). |
| **Assets** | Verify required images exist in `public/assets/downloaded/` or `new-approved/`. Never invent imagery — use what's real. |
| **Stack** | Next.js 14 App Router · Tailwind CSS v4 · ForceGraph2D · IBM Plex Sans (body) + IBM Plex Mono (code/data) |
| **WCAG gate** | Allura Coral (#FF5A2E) approved for large text (24px+), buttons, icons only. Primary / Text Primary for body text. |
| **Shape brief** | Must exist and be user-confirmed before Woz touches code. |

State preflight before any file edits:
```
FRONTEND_PREFLIGHT: brand=pass assets=pass stack=pass wcag=pass shape=pass|pending mutation=open|blocked
```

---

## Project Design Contract

### Brand Tokens (locked — do not override)

| Token | Hex | Usage |
|-------|-----|-------|
| `allura-coral` | `#FF5A2E` | Primary CTA, highlights, icons — NOT body text |
| `primary` | `#1D4ED8` | Headers, primary actions, trust surfaces |
| `surface-subtle` | `#F6F4EF` | Light backgrounds, cards, subtle contrast |
| `success` | `#157A4A` | Growth, success states, positive feedback |
| `accent-gold` | `#C89B3C` | Secondary accents, highlights, special emphasis |
| `text-primary` | `#0F1115` | Body text, icons, strong contrast |
| `text-secondary` | `#6B7280` | Secondary text, helper text, labels |
| `surface-default` | `#FFFFFF` | Page backgrounds, cards, default surfaces |

### Theme System

| Value | Background | Text | Use case |
|-------|-----------|------|---------|
| `subtle` | `bg-surface-subtle` | `text-primary` | Default section, cards |
| `primary` | `bg-primary` | `text-white` | Hero, CTA, trust surfaces |
| `default` | `bg-surface-default` | `text-primary` | Clean page backgrounds, cards |
| `success` | `bg-success` | `text-white` | Success states, positive feedback |
| `accent` | `bg-accent-gold` | `text-primary` | Secondary accents, highlights |

### Typography

- **All headings:** IBM Plex Sans · sizes from `docs/design/` scale
- **Body:** IBM Plex Sans 16px / 400 / 1.65 line-height
- **Code / data blocks:** IBM Plex Mono — never use Proxima Nova or similar
- **Scale:** Display 72px → H1 56px → H2 40px → Body 16px

### Spacing Scale

`xs:4px` / `sm:8px` / `md:16px` / `lg:24px` / `xl:32px` / `2xl:48px` / `3xl:64px` / `4xl:96px`

### WCAG Rules

- Body text: Text Primary (#0F1115) on White (#FFFFFF): **16.4:1 AAA ✓**
- Primary Blue (#1D4ED8) on White (#FFFFFF): **4.6:1 AA ✓**
- Primary Blue (#1D4ED8) on Surface Subtle (#F6F4EF): **4.9:1 AA ✓**
- Allura Coral (#FF5A2E) on White (#FFFFFF): **3.1:1** — approved for large text (24px+), buttons, icons only — NOT body text
- Never Allura Coral on white for small body text

---

## Anti-Patterns (never do these)

From Impeccable's discipline system — these are automatic audit failures:

- **AI purple gradient soup** — no gradients that aren't from the brand palette
- **Nested card tar pit** — no cards inside cards inside cards
- **Icon overload** — icons alongside every text item with no design rationale
- **Same-size everything** — no visual hierarchy = no hierarchy at all
- **Generic placeholder imagery** — use real assets from `public/assets/downloaded/`
- **Hard-coded hex values** — use design tokens; never `#FF5A2E` inline
- **`outline: none` without replacement** — keyboard users need focus rings
- **Hover without focus** — both must be designed
- **Allura Coral on small body text** — WCAG fail, blocked
- **Using brand colors as generic utilities** — each token has specific semantic meaning

---

## Shape Protocol

Before any implementation, define:

1. **What is this for?** Which page / route / block?
2. **Who uses it?** Researchers / Data scientists / Domain experts?
3. **What's the user's state of mind?** Exploring? Analyzing? Validating?
4. **What content/data?** Real copy from seed script or CMS?
5. **Edge cases?** Empty state, error state, loading state?
6. **Visual direction?** Choose one theme from the theme system.
7. **Anti-goals?** What must this NOT look like?

Confirm the brief. Then explore.

---

## Explore Protocol (Huashu-inspired)

Generate exactly **3 visual directions**. Label them:

| Direction | Character |
|-----------|-----------|
| **Conservative** | On-brand, safe, high trust. Primary dominant. |
| **Distinctive** | Allura Coral as a committed color (30-60% surface). Bold hierarchy. |
| **Experimental** | Unexpected layout, asymmetry, or motion — still within the brand system. |

Use real brand assets in every direction. Never invent imagery.
Generate an HTML prototype when visual clarity is needed before code.

**Then stop. Wait for the user to select one.**

Do not merge directions. Merging is how second-system disease starts.

---

## Audit Dimensions

> **Audit Boundary:** This skill's audit (`$frontend-design audit`) checks **brand alignment** — are we on-brand, on-token, and visually consistent with the chosen direction? For implementation quality (WCAG compliance, motion safety, token authority enforcement, interaction states), use `$frontend-craft audit` from the `frontend-craft` skill.

Score each 0–4 after implementation:

| Dimension | Key checks |
|-----------|------------|
| **Accessibility** | Contrast ratios, ARIA labels, keyboard nav, semantic HTML, alt text, heading order |
| **Performance** | Lazy loading, no layout thrashing, no unbounded blur/shadow animations |
| **Theming** | All colors from tokens, no hard-coded values, consistent token use |
| **Interaction states** | Default, hover, focus, active, disabled, loading, error, success all designed |
| **Responsive** | Tested at 1280px / 768px / 375px — content doesn't overflow, no horizontal scroll |

Score ≥3 on all dimensions = ready to ship. Score <3 = fix before Woz commits.

---

## Harden Checklist

Before any block or page is marked done:

- [ ] Empty state designed (no content in CMS yet)
- [ ] Long text overflow handled (`overflow-hidden`, `truncate`, or `line-clamp`)
- [ ] Loading state (skeleton or spinner)
- [ ] Error state (form errors, API failures)
- [ ] Keyboard focus rings visible on all interactive elements (`:focus-visible`)
- [ ] `prefers-reduced-motion` respected for any animations
- [ ] Images have `alt` text (required by Allura schema)
- [ ] Mobile (375px) — no horizontal scroll, text readable, tap targets ≥44px

---

## Routing to Team RAM

| Task | Agent |
|------|-------|
| Shape + Explore + Select | Brooks / Jobs |
| Systematize (tokens, rules) | Brooks / Pike |
| Implementation (code) | Woz |
| Audit + Polish | Fowler |
| Harden (edge cases) | Woz + Fowler |
| Accessibility review | Pike |
| Performance | Carmack / Bellard |

---

## Token Authority Rule

**This is the conceptual integrity gate for Allura Design.**

All token consumption must use the Allura token system — never raw hex values or generic shadcn color utilities. Two paths are authoritative:

**Path 1 — HTML/JSX + Tailwind (preferred for component styling):**
- Use `bg-[var(--allura-blue) etc.]`, `text-[var(--dashboard-text-primary) etc.]`, `border-[var(--tone-blue-bg) etc.]` in Tailwind className strings
- CSS custom properties are the token system for Tailwind contexts
- ✅ CORRECT: `className="bg-[var(--allura-cream)] text-[var(--allura-charcoal)]"`
- ❌ WRONG: `style={{ backgroundColor: 'var(--allura-cream)' }}` — inline `var()` in `style={{}}` is prohibited

**Path 2 — Canvas 2D / JS-only contexts (where CSS vars cannot be consumed):**
- Use `tokens.ts` imports: `import { tokens } from '@/lib/tokens'`
- Required for ForceGraph2D, canvas rendering, dynamic calculations
- ✅ CORRECT: `const color = tokens.color.graph.edge`
- ❌ WRONG: `"#9CA3AF"` — raw hex in JS code

**Prohibitions (automatic audit fail):**
- **NO raw hex values** in component code — `#FF5A2E`, `#1D4ED8`, etc. are blocked
- **NO generic shadcn color utilities** — `bg-muted`, `text-muted-foreground` without Allura token mapping
- **NO inline `style={{ var() }}`** — use Tailwind `bg-[var(--allura-blue) etc.]` class syntax instead
- **Known exception:** Shadow rgba in cva template literals (`button.tsx`) — DD-004

### Example Pattern (CORRECT)

```tsx
// Path 1: Tailwind class with CSS custom property (HTML/JSX context)
<div className="bg-[var(--allura-cream)] text-[var(--allura-charcoal)]">
  <span className="text-[var(--allura-blue)] font-semibold">Title</span>
</div>

// Path 2: tokens.ts import (Canvas/JS context)
import { tokens } from '@/lib/tokens'
const nodeColor = tokens.color.graph.agent
```

### Example Pattern (WRONG — automatic audit fail)

```tsx
<div className="bg-[#FF5A2E]">                               ❌ Hard-coded hex
<div className="bg-primary">                                  ❌ Generic shadcn color utility
<div style={{ backgroundColor: 'var(--color-primary)' }}>    ❌ Inline style var() — use Tailwind class instead
```

### Token File Structure (expected)

```ts
// lib/tokens.ts
export const tokens = {
  colors: {
    'allura-coral': '#FF5A2E',
    'primary': '#1D4ED8',
    'success': '#157A4A',
    'accent-gold': '#C89B3C',
    'surface-subtle': '#F6F4EF',
    'surface-default': '#FFFFFF',
    'text-primary': '#0F1115',
    'text-secondary': '#6B7280',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px',
  },
  typography: {
    h1: 'font-plex-sans text-56 font-bold',
    h2: 'font-plex-sans text-40 font-semibold',
    body: 'font-plex-sans text-16 font-normal leading-165',
    code: 'font-plex-mono text-14 font-normal',
  },
}
```

---

## References

- [`reference/typography.md`](reference/typography.md) — type scale, rhythm, pairing rules
- [`reference/color-and-contrast.md`](reference/color-and-contrast.md) — OKLCH, tinted neutrals, palette structure
- [`reference/layout.md`](reference/layout.md) — spacing rhythm, grid, visual hierarchy
- [`reference/interaction-states.md`](reference/interaction-states.md) — 8 states, focus rings, hover vs focus
- [`reference/audit.md`](reference/audit.md) — full audit rubric
- [`reference/harden.md`](reference/harden.md) — edge case checklist
- [`reference/anti-patterns.md`](reference/anti-patterns.md) — what to never do
- `docs/design/DESIGN-WEBSITE.md` — block rendering spec
- `lib/tokens.ts` — single source of truth for all design tokens
- `AGENTS.md` — brand tokens, component library, WCAG rules

---

## Allura Stack Primer (for new contributors)

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 14 App Router | Client components for interactivity, server components for rendering |
| Styling | Tailwind CSS v4 | Custom config with Allura tokens; no arbitrary values |
| Visualization | ForceGraph2D | Graph-based data exploration; follow `force-graph` conventions |
| Fonts | IBM Plex Sans + IBM Plex Mono | System font stack fallback; load via Next.js config |
| Icons | Lucide React | Consistent icon set for UI elements |
| UI Primitives | shadcn/ui | Only as a base; colors must come from `tokens.ts` |
