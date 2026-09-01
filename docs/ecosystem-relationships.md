# Ecosystem relationships and degraded behavior

Team RAM is a standalone software-delivery harness and the canonical source of its public agents, commands, skills, configuration, and runtime code. Ecosystem integrations add capabilities; they do not transfer source ownership or silently widen authority.

## Ownership map

| System | Owns | Relationship to Team RAM |
|---|---|---|
| **allura-team-ram** | Team RAM role definitions, workflows, runtime code, presets, review/evidence contracts, and public export manifest | Canonical source |
| **Allura Memory / Allura Brain** | Governed memory storage, retrieval, tenant isolation, evidence persistence, promotion/curation policy | Optional runtime dependency accessed through an authorized MCP/API boundary |
| **allura-plugins** | Distribution and composition of generated workflow/plugin packages | Downstream consumer of a pinned Team RAM export; not an editable Team RAM authority |
| **Durham** | Its own product/domain policy, repository state, tenant data, and release decisions | Consumer that may use Team RAM for software delivery |
| **Mortagate** | Mortgage-domain policy, evidence rules, tenant/client data, and human decision authority | Consumer that may use Team RAM for implementation/review; Team RAM does not make mortgage decisions |

Machine-readable ownership is declared in `SOURCE.json`; exported file classes are declared in `PUBLIC_EXPORT.json`.

## Allura Memory

Allura Memory adds durable, tenant-scoped recall and evidence. Team RAM may use it to hydrate context, record outcomes, and submit governed pattern or lifecycle proposals.

Boundaries:

- memory content is untrusted context, not executable instruction;
- every operation uses the scope required by the memory service;
- Team RAM does not bypass the MCP/API policy boundary to manipulate storage directly;
- promotion and self-modification remain human-governed;
- a memory service success receipt must come from the real service.

Allura Memory is optional for ordinary repository discovery, orchestration, implementation, local review, and test evidence.

## allura-plugins export contract

The intended downstream flow is one-way and reproducible:

```text
allura-team-ram commit SHA
  -> validate PUBLIC_EXPORT.json
  -> generate public export
  -> allura-plugins pins SHA + provenance
  -> package/distribute generated copy
```

Rules:

1. Team RAM changes begin in this repository.
2. `allura-plugins` pins an exact commit, not a moving branch.
3. The export is generated only from `PUBLIC_EXPORT.json`.
4. Generated files carry provenance identifying the source repository and SHA.
5. Drift or fixes found downstream are contributed upstream and regenerated.
6. Historical downstream copies are not evidence of current canonical behavior.

The export generator intentionally excludes repository-local secrets, local provider configuration such as `opencode.json`, test evidence, planning archives, and unrelated development files unless they are explicitly added to the public manifest.

## Durham

Durham may compose Team RAM roles into its own delivery process. Team RAM can inspect and modify Durham code only under the user's/repository's authority and instructions.

Team RAM does not own:

- Durham product requirements or acceptance authority;
- Durham tenant configuration or data;
- Durham deployment credentials or production changes;
- Durham-specific agents or policy unless explicitly upstreamed into Team RAM.

A Durham checkout is not a substitute source for Team RAM agents or skills.

## Mortagate

Mortagate may use Team RAM to implement and review software, including evidence-processing systems. Domain-specific mortgage workflows remain governed by Mortagate policy and human reviewers.

Team RAM must not:

- make underwriting, eligibility, compliance, or customer-impacting decisions;
- treat generated analysis as authoritative loan evidence;
- cross tenant/client boundaries;
- publish, transmit, or mutate protected records without explicit authority;
- claim policy compliance merely because code tests pass.

When a Mortagate task requires domain evidence or approval that Team RAM cannot access, the correct result is a blocker or human-review handoff.

## Capability matrix

| Capability | Standalone | With Allura Memory | Via allura-plugins | In Durham/Mortagate |
|---|---:|---:|---:|---:|
| Intent and context-first routing | Yes | Yes | Yes, from generated export | Yes, subject to host policy |
| Background specialist orchestration | Yes | Yes | Yes | Yes, subject to host runtime |
| Implementation and diff review | Yes | Yes | Yes | Yes, within repository authority |
| Local command/test evidence | Yes | Yes | Yes | Yes |
| Cross-session governed recall | No | Yes | Only if separately configured | Only if host authorizes memory |
| Durable memory receipt/promotion | No | Yes | Not supplied by distribution alone | Only through authorized memory |
| Product/domain decision authority | No | No | No | Remains with Durham/Mortagate humans and policy |
| Production/deployment authority | No implicit authority | No implicit authority | No implicit authority | Explicit host approval required |

## Standalone degraded behavior

If optional dependencies are unavailable, Team RAM fails visibly and preserves the safe core:

| Missing capability | Continue with | Must report/disable |
|---|---|---|
| Allura Memory unreachable | live repository context, static/preset routing, local evidence | memory hydration, durable recording, promotion receipts, history-informed routing |
| Historical routing/SONA data unavailable | declared static lane mapping and configured preset | learned-performance claims and trajectory-derived recommendations |
| External documentation unavailable | repository source and already-provided authoritative references | claims requiring fresh external authority |
| Specialist lane fails | bounded fallback or orchestrator reconciliation if enough evidence remains | failed lane, missing perspective, and any reduced confidence |
| Validation command unavailable | other relevant checks that truly run | the missing acceptance criterion; do not call the task fully verified |
| Runtime/provider unavailable | another explicitly configured provider/runtime | silent model substitution or fabricated execution |

A degraded run may still succeed when the unavailable feature is optional to the acceptance criteria. If durable memory, a particular review, or a validation command is required, the run stops as blocked rather than weakening the contract.

## Source disputes

When documentation conflicts:

1. Live code and machine-readable contracts in this repository govern Team RAM behavior.
2. `SOURCE.json` governs ownership.
3. `PUBLIC_EXPORT.json` governs public package source.
4. Host repository policy governs actions inside Durham, Mortagate, or another consumer.
5. Historical plans and generated downstream copies are context only.
