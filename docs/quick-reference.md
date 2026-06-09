# Team RAM — Quick Reference

> One-page cheat sheet. Print it. Tape it to your monitor.

## 🚀 Commands

```
WS  Status          VA  Validate Arch
NX  Next Steps      CA  Create Arch
GO  Execute         DG  Define Goal
PM  Party Mode      SK  Skill Create
MH  Full Menu       DA  Exit
```

### Preset Switching

```bash
./scripts/apply-preset.sh              # Apply active preset
./scripts/apply-preset.sh ollama        # Switch to ollama (free)
./scripts/apply-preset.sh openai      # Switch to OpenAI
./scripts/apply-preset.sh anthropic   # Switch to Claude
./scripts/apply-preset.sh mixed        # Best available per role
./scripts/apply-preset.sh --dry-run   # Preview changes
./scripts/apply-preset.sh --check     # Verify consistency
```

## 👥 The Team

| Agent | 🤖 | Role | When to Invoke |
|-------|-----|------|----------------|
| **Brooks** | 🔴 | Architect | Planning, decisions, conflicts |
| **Jobs** | ⚫ | Intent Gate | Vague requests, scope creep |
| **Bahari** | 💎 | Memory Curator | "Remember...", Brain queries |
| **Scout** | 🟣 | Recon | Always first. Search & discovery |
| **Woz** | 🟢 | Builder | Implementation, bug fixes |
| **Pike** | 🔵 | Interface Gate | API review, complexity |
| **Fowler** | 🟡 | Maintainability | Pre-commit, refactoring |
| **Bellard** | 🟠 | Diagnostics | Debugging, profiling |
| **Carmack** | ⚡ | Optimization | After Bellard measures |
| **Knuth** | 📐 | Data Architect | Schema, migrations, queries |
| **Hightower** | ☁️ | Infrastructure | CI/CD, Docker, deployment |

### Model Assignments (Default: Ollama)

| Agent | Model | Fallback |
|-------|-------|----------|
| Brooks | `glm-5.1:cloud` | `deepseek-v4-pro:cloud` |
| Jobs | `deepseek-v4-pro:cloud` | `kimi-k2.6:cloud` |
| Bahari | `kimi-k2.6:cloud` | `deepseek-v4-pro:cloud` |
| Scout | `nemotron-3-super:cloud` | `qwen3:0.6b` |
| Woz | `qwen3-coder-next:cloud` | `deepseek-v4-pro:cloud` |
| Pike | `deepseek-v4-pro:cloud` | `nemotron-3-super:cloud` |
| Fowler | `glm-5.1:cloud` | `deepseek-v4-pro:cloud` |
| Bellard | `glm-5.1:cloud` | `nemotron-3-super:cloud` |
| Carmack | `qwen3-coder-next:cloud` | `nemotron-3-super:cloud` |
| Knuth | `qwen3-coder-next:cloud` | `deepseek-v4-pro:cloud` |
| Hightower | `deepseek-v4-pro:cloud` | `glm-5.1:cloud` |

## ⚡ Instant Delegation

```
@brooks     Architecture question
@jobs       Scope is unclear
@scout      Find something in the codebase
@woz        Implement this feature
@pike       Review this API
@fowler     Pre-commit review
@bellard    Why is this slow?
@carmack   Optimize this function
@knuth     Schema change needed
@hightower CI/CD issue
@bahari    What did we decide about X?
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `opencode.json` | Main OpenCode config (runtime) |
| `.opencode/team-ram-presets.jsonc` | Model presets (edit here) |
| `.opencode/agent/` | Agent persona definitions |
| `.opencode/skills/` | Reusable skill workflows |
| `.claude/agents/` | Claude Code agent surface |
| `scripts/apply-preset.sh` | Apply preset to all surfaces |
| `scripts/lint-agents.sh` | Detect drift |

## 🔄 Workflow

```
Jobs gates → Brooks plans → Scout recons →
Specialist executes → Pike/Fowler reviews
```

**Immutable Rules:**
1. Always Scout first
2. Jobs gates intent
3. Brooks plans, Woz builds
4. Pike is read-only
5. Bellard measures, Carmack optimizes
6. Fowler reviews, not rewrites
7. Hightower automates
8. Knuth enforces correctness
9. Bahari curates memory

## 🛠️ Tools Permission

```yaml
permission:
  read:  allow
  edit:  allow
  bash:  allow
  skill:
    "allura-*": allow   # Allura skills
    "mcp-*": allow       # MCP skills
    "*": ask            # Everything else asks
```

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| Model not found | Check `opencode.json` provider.models list |
| Fallback not working | Install `@razroo/opencode-model-fallback` plugin |
| Agent not loading | Check `name:` in `.md` matches `opencode.json` key |
| Skill not showing | Check `permission.skill` allows it |
| Claude Code agents stale | Sync with `./scripts/apply-preset.sh` |
| Drift detected | Run `scripts/apply-preset.sh` to fix |
| `opencode.json` parse error | Validate JSON: `python3 -m json.tool opencode.json` |

## 🎯 Preset Cheat Sheet

| Preset | Cost | Best For |
|--------|------|----------|
| `ollama` | Free | Self-hosted, zero API costs |
| `openai` | ~$30-50/mo | Best reasoning quality |
| `anthropic` | ~$30-50/mo | Claude Code native |
| `mixed` | ~$15-30/mo | Cost/quality optimization |

---
*For full docs: [Configuration](configuration.md) | [Agents](agents.md) | [Presets](presets.md) | [Dual-Runtime](dual-runtime.md)*
*Run: `./scripts/apply-preset.sh --help`*
