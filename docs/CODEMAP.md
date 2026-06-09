# Code Map

Navigable overview of the Team RAM OpenCode Harness repository.

```
src/                              Core service code
├── http-server.ts                HTTP service (17+ endpoints)
├── agent-executor.ts             Agent invocation via Anthropic API
├── sona-trajectory.ts            SONA learning engine + trajectory capture
├── sona-patterns.ts              Pattern extraction pipeline
├── coherence-monitor.ts          Graph-based drift detection
├── curator.ts                    HITL approval queue
├── genesis-engine.ts             New agent proposal engine
├── agent-sandbox.ts              Experimental agent sandbox + cognitum gate
└── agent-lifecycle.ts            Agent birth/promotion/retirement

.opencode/                        Harness definitions (declarative markdown)
├── agent/                        10 specialist agent definitions
├── command/                      35+ workflow commands
├── skills/                       26+ reusable skills
├── routing/                      Performance router (SONA-informed v3)
├── hooks/                        Lifecycle hooks (session-start, task-complete)
├── contracts/                    Execution contracts (harness-v1, allura-invocation)
├── context/                      Hierarchical knowledge files
└── config/                       Agent metadata, MCP config, approved servers

planning docs/                    Architecture & design documents
├── BLUEPRINT.md                  Business + functional requirements
├── SOLUTION-ARCHITECTURE.md      System topology
├── ARCHITECTURE-SELF-EVOLUTION.md  L3 to L4 self-evolving spec
├── RISKS-AND-DECISIONS.md        Architectural decisions (AD-01..AD-08)
├── DATA-DICTIONARY.md            Data model reference
├── DESIGN-ROUTING.md             Routing design
├── DESIGN-LOGGING.md             Logging design
└── REQUIREMENTS-MATRIX.md        Requirements traceability

migrations/                       SQL migrations
└── 001-skill-revisions.sql       Skill revision queue table

Root files
├── CLAUDE.md                     AI agent guidance
├── README.md                     Project overview
├── CONTRIBUTING.md               Contributor guide
├── CHANGELOG.md                  Version history
├── LICENSE                       MIT license
├── package.json                  Bun project config
├── tsconfig.json                 TypeScript strict config
├── biome.json                    Linting + formatting
├── opencode.json                 OpenCode harness config
├── install.sh                    Cross-platform installer
└── .env.example                  Environment template
```
