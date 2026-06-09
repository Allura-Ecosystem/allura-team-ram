# Preset Switching Guide

> Switch between model providers instantly without editing 11 agent files.

## Switching Presets

### Via CLI (recommended)

```bash
# Apply the currently active preset
./scripts/apply-preset.sh

# Switch to a specific preset
./scripts/apply-preset.sh openai

# Switch to Anthropic
./scripts/apply-preset.sh anthropic

# Switch to mixed (best available per role)
./scripts/apply-preset.sh mixed

# Dry run — show what would change
./scripts/apply-preset.sh openai --dry-run

# Verify consistency (exit 1 if drift)
./scripts/apply-preset.sh --check
```

### Via Editing Config

Edit `.opencode/team-ram-presets.jsonc`:

```jsonc
{
  // Change this line
  "preset": "ollama",  // <-- change to "openai", "anthropic", or "mixed"
  // ...
}
```

Then run:

```bash
./scripts/apply-preset.sh
```

### Programmatic

```bash
# In CI or automation
python3 -c "
import json, re
with open('.opencode/team-ram-presets.jsonc') as f:
    content = f.read()
# Strip comments and parse
json_str = re.sub(r'//.*$', '', content, flags=re.M)
json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
data = json.loads(json_str)
data['preset'] = 'openai'
# Re-serialize with comments preserved (simplified)
with open('.opencode/team-ram-presets.jsonc', 'w') as f:
    json.dump(data, f, indent=2)
"
./scripts/apply-preset.sh
```

## When to Switch Presets

| Situation | From | To | Reason |
|-----------|------|----|--------|
| OpenAI credits exhausted | `openai` | `ollama` | Zero API costs |
| Claude Code session starting | `ollama` | `anthropic` | Claude Code can only use Anthropic models |
| Need best quality, budget available | `ollama` | `openai` | Superior reasoning |
| Ollama models failing | `ollama` | `mixed` | Fallback to paid providers selectively |
| Returning to self-hosted | `openai` | `ollama` | Cost reduction |

## Preset Definitions

### `ollama` (default)
All models run through local Ollama with cloud connector. Zero ongoing API costs.
- 17 locally available models
- `qwen3:0.6b` (498MB) — only truly local model
- All others route through Ollama cloud connector (Kimi GLM, DeepSeek, Qwen, etc.)

### `openai`
Uses OpenAI models exclusively. Best quality but requires credits.
- `gpt-5.5` for high-reasoning agents (Brooks, Jobs, Woz)
- `gpt-5.4-mini` for fast agents (Scout, Pike, Explorer)
- ~$30-50/month for heavy use

### `anthropic`
Uses Claude models exclusively. Claude Code runtime uses this implicitly.
- `claude-opus-4-6` for architect-level work
- `claude-sonnet-4` for builders and specialists
- `claude-haiku-4-5` for fast recon
- ~$30-50/month for heavy use

### `mixed`
Combines best available per agent:
- Brooks: `ollama/glm-5.1:cloud` (free, strong architect reasoning)
- Jobs: `openai/gpt-5.5` (strong intent gating)
- Scout: `ollama/nemotron-3-super:cloud` (fast + free)
- Bellard: `anthropic/claude-sonnet-4` (excellent diagnostics)

## Custom Presets

Add your own preset to `.opencode/team-ram-presets.jsonc`:

```jsonc
"presets": {
  // ... existing presets ...
  "my-custom": {
    "brooks": { "model": "google/gemini-3-pro-preview", "variant": "high" },
    "scout":  { "model": "google/gemini-3-flash",      "variant": "low"  },
    // ... all agents must be specified
  }
}
```

Then activate:

```bash
./scripts/apply-preset.sh my-custom
```

## Fallback During Switch

When switching presets, fallback chains are preserved:
- `ollama` preset: chains fallback to other ollama models
- `openai` preset: chains fallback to other openai models
- Cross-provider fallback is NOT recommended (cost/latency surprises)

## Gotchas

1. **Claude Code is always "anthropic"** — Claude Code cannot use ollama or OpenAI models in its agent `.md` files. The `anthropic` preset is for documentation/reference only.
2. **`.claude-plugin/agents/` is separate** — These are for OpenCode's plugin system, not Claude Code. They use OpenCode model IDs.
3. **Preset switch doesn't affect running sessions** — Only new sessions use the updated models.
4. **opencode.json `plugin` section** — You don't need to edit `opencode.json` when switching presets. The preset config is independent.

## Troubleshooting

```bash
# Check current preset
grep '"preset"' .opencode/team-ram-presets.jsonc

# Verify all surfaces match preset
./scripts/lint-agents.sh

# Fix all drift at once
./scripts/apply-preset.sh

# Check if a model is available
openCode list-models | grep glm-5.1
```

## Next Steps

- See [Configuration](configuration.md) — full config reference
- See [Agents](agents.md) — full agent roster
- See [Dual-Runtime Guide](dual-runtime.md) — Claude Code vs OpenCode

---
*Run `./scripts/apply-preset.sh --help` for all options.*
