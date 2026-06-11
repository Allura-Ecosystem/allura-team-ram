# Allura GitHub Professional Polish Design

Date: 2026-06-11
Status: Approved direction, pending specification review
Owner: Allura Ecosystem
Governance namespace: `allura-system`

## Purpose

Give the Allura GitHub organization one professional, coherent public identity while preserving technical honesty, upstream attribution, repository history, and private-client boundaries.

The finished organization should let a new visitor answer four questions quickly:

1. What is Allura?
2. Which repository should I open?
3. What work is original to Allura versus inherited from upstream projects?
4. Which claims are proven by current repository evidence?

## Acceptance Criteria

The work is complete only when:

1. The GitHub organization overview has a public profile README with an ecosystem story and five-product map.
2. `allura-team-ram` has a visible, accurate README on its default branch.
3. Public repository names use consistent lowercase kebab-case.
4. Repositories derived from upstream projects contain clear, prominent attribution and update-policy documentation.
5. Unsupported marketing metrics, performance claims, cost estimates, maturity claims, and completion percentages are absent from public-facing copy and graphics.
6. Repository descriptions, topics, social previews, and pinned order present one coherent Allura system.
7. Every administrative mutation has a before-state receipt and a verified after-state receipt.

## Scope

### Public repositories

- `allura`: ecosystem overview and organization entry point
- `allura-memory`: governed memory and Brain/kernel
- `allura-team-ram`: agent execution and orchestration harness
- `allura-design-team-durham`: brand and design system

### Private repository

- `mortgage-audit`: private client implementation

The private repository may appear in the ecosystem map only as a labeled private implementation. No client data, screenshots, credentials, customer names, or operational details may enter public assets.

## Approaches Considered

### 1. Documentation-only cleanup

Keep current repository names and branches, then improve READMEs and descriptions.

Advantages:

- Lowest administrative risk
- Fewest broken local references
- Fastest visible improvement

Disadvantages:

- Preserves inconsistent naming
- Leaves `allura-team-ram` default-branch confusion unresolved
- Makes the organization continue to look assembled rather than intentionally designed

### 2. Full cleanup in one mutation window

Rename repositories, change default branches, publish all READMEs, update metadata, and pin repositories in one session.

Advantages:

- Fastest path to the final public state
- One coordinated announcement and validation pass

Disadvantages:

- Highest rollback complexity
- More difficult to isolate failures
- External links, submodules, badges, automation, and local remotes may all drift simultaneously

### 3. Staged professional cleanup

First prepare and validate documentation on branches. Then perform repository renames and default-branch changes one repository at a time, updating references and verifying redirects after each mutation.

Advantages:

- Produces the full professional result
- Preserves an evidence trail
- Makes each administrative change reversible
- Prevents one broken repository from contaminating the whole migration

Disadvantages:

- Requires multiple validation passes
- Takes longer than a single mutation window

### Decision

Use the staged professional cleanup. It is the only approach that delivers the approved naming and presentation standard while respecting Allura/RuVix proof, isolation, verification, and audit requirements.

## Information Architecture

### Organization profile

Create a public `.github` repository containing `profile/README.md`.

The organization profile should use this order:

1. Approved Allura wordmark or organization social preview
2. Positioning line: `Memory that shows its work`
3. Plain-language explanation of Allura
4. Five-product ecosystem map
5. Repository routing table
6. Governance principles: evidence, isolation, approval, and audit
7. Upstream acknowledgement statement
8. Contribution and security links

The profile must not include live counters, unsupported scale metrics, invented customer outcomes, or maturity claims that cannot be linked to evidence.

### Repository README standard

Each public repository should follow this common structure:

1. Product identity and one-sentence purpose
2. Verified status label
3. Relationship to the Allura ecosystem
4. Quick start that has been executed successfully
5. Architecture or workflow diagram
6. Current capabilities
7. Known limitations
8. Documentation index
9. Upstream and provenance section, when applicable
10. Contributing, security, and license links

Repository-specific detail may vary, but the truth and provenance sections are mandatory.

## Repository Naming

Target public names:

| Current | Target | Action |
| --- | --- | --- |
| `allura` | `allura` | Keep |
| `Allura_Memory` | `allura-memory` | Rename |
| `allura-team-ram` | `allura-team-ram` | Keep |
| Missing or differently named design repository | `allura-design-team-durham` | Create or rename only after source ownership is verified |
| `Allura_Desktop` | Not canonical | Preserve or archive only after content and dependency audit |

GitHub redirects are helpful but are not the validation mechanism. After every rename, update and verify:

- Local `origin` remotes
- Parent repository submodule URLs
- README links and badges
- GitHub Actions references
- Package and deployment metadata
- Documentation links
- Organization profile links

No repository may be deleted as part of this work.

## Team RAM Default-Branch Repair

Current evidence shows:

- GitHub defaults `allura-team-ram` to `dev`.
- The standalone local checkout is on `master`.
- The local README is not visible on the GitHub default branch.
- The local checkout has no configured remote.

The repair sequence is:

1. Fetch or clone the GitHub repository into an isolated worktree.
2. Record commit IDs and tree differences for `dev`, `main`, `master`, and the local standalone checkout.
3. Identify the branch containing the canonical, validated harness.
4. Reconcile the README and provenance files through a reviewed branch.
5. Create or update `main` as the stable public branch.
6. Verify the quick start and documentation links on `main`.
7. Change GitHub's default branch from `dev` to `main`.
8. Keep `dev` only if it has a documented development purpose.

