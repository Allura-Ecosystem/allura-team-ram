<!-- Context: allura/brand-identity | Priority: high | Version: 1.0 | Updated: 2026-04-25 -->

# allura Brand Identity — Quick Reference

> Full machine-readable canon: `docs/branding/deliverables/06_allura-memory_brand-truth.json`  
> Figma file: `PAQpnxQZENNwbhmk5qxOjR`  
> Brand system index: `docs/branding/deliverables/README.md`

---

## Name Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| Always lowercase in copy | `allura` | `Allura`, `ALLURA` |
| Legal / title context | `Allura Memory` | — |
| No articles | `allura helps you…` | `The allura helps…` |
| Possessive | `allura's memory` | `Allura's memory` |
| Product extensions | `allura Community`, `allura Hub` | — |

---

## Tagline & Positioning

**Tagline:** MEMORY THAT SHOWS ITS WORK  
**Positioning:** Warm + Connected  
**Descriptor:** The AI memory layer for real life  
**Brand Promise:** We create spaces where connection thrives, community grows, and everyone belongs

---

## Core Values

| Value | Meaning |
|-------|---------|
| MEMORY | Preserving what matters, faithfully |
| CONNECTION | Bridging people and their AI |
| CLARITY | Making memory visible, not hidden |
| TRUST | Governed, auditable, never opaque |
| EMPOWERMENT | Giving people agency over their own data |

---

## Color Palette

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Deep Navy | `#1A2B4A` | 26, 43, 74 | Primary brand, headings, nav |
| Coral | `#E85A3C` | 232, 90, 60 | CTA, action, accents |
| Trust Green | `#4CAF50` | 76, 175, 80 | Success states |
| Clarity Blue | `#5B8DB8` | 91, 141, 184 | Info, secondary actions |
| Pure White | `#F5F5F5` | 245, 245, 245 | Backgrounds (primary) |
| Ink Black | `#1A1A1A` | 26, 26, 26 | Body text |
| Warm Gray | `#737373` | 115, 115, 115 | Secondary text, captions |

**Usage ratio:** 55% Pure White · 20% Ink Black · 15% Deep Navy · 7% Coral · 3% status  
**Forbidden pairs (WCAG fail):** Coral on White (1.3:1) · White on Coral (1.3:1)

---

## Typography

| Role | Typeface | Weight | Size |
|------|----------|--------|------|
| Display / Hero | Outfit | 700 | 96px (min 20px) |
| Section headings | Outfit | 700 | 56px |
| H1–H4 | Inter | 600–700 | 48px → 24px |
| Body | Inter | 400 | 16–18px |
| Caption / Overline | Inter | 400–600 | 12–14px |

**Google Fonts load:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700&display=swap" rel="stylesheet">
```

**Fallback:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

**Rules:** Left-aligned · Never justified · Never all-caps · Max 75 chars/line · 1.5× line-height

---

## Shadow System (3-layer editorial)

```css
/* Card */
box-shadow: 0 4px 20px -4px rgba(20,35,41,0.08), 0 8px 16px -4px rgba(20,35,41,0.12);

/* Hover */
box-shadow: 0 6px 24px -4px rgba(20,35,41,0.12), 0 12px 20px -4px rgba(20,35,41,0.16);

/* Modal */
box-shadow: 0 4px 20px -4px rgba(20,35,41,0.08), 0 8px 16px -4px rgba(20,35,41,0.12), 0 2px 4px 0 rgba(20,35,41,0.16);
```

Default card radius: `16px` · Min touch target: `48px`

---

## Voice & Tone

| Dimension | Score |
|-----------|-------|
| Formality | 4/10 |
| Enthusiasm | 6/10 |
| Technicality | 3/10 |
| Humor | 4/10 |

**Use:** Community · Connection · Belonging · Together · Warmth · Inviting · Welcoming · Craft · Care · Celebrate · Amplify  
**Avoid:** "users" (→ "people") · frictionless · leverage · seamless · scalable · transactional

Reading level: 8th–10th grade. Jargon-free. Conversational, like a trusted neighbor.

---

## Brand Archetype & Persona

**Archetype:** Caregiver 50% · Creator 30% · Explorer 20%

**Primary Persona — Maya:**
- 31 years old, Oakland community organizer
- Wants technology that feels warm, not soulless
- Represents urban millennials / Gen Z (25–45)
- Sarah's Law: if Maya has questions after 2 minutes, it's not done

---

## Logos & Assets

| Asset | Location |
|-------|----------|
| Primary wordmark | `docs/branding/assets/logos/allura-logo/logo main.png` |
| Favicon set (7 sizes) | `docs/branding/assets/favicons/` |
| Brand icons (10 SVGs) | `docs/branding/assets/icons/` |
| Figma source | `PAQpnxQZENNwbhmk5qxOjR` |

**Logo rules:** Never stretch, rotate, add shadows, change colors, or enclose in shapes.  
Min size: 120px digital / 1.5" print.
