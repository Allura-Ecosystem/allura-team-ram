---
name: documentation-standards
description: "Documentation standards and AI-GUIDELINES for the Allura harness — required artifacts (Blueprint, Architecture, Design docs, Requirements Matrix, Risks & Decisions, Data Dictionary), AI disclosure policy, cross-referencing rules, completeness checklists. Use when creating or reviewing documentation, architecture docs, or PRDs."
---

# Documentation Standards

This harness uses structured documentation as a first-class engineering artifact.

## Required Artifacts

| Artifact | File | Purpose |
|----------|------|---------|
| Blueprint | `BLUEPRINT.md` | Single source of design intent |
| Solution Architecture | `SOLUTION-ARCHITECTURE.md` | Topological view — who calls what |
| Design documents | `DESIGN-<AREA>.md` | Deep-dive on one functional area each |
| Requirements Matrix | `REQUIREMENTS-MATRIX.md` | B→F→Use Case traceability |
| Risks & Decisions | `RISKS-AND-DECISIONS.md` | Architectural decisions + risk register |
| Data Dictionary | `DATA-DICTIONARY.md` | Canonical field-level reference |

## Templates

Copy from `guidelines/templates/` to start a new document.

## Key Principles

1. **Blueprint first** — It must exist before any Design documents
2. **AI disclosure** — AI-drafted content gets a notice block
3. **Cross-reference everything** — Every document links to related documents
4. **Source of truth** — Schema > Code > Docs
5. **Same-PR updates** — Schema or API changes must update Data Dict and Req Matrix in the same PR

## Agent Responsibilities

- **Brooks**: Ensures Blueprint exists before delegating design work
- **Woz**: Follows naming conventions, includes cross-references
- **Pike**: Reviews surface area and API ergonomics against Blueprint
- **Fowler**: Validates refactor completeness against Requirements Matrix
- **Scout**: Flags stale docs (>90 days old with active code changes)

## AI-Assisted Documentation Policy

### Disclosure Requirement

Any AI-drafted document must include:

```markdown
> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model.
> When in doubt, defer to the source code, JSON schemas, and team consensus.
```

### What AI Must Not Decide Alone

- Concurrency rules
- Failure semantics
- Security boundaries
- Naming conventions (confirm against schemas)
- Business requirements
- Breaking changes

## Source of Truth Hierarchy

| If conflict between... | Defer to... |
|------------------------|-------------|
| Document and JSON schema | JSON schema |
| Document and code model | Code model |
| Two documents | Blueprint, then team consensus |
| AI suggestion and any above | Source of truth |

## Completeness Checklist

- [ ] All B# IDs in Blueprint appear in Requirements Matrix
- [ ] All F# IDs appear in Requirements Matrix and at least one Design doc
- [ ] All entities in Data Dictionary have a JSON schema file
- [ ] All diagrams render correctly (Mermaid syntax)
- [ ] All links resolve (no dead anchors)
- [ ] AI disclosure notice present on AI-drafted docs
- [ ] No secrets, credentials, or PII in documentation
