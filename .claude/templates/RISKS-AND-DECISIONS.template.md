# Risks & Decisions Matrix: [Service Name]

> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model (GitHub Copilot).
> Content has not yet been fully reviewed — this is a working design reference, not a final specification.
> AI-generated content may contain inaccuracies or omissions.
> When in doubt, defer to the source code, JSON schemas, and team consensus.

<!-- One-sentence summary of what this document covers.
     Example: "This document captures key architectural and design decisions made in [Service Name],
     the rationale behind each, the alternatives considered, and the risks they introduce." -->

This document captures key architectural and design decisions made in [Service Name], the rationale behind each, the alternatives considered, and the risks they introduce. Use it to understand *why* the design is the way it is, and to evaluate the impact of changing it.

---

## Table of Contents

- [1. Architectural Decisions](#1-architectural-decisions)
  - [AD-01: <!-- Short title of decision -->](#ad-01--short-title-of-decision)
  - [AD-02: <!-- Short title of decision -->](#ad-02--short-title-of-decision)
  <!-- Add more AD entries as needed -->
- [2. Risks](#2-risks)
  - [RK-01: <!-- Short title of risk -->](#rk-01--short-title-of-risk)
  - [RK-02: <!-- Short title of risk -->](#rk-02--short-title-of-risk)
  <!-- Add more RK entries as needed -->

---

## 1. Architectural Decisions

<!-- Document decisions that shaped the system's structure, API semantics, data model, or enforcement strategy.
     Each entry should answer: What was decided? Why? What was rejected and why?
     Use sequential AD-## identifiers. -->

---

### AD-01: <!-- Short title of decision -->

| Field | Detail |
|-------|--------|
| **Status** | <!-- Decided \| Proposed \| Superseded \| Deferred --> |
| **Decision** | <!-- One or two sentences describing the concrete decision. Be specific: name the endpoint, field, or rule that was chosen. --> |
| **Rationale** | <!-- Why this decision was made. Explain the invariant, constraint, or operational reality that drove the choice. --> |
| **Alternatives considered** | <!-- What else was evaluated. Explain why each alternative was rejected. --> |
| **Consequences** | <!-- Optional. What changes in behaviour, API contracts, or operator workflows result from this decision. Omit if not applicable. --> |
| **Owner** | <!-- Optional. Team or role responsible for this decision. Omit if not applicable. --> |
| **References** | <!-- Links to related DESIGN-*.md sections, BLUEPRINT.md requirements (F#, B#), or schema files. --> |

---

### AD-02: <!-- Short title of decision -->

| Field | Detail |
|-------|--------|
| **Status** | <!-- Decided \| Proposed \| Superseded \| Deferred --> |
| **Decision** | <!-- One or two sentences describing the concrete decision. --> |
| **Rationale** | <!-- Why this decision was made. --> |
| **Alternatives considered** | <!-- What else was evaluated and why it was rejected. --> |
| **Consequences** | <!-- Optional. Omit if not applicable. --> |
| **Owner** | <!-- Optional. Omit if not applicable. --> |
| **References** | <!-- Links to related documents and requirement IDs. --> |

---

<!-- Copy the AD block above for each additional architectural decision. -->

---

## 2. Risks

<!-- Document known risks introduced by this system's design or operational characteristics.
     Each entry should answer: What can go wrong? How likely and severe is it? What mitigates it?
     Use sequential RK-## identifiers.
     Severity: Low | Low–Medium | Medium | Medium–High | High
     Likelihood: Low | Low–Medium | Medium | High | Certain (by design)
     Status: ✅ Mitigated | 🔴 Open -->

<!-- Summary table — add one row per risk before writing the detail entries below. -->

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| [RK-01](#rk-01--short-title-of-risk) | <!-- Short title --> | <!-- Severity --> | <!-- ✅ Mitigated \| 🔴 Open --> |
| [RK-02](#rk-02--short-title-of-risk) | <!-- Short title --> | <!-- Severity --> | <!-- ✅ Mitigated \| 🔴 Open --> |

---

### RK-01: <!-- Short title of risk -->

| Field | Detail |
|-------|--------|
| **Severity** | <!-- Low \| Low–Medium \| Medium \| Medium–High \| High --> |
| **Likelihood** | <!-- Low \| Low–Medium \| Medium \| High \| Certain (by design) --> |
| **Status** | <!-- ✅ Mitigated \| 🔴 Open --> |
| **Description** | <!-- What can go wrong. Describe the failure mode, edge case, or gap concretely. --> |
| **Mitigation** | <!-- How this risk is reduced or managed. Name specific patterns, controls, or operational steps. --> |
| **Owner** | <!-- Team or role responsible for mitigation. --> |
| **Related decision** | <!-- Link to the AD-## entry that introduced or is relevant to this risk. --> |

---

### RK-02: <!-- Short title of risk -->

| Field | Detail |
|-------|--------|
| **Severity** | <!-- Low \| Low–Medium \| Medium \| Medium–High \| High --> |
| **Likelihood** | <!-- Low \| Low–Medium \| Medium \| High \| Certain (by design) --> |
| **Status** | <!-- ✅ Mitigated \| 🔴 Open --> |
| **Description** | <!-- What can go wrong. --> |
| **Mitigation** | <!-- How this risk is reduced or managed. --> |
| **Owner** | <!-- Team or role responsible for mitigation. --> |
| **Related decision** | <!-- Link to the related AD-## entry, BLUEPRINT.md section, or DESIGN-*.md. --> |

---

<!-- Copy the RK block above for each additional risk. -->

---

**See also:**
- [BLUEPRINT.md](../../docs/allura/BLUEPRINT.md) — system design this document is based on
- [REQUIREMENTS-MATRIX.md](../../docs/allura/REQUIREMENTS-MATRIX.md) — requirement traceability
<!-- Add additional cross-references to DESIGN-*.md documents as appropriate -->