The default branch must not change until `main` renders a README and the repository's required checks pass.

## Upstream Attribution

Every repository with inherited code or history must include an `UPSTREAM.md` file and a visible README summary.

`UPSTREAM.md` must identify:

- Upstream project name and URL
- Upstream license
- Fork or import point, when known
- Inherited commit history
- Allura-owned additions
- Local architectural changes
- Upstream synchronization policy
- Review and conflict-resolution process

Attribution language must be factual. Contributor counts and inherited commits should be described as upstream history, not Allura-created work.

Where ongoing synchronization is intended, configure:

- `origin`: Allura-owned repository
- `upstream`: original source repository

An upstream sync must use a reviewed branch and may not push directly to the stable default branch.

## Claim-Evidence Policy

Public claims fall into three classes:

### Allowed without additional proof

- Repository purpose
- Documented architecture
- Source-visible components
- Supported runtimes that are present and tested
- Governance rules that are implemented in repository configuration

### Allowed only with linked evidence

- Performance or latency numbers
- Scale and usage numbers
- Reliability percentages
- Security or compliance claims
- Cost estimates
- Compatibility matrices
- Completion levels
- Production-readiness claims

Evidence must be current, reproducible, and linked from the same document or an adjacent evidence file.

### Prohibited

- Invented customer counts or outcomes
- Unsupported `10M+`, `500K+`, or `99.9%` claims
- Estimated monthly costs presented as facts
- `Level 4`, `complete`, `production-ready`, or similar maturity labels without a passing acceptance gate
- Comparisons that imply superiority without measured criteria

When evidence is missing, use neutral language such as `implemented`, `experimental`, `optional`, `planned`, or `not yet verified`.

## Visual System

Use approved Allura identity assets and the locked blue, orange, green, gold, cream, and charcoal system.

Required public assets:

1. Organization social preview, 1280x640
2. Five-product ecosystem map in editable source plus SVG/PNG export
3. Consistent social preview card for each public repository
4. Team RAM execution-route diagram
5. Team RAM upstream-provenance diagram

Visuals must remain readable at GitHub README width and on mobile. They may not contain unsupported metrics. Every image requires meaningful alt text and an editable source.

## Repository Metadata

Each public repository receives:

- A concise one-line description
- Consistent topics such as `allura`, `governed-memory`, `agent-orchestration`, or `design-system`
- Correct project and documentation links
- A social preview image
- Appropriate visibility

Recommended descriptions:

- `allura`: `The map and governance entry point for the Allura ecosystem.`
- `allura-memory`: `Governed memory infrastructure with evidence, lineage, approval, and audit.`
- `allura-team-ram`: `Allura's specialist-agent execution harness with explicit routing and validation.`
- `allura-design-team-durham`: `Allura's evidence-led brand and design system, from strategy through application audit.`

The organization should pin repositories in the same order.

## Shared Community Files

The `.github` organization-profile repository should provide reviewed defaults for:

- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
- Issue templates
- Pull request template

Repository-local files override organization defaults when a project has stricter or domain-specific requirements.

## Mutation and Rollback Safety

Before each GitHub administrative change:

1. Record repository URL, visibility, default branch, description, topics, and current commit IDs.
2. Confirm the local source repository and authority.
3. Confirm no protected automation depends on the old name or branch.
4. Prepare the corresponding reference updates.

After each change:

1. Verify the old URL redirects when a rename occurred.
2. Verify the new default branch and README rendering.
3. Verify clone, fetch, and submodule access.
4. Verify badges and documentation links.
5. Record the result before moving to the next repository.

If validation fails, stop the migration and restore the previous default branch or repository name before proceeding.

## Validation

### Documentation checks

- All README links resolve.
- Quick starts execute successfully in clean environments.
- Images render with alt text.
- No prohibited claims appear in public documents or graphics.
- Each upstream-derived repository exposes attribution above the fold or near the first architecture explanation.

### GitHub checks

- Organization profile renders publicly.
- Repository descriptions and topics match the approved metadata.
- `allura-team-ram` defaults to `main` and shows its README.
- Old renamed URLs redirect.
- Pinned repositories appear in ecosystem order.

### Governance receipts

Store a migration report containing:

- Before and after metadata
- Commit IDs
- Rename and default-branch timestamps
- Link-check results
- Quick-start results
- Screenshot evidence
- Known remaining risks

Allura Brain logging is optional for execution continuity, but no memory entry substitutes for repository and GitHub evidence.

## Delivery Sequence

1. Inventory all public and private repositories and map local authority.
2. Prepare claim-safe README and attribution changes without altering GitHub administration.
3. Create and validate the `.github` organization profile.
4. Repair Team RAM's stable branch and README.
5. Rename `Allura_Memory` to `allura-memory` and update references.
6. Establish or rename `allura-design-team-durham` after ownership verification.
7. Update descriptions, topics, previews, and pinned order.
8. Run the final Team Durham read-only audit.
9. Publish the migration and provenance receipt.

## Out of Scope

- Rewriting application code
- Deleting repositories or commit history
- Publishing private client material
- Claiming Allura created inherited upstream work
- Promoting unverified metrics into canonical brand truth
- Treating screenshots or memory entries as proof that runtime behavior works
