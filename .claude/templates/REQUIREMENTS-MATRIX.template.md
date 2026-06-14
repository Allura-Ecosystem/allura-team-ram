# Requirements Traceability Matrix

> [!NOTE]
> **AI-Assisted Documentation**
> Portions of this document were drafted with the assistance of an AI language model (GitHub Copilot).
> Content has not yet been fully reviewed — this is a working design reference, not a final specification.
> AI-generated content may contain inaccuracies or omissions.
> When in doubt, defer to the source code, JSON schemas, and team consensus.

<!-- One-sentence description of the system this matrix covers. -->
<!-- This matrix traces every Business Requirement, Functional Requirement, and Use Case across the [Service Name] design documentation. Use it to verify coverage, locate specifications, and assess the impact of changes. -->

---

## Table of Contents

- [1. Business Requirements → Functional Requirements](#1-business-requirements--functional-requirements)
- [2. Functional Requirements Detail](#2-functional-requirements-detail)
  - [[Domain Area 1] (F1–FN)](#domain-area-1-f1fn)
  - [[Domain Area 2] (FN–FM)](#domain-area-2-fnfm)
- [3. Use Case Index](#3-use-case-index)
  - [[Resource] Use Cases](#resource-use-cases)

---

## 1. Business Requirements → Functional Requirements

<!-- Each row is one Business Requirement.
     - ID: B1, B2, ...
     - Business Requirement: plain-language goal copied from BLUEPRINT.md §2
     - Functional Requirements: linked F# IDs that satisfy this business goal
     - Use Cases: label-indexed use cases from each DESIGN-*.md
-->

| ID | Business Requirement | Functional Requirements | Use Cases |
|----|----------------------|------------------------|-----------|
| B1 | <!-- Goal --> | [F1](#f1), [F2](#f2) | <!-- [AREA]-UC1, [AREA]-UC2 --> |
| B2 | <!-- Goal --> | [F3](#f3) | |
| B3 | <!-- Add rows as needed --> | | |

---

## 2. Functional Requirements Detail

<!-- Group functional requirements by domain area, matching the grouping in BLUEPRINT.md.
     Each row is one Functional Requirement.
     Columns:
     - ID: anchor-linked label (e.g., <a name="f1"></a>F1)
     - Requirement: copied verbatim from BLUEPRINT.md
     - Satisfied by: the API routes that implement this requirement, combined with links to the
       DESIGN-*.md section (and RISKS-AND-DECISIONS.md entry, if applicable) that specifies the
       implementation detail. Use · as a separator between multiple routes or document links within
       the same cell.
-->

### [Domain Area 1] (F1–FN)

| ID | Requirement | Satisfied by |
|----|-------------|--------------|
| <a name="f1"></a>F1 | <!-- Requirement text --> | `POST /v1/[resource]` · `GET /v1/[resource]` · [DESIGN-[AREA].md](../DESIGN-[AREA].md) |
| <a name="f2"></a>F2 | | |

---

### [Domain Area 2] (FN–FM)

| ID | Requirement | Satisfied by |
|----|-------------|--------------|
| <a name="f3"></a>F3 | | |
| <a name="f4"></a>F4 | | |

<!-- Add more domain groups as needed, following the same pattern -->

---

## 3. Use Case Index

<!-- Group use cases by resource area. Each use case must correspond to a matching sub-section
     in a DESIGN-*.md file's "Use Cases" section.
     Columns:
     - ID: label used in the B→F table above (e.g., SVC-UC1)
     - Name: short descriptive title
     - Design Doc: link to the DESIGN-*.md#anchor for this use case
     - Requirements: F# IDs this use case exercises
-->

### [Resource] Use Cases

| ID | Name | Design Doc | Requirements |
|----|------|------------|--------------|
| [AREA]-UC1 | <!-- Use case name --> | [DESIGN-[AREA].md#[area]-uc1](../DESIGN-[AREA].md#area-uc1) | F1, F2 |
| [AREA]-UC2 | | | |

---

<!-- === INSTRUCTIONS FOR USE ===

1. Copy this file to `docs/allura/REQUIREMENTS-MATRIX.md`.
2. Fill in the [placeholder] tokens with actual content.
3. Populate Section 1 by reviewing BLUEPRINT.md §2 (Business Requirements).
4. Populate Section 2 by reviewing BLUEPRINT.md §2 (Functional Requirements) and each DESIGN-*.md.
5. Populate Section 3 by reviewing each DESIGN-*.md "Use Cases" section.
6. Keep in sync: whenever a requirement, endpoint, or use case changes in another document,
   update this matrix in the same PR.
7. Remove this instructions block before publishing.

=== CHECKLIST BEFORE MERGING ===
- [ ] Every B# has at least one F# mapped
- [ ] Every F# appears in at least one Design doc
- [ ] Every use case label appears in a DESIGN-*.md Use Cases section
- [ ] All document links resolve
-->
