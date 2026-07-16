# Changelog

All notable changes to the Team RAM OpenCode Harness will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.2] - 2026-07-16

### Added
- Vendored canonical loopy loop-curation skill into `.opencode/skills/loopy/` (SKILL.md + 5 reference docs + openai.yaml)
- Added `/loopy` command (Loop Curation Layer) — discover, find, audit, adapt, craft, run, debrief, save, publish repeatable AI-agent loops
- Created `auto-mode` skill defining the 6-step bounded-autonomy contract (Observe → Choose → Act → Verify → Record → Stop) with terminal states and HITL boundary
- Enhanced `/auto` command to chain: loopy find-or-craft → complexity routing → ultra/ralph execution → loopy debrief → loopy save
- Added `--epic` flag to `/auto` for full sprint execution via bmad-sprint-loop
- Added `bin/agent-sync-check.sh` to detect drift between Claude-native `agents/` and OpenCode-native `.opencode/agent/core/`
- Added ADR: `docs/adr/ADR-loopy-auto-mode.md`

### Changed
- Bumped version 0.4.0 → 0.4.2 (both manifests)
- Repointed `.claude-plugin/plugin.json` `agents` array to `./agents/*.md` (Claude-native, `model: inherit`) — fixes Claude Desktop loading failure caused by OpenCode-only frontmatter fields
- `.codex-plugin/plugin.json` `agents` array unchanged (OpenCode-native frontmatter valid there)
- Registered loopy + auto commands in both manifests (32 → 34 commands)

### Fixed
- Claude Desktop agent loading failure: OpenCode-only frontmatter fields (`mode`, `persona`, `permission`, `scope`, `platform`, `status`, `category`, `type`, `model: openai/gpt-5.5`) caused silent fallback or invocation errors. Claude-native `agents/` dir uses `model: inherit` and omits invalid fields.
- Reconciled Brain/disk drift: Brain memory said loopy vendored at v0.4.2 but disk showed v0.4.0 with no loopy. Re-vendored and bumped to v0.4.2.

## 0.3.1

Fix plugin manifest: remove the redundant `hooks: ./hooks/hooks.json` reference. The standard `hooks/hooks.json` is auto-loaded, so the manifest reference triggered a "Duplicate hooks file detected" load error that prevented the harness governance hooks from loading.

## 0.3.0

Migrate session/task/query skills + commands off legacy Neo4j knowledge-graph tools (create_entities/search_memories) and MCP_DOCKER memory path to the governed allura-brain memory surface (episodic + curator:approve). Read-only recon skills retain raw SQL/Cypher as an explicit fallback.

## [0.2.0] - 2026-06-07

### Added
- Self-evolving harness architecture (Phases A-H)
- SONA trajectory integration with native @ruvector/sona NAPI-RS module
- Pattern extraction pipeline with configurable interval
- Coherence monitor with graph-based drift detection
- SONA-informed exploration router (replaces blind epsilon-greedy)
- HITL curator interface with REST API for approve/reject workflows
- Genesis engine for automatic agent proposal on coverage gaps
- Cognitum gate (3-layer pre-filter: structural, shift, evidence)
- Agent sandbox for experimental agent testing
- Agent lifecycle management (birth, promotion, retirement)
- Plugin builder skill for Claude Code / Codex / OpenCode plugins
- SQL migration for skill_revisions table (append-only, governed)
- Biome linting and formatting configuration
- TypeScript strict mode configuration
- GitHub Actions CI workflow
- CONTRIBUTING.md and CODE_OF_CONDUCT.md
- Professional .gitignore and .editorconfig

### Fixed
- Governance preflight hook false positives on ToolSearch (check_sql guard)

## [0.1.0] - 2026-04-13

### Added
- HTTP service for agent invocation (POST /invoke, GET /health)
- 10 Team RAM specialist agents (Brooks, Jobs, Woz, Scout, Pike, Fowler, Bellard, Carmack, Knuth, Hightower)
- 35+ workflow commands
- 26+ reusable skills
- Performance-aware agent routing with epsilon-greedy exploration
- Allura Brain integration (PostgreSQL episodic + Neo4j semantic)
- RuVector federated search (vector + BM25 hybrid)
- Cross-platform install script
- Contract-driven execution (DAY_BUILD and NIGHT_BUILD modes)
- 14 integration tests for HTTP service
- Governance hooks for group_id enforcement and append-only invariants
