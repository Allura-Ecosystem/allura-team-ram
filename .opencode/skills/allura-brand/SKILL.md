---
name: allura-brand
description: "Apply approved Allura brand rules to visual work."
---

# Allura Brand

Allura Brand keeps Allura work visually and verbally consistent. It is a guardrail
for branded artifacts, not a replacement for source docs.

## Global Scope Guard

This skill is global so it can be used from any project, but Allura brand law is
not global law for every client. Apply it when:

- The project is Allura / Allura Memory / RuVix / Team RAM related.
- The user explicitly asks for Allura branding.
- The artifact uses Allura assets, copy, README images, or Memory Command Center UI.

Do not force Allura colors, voice, or logo rules onto unrelated project brands.
If another repo has its own brand guide, follow that repo's local brand guide
unless the user explicitly asks to apply Allura.

## Source Order

Use the best available sources in order:

1. Current repo docs, especially `docs/allura/BLUEPRINT.md` section `0) Brand Identity`
2. Current repo `docs/allura/DESIGN-ALLURA.md`
3. Current repo `docs/allura/BRAND-RULES-dashboard-v2.md` when present
4. Real repo assets under `public/readme/`, `public/brand/`, `brand-assets/`, or approved asset folders
5. Global memory/context, if available
6. Current user instruction

If these conflict, pause and name the conflict before producing branded work.

## Brand Core

- Name in copy: `allura`
- Title/legal/product context: `Allura Memory`
- Tagline: `MEMORY THAT SHOWS ITS WORK`
- Positioning: warm, connected, governed, auditable memory
- Promise: create spaces where connection thrives, community grows, and everyone belongs
- Primary persona: Maya, 31, Oakland, community organizer
- Archetype mix: Caregiver 50%, Creator 30%, Explorer 20%

## Voice

Write like a warm, practical steward of memory.

Use:

- community
- connection
- belonging
- together
- warmth
- inviting
- welcoming
- craft
- care
- celebrate
- amplify
- evidence
- source
- provenance
- trust

Avoid:

- users when `people` works
- frictionless
- leverage
- seamless
- scalable
- fake certainty
- hype without proof
- vague AI magic

Tone target:

- Formality: 4/10
- Enthusiasm: 6/10
- Technicality: 3/10
- Humor: 4/10

## Visual Direction

Allura should feel warm, governed, and human. The interface may be technical,
but the atmosphere should not feel cold, cyberpunk, or generic AI SaaS.

Use:

- cream, charcoal, blue, orange, green, and gold from the source docs
- editorial headings with practical dense operator surfaces
- visible source/freshness/degraded-state badges
- real memory/provenance/audit concepts
- calm control surfaces instead of decorative charts

Avoid:

- purple AI gradients
- dark cyberpunk panels
- unrelated project tokens
- fake metrics
- vanity charts
- generic shadcn-muted visual language without Allura treatment
- generated logo marks
- reconstructed wordmarks

## Logo And Asset Rules

Use real assets only.

Known approved asset in Allura Memory:

- `public/readme/allura-wordmark.png`

Before using another logo/mark:

1. Check the current repo for real brand assets.
2. Prefer tracked assets over generated images.
3. Do not create a new logo, mark, letterform, seal, mascot, or wordmark.
4. Do not trace or approximate the logo in CSS/SVG unless the repo already has
   an approved SVG asset.

If a logo asset is missing, say so and create a placeholder layout that reserves
space for the real asset instead of inventing one.

## Memory Command Center Brand Rules

The dashboard is a Memory Command Center, not a decorative product dashboard.

Every dashboard surface should show:

- active `group_id`
- source of truth
- freshness
- degraded state
- path to evidence

Every mutation surface should show or produce:

- intent
- actor
- source
- policy
- validation
- audit receipt

Do not call anything healthy, live, synced, or done unless there is evidence.
Unknown is a valid state.

## Brand Compliance Checklist

Run this checklist before calling branded work ready:

- Real Allura asset used, or missing asset explicitly named.
- No generated logos or logo-like marks.
- Copy uses Allura voice and avoids banned phrases.
- Colors/tokens trace back to Allura docs or approved assets.
- Dashboard/README visuals show evidence, provenance, or governance rather than
  fake metrics.
- Any claim of live/healthy/done has proof.
- Accessibility is considered: contrast, keyboard reachability, readable labels.
- Degraded/unknown states are visible when data is absent.
- Project scope is respected; Allura rules were not applied to an unrelated brand.

## Output Templates

### Brand Review

```markdown
Brand review:

- Compliance: pass / partial / fail
- Sources checked:
- Real assets:
- Voice:
- Visual system:
- Governance truthfulness:
- Accessibility:
- Scope fit:
- Required fixes:
```

### Branded Build Receipt

```markdown
Allura brand receipt:

- Sources checked:
- Assets used:
- Tokens/colors used:
- Logo rule:
- Claims/evidence:
- Degraded/unknown states:
- Scope boundary:
- Remaining risks:
```

## When Creating README Or Marketing Images

1. Use the real wordmark if available.
2. Use brand atmosphere: warm, governed, connected, evidence-first.
3. Prefer diagrams, provenance flows, receipts, and operator cards over abstract
   AI art.
4. Keep the image understandable without reading the full README.
5. Never make a new logo.

## When Reviewing Existing Work

Score work as:

- `pass`: ready with only tiny polish
- `partial`: direction is right but compliance fixes are needed
- `fail`: conflicts with core brand, project scope, or invents assets/truth

For each issue, name the fix in plain language and cite the file or asset path.
