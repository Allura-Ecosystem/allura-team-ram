# Team RAM OpenCode Config

This directory is the repo-local home for the **Team RAM OpenCode Harness**.

It contains the agent definitions, commands, skills, context files, and supporting configuration that shape how the harness behaves inside a coding project.

## Source of truth

- `opencode.json` holds top-level OpenCode configuration
- `.opencode/agent/` holds active Team RAM agent definitions
- `.opencode/command/` holds reusable workflow commands
- `.opencode/skills/` holds skill definitions and supporting assets
- `.opencode/config/` holds registry and harness metadata
- `.opencode/contracts/` holds harness and integration contracts
- `.opencode/SERVICES.md` lists HTTP services and external interfaces

## Purpose

The purpose of this directory is to keep the harness:

- **repo-local** — behavior can be tuned per project
- **explicit** — commands, roles, and constraints live in files
- **portable** — the same operating model can move to another coding repo
- **memory-capable** — Allura Brain integration can be used when persistent context is helpful

## Notes

- Team RAM is the primary active agent set
- Keep agent permissions and boundaries in agent frontmatter and instructions
- Avoid reintroducing stale legacy naming when current Team RAM names are the intended surface
- Treat memory integration as supporting infrastructure, not as the identity of the harness
