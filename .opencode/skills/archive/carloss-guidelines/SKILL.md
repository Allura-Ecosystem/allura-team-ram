---
name: carloss-guidelines
description: "Use when Ronin asks for Carlos guidelines, carloss guidelines, or the repository AI guideline documentation standard from the Allura Memory AI-GUIDELINES.md templates. Produces the six required docs: BLUEPRINT.md, SOLUTION-ARCHITECTURE.md, DESIGN-*.md, REQUIREMENTS-MATRIX.md, RISKS-AND-DECISIONS.md, and DATA-DICTIONARY.md, with AI disclosure and cross-reference rules."
---

# Carlos Guidelines

Use this skill when Ronin asks for "Carlos guidelines", "carloss guidelines", "AI guidelines", "six AI guideline documents", "the Allura guidelines templates", or points at `guidelines/AI-GUIDELINES.md`.

## Source Of Truth

The canonical source is:

- `references/AI-GUIDELINES.md`

Template assets are bundled in:

- `assets/templates/BLUEPRINT.template.md`
- `assets/templates/SOLUTION-ARCHITECTURE.template.md`
- `assets/templates/DESIGN.template.md`
- `assets/templates/REQUIREMENTS-MATRIX.template.md`
- `assets/templates/RISKS-AND-DECISIONS.template.md`
- `assets/templates/DATA-DICTIONARY.template.md`

Read `references/AI-GUIDELINES.md` when exact rules, required sections, diagram rules, or naming conventions matter. Use template assets when scaffolding new docs.

## Required Documents

Create or maintain these six project documents:

1. `BLUEPRINT.md`
2. `SOLUTION-ARCHITECTURE.md`
3. `DESIGN-<AREA>.md`
4. `REQUIREMENTS-MATRIX.md`
5. `RISKS-AND-DECISIONS.md`
6. `DATA-DICTIONARY.md`

Do not replace this set with topic essays. The six documents are structured engineering artifacts.

## Required AI Disclosure

Every AI-drafted or AI-modified document must include this notice near the top:

```markdown
> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model (GitHub Copilot).
> Content has not yet been fully reviewed - this is a working design reference, not a final specification.
> AI-generated content may contain inaccuracies or omissions.
> When in doubt, defer to the source code, JSON schemas, and team consensus.
```

## Workflow

1. Hydrate project context:
   - current repo and branch
   - local instructions
   - existing docs
   - source code/schema/config if present
   - Allura memory namespace if available

2. Copy or mirror the guideline source:
   - `guidelines/AI-GUIDELINES.md`
   - `guidelines/templates/*.template.md`

3. Create the six required artifacts at the location expected by the project. The Allura standard defaults to repository root.

4. Fill project-specific content:
   - avoid unresolved placeholder tokens where possible
   - mark unknown schema/API details as planned or pending
   - keep requirements traceable by `B#`, `F#`, and use case IDs
   - link documents with relative Markdown links

5. Validate:
   - six required documents exist
   - AI disclosure appears in AI-shaped docs
   - Blueprint links to the other docs
   - Requirements Matrix maps every `B#` and `F#`
   - Risks & Decisions has AD/RK entries and status values
   - Data Dictionary names fields and planned schema links
   - no secrets or private data are present

6. Audit:
   - write important outcomes to Allura when memory tools are available
   - report file paths, validation result, blockers, and git status

## Project Boundary Notes

- Allura is the operating system; RuVix is inside Allura.
- Markdown guideline docs are repo-local mirrors/specs, not the RuVix authority.
- Allura memory is context and audit, not proof of Done.
- Evidence and validation prove Done.
