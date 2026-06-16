# Changelog

All notable changes to the Team RAM OpenCode Harness will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
