---
name: tram-setup
description: Register Team RAM as a BMad module.
---

# Team RAM BMad Module Setup

## Purpose

Register Team RAM capabilities with BMad help and retain the module settings in the
project's unified `_bmad/config.yaml`. This adapter does not replace the Team RAM
harness; it makes its agent and workflow entry points discoverable to BMad.

## Configure

1. Read `assets/module.yaml` and `assets/module-help.csv`.
2. Register module code `tram` through `bmad-bmb-setup` or the BMad module installer.
3. Set `team_ram_source` to the installed Team RAM harness root.
4. Set `allura_group_id` to the approved tenant, normally `allura-system`.
5. Confirm `bmad-help` lists the Team RAM menu codes.

## Integration Rule

When the Team RAM runtime is present, invoke its canonical agents and skills. If it
is unavailable, report `blocked`; do not imitate file mutations or claim the runtime ran.
