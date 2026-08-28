# Team RAM BMad Module

This is a **BMad Builder multi-skill module adapter** for the canonical Team RAM harness.
It makes the existing architecture, recon, story delivery, review, and bounded Auto Mode
capabilities discoverable through BMad without copying the full harness into a second runtime.

## Validate

```bash
python3 tools/validate-adapters.py
python3 /path/to/bmad-builder/skills/bmad-module-builder/scripts/validate-module.py skills
```

## Install and configure

Use BMad Builder's `bmad-bmb-setup` or the BMad module installer with `skills/tram-setup`.
Set the Team RAM harness source and the approved Allura tenant. When the native harness is
unavailable, adapter skills fail closed instead of pretending Team RAM executed.

## Capability map

- `tram-agent-brooks` — architecture and routing
- `tram-agent-scout` — read-only ContextPacket
- `tram-agent-woz` — approved story implementation
- `tram-story-delivery` — BMad story lifecycle
- `tram-quality-gate` — Pike/Fowler review and validation
- `tram-auto` — bounded Auto Mode
