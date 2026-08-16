# Team RAM Installation Guide

Complete setup instructions for the Team RAM harness across all supported runtimes.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install from GitHub](#install-from-github)
3. [Configure Providers](#configure-providers)
4. [Activate Preset](#activate-preset)
5. [Verify Setup](#verify-setup)
6. [Install as Plugin (OpenCode Marketplace)](#install-as-plugin-opencode-marketplace)
7. [Install for Claude Code](#install-for-claude-code)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

| Tool | Version | Purpose |
|------|---------|---------|
| [Bun](https://bun.sh) | ≥1.1 | Runtime and package manager |
| [Ollama](https://ollama.com) | Latest | Local model runtime (default preset) |
| Git | Latest | Version control |

### Optional (Provider-Specific)

| Provider | Requirement | Purpose |
|----------|-------------|---------|
| OpenAI | API key | `openai` and `mixed` presets |
| Anthropic | API key | `anthropic` preset |
| Docker | ≥20.10 | Allura Brain memory services (PostgreSQL with governed graph tables) |

### Verify Prerequisites

```bash
# Check Bun version
bun --version

# Check Ollama is running
ollama list

# Check Git
git --version

# Optional: Check Docker (for Allura Brain)
docker --version
docker compose version
```

---

## Install from GitHub

### Clone the Repository

```bash
git clone https://github.com/Charitablebusinessronin/team_durham.git
cd team_durham
```

### Install Dependencies

```bash
bun install
```

### Copy Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```bash
# PostgreSQL Configuration (Allura Episodic Memory)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=ronin4life
POSTGRES_PASSWORD=your_postgres_password_here
POSTGRES_DB=memory

# Governance Configuration
PROMOTION_MODE=soc2
AUTO_APPROVAL_THRESHOLD=0.85

# MCP Server Path
ALLURA_MCP_SERVER=/path/to/your/allura-memory/src/mcp/memory-server-canonical.ts

# Tenant Isolation
DEFAULT_GROUP_ID=allura-system

# Harness HTTP Service
HARNESS_PORT=7654
HARNESS_API_KEY=your_secure_random_key_here
```

> **Note:** For local-only development with the `ollama` preset, you can skip API key configuration. The `.env` file is only required for Allura Brain integration.

---

## Configure Providers

### Ollama Setup (Default)

1. **Install Ollama** (if not already installed):

   ```bash
   # macOS
   brew install ollama

   # Linux
   curl -fsSL https://ollama.com/install.sh | sh

   # Windows
   # Download from https://ollama.com/download
   ```

2. **Start Ollama Server**:

   ```bash
   ollama serve
   ```

3. **Pull Required Models**:

   ```bash
   # Pull all Team RAM models
   ollama pull glm-5.1:cloud
   ollama pull deepseek-v4-pro:cloud
   ollama pull kimi-k2.6:cloud
   ollama pull nemotron-3-super:cloud
   ollama pull qwen3-coder-next:cloud
   ollama pull qwen3:0.6b
   ```

   **Or use the convenience script** (if available):

   ```bash
   ./scripts/pull-ollama-models.sh
   ```

4. **Verify Models**:

   ```bash
   ollama list
   ```

   Expected output should show all 6 models.

### OpenAI Setup

1. **Obtain API Key**:

   - Visit https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Add to Environment**:

   ```bash
   # Add to .env or shell profile
   export OPENAI_API_KEY=sk-your-key-here
   ```

3. **Verify API Key**:

   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

### Anthropic Setup

1. **Obtain API Key**:

   - Visit https://console.anthropic.com/settings/keys
   - Create a new API key
   - Copy the key (starts with `sk-ant-`)

2. **Add to Environment**:

   ```bash
   # Add to .env or shell profile
   export ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. **Verify API Key**:

   ```bash
   curl https://api.anthropic.com/v1/models \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01"
   ```

---

## Activate Preset

Team RAM uses preset-based configuration. The `apply-preset.sh` script updates all agent surfaces (`.opencode/agent/`, `opencode.json`, `.claude-plugin/agents/`, `.claude/agents/`) in one command.

### Available Presets

| Preset | Cost | Best For |
|--------|------|----------|
| `ollama` (default) | Free | Zero API costs, self-hosted |
| `openai` | ~$30-50/mo | Best reasoning quality |
| `anthropic` | ~$30-50/mo | Claude Code native users |
| `mixed` | ~$15-30/mo | Cost/quality optimization |

### Apply Default Preset (Ollama)

```bash
./scripts/apply-preset.sh
```

### Apply Named Preset

```bash
# OpenAI preset
./scripts/apply-preset.sh openai

# Anthropic preset
./scripts/apply-preset.sh anthropic

# Mixed preset
./scripts/apply-preset.sh mixed
```

### Dry Run (Preview Changes)

```bash
./scripts/apply-preset.sh --dry-run
```

### Check Mode (Verify Without Changes)

```bash
./scripts/apply-preset.sh --check
```

### What the Script Does

The `apply-preset.sh` script:

1. Reads `.opencode/team-ram-presets.jsonc`
2. Extracts model assignments for the selected preset
3. Updates all 4 agent surfaces:
   - `.opencode/agent/*.md` (OpenCode agent files)
   - `opencode.json` (OpenCode configuration)
   - `.claude-plugin/agents/*.md` (Claude Code plugin agents)
   - `.claude/agents/*.md` (Claude Code native agents)
4. Maps Ollama models to Claude aliases where needed

---

## Verify Setup

### Check Agent Surface Consistency

```bash
./scripts/lint-agents.sh
```

This validates that all 4 surfaces have matching model assignments.

### Check Harness Health

```bash
bun run harness-status
```

Expected output:

```
✓ PostgreSQL connected
✓ Graph tables available
✓ MCP server running
✓ Harness HTTP service on port 7654
```

### Test Agent Invocation

```bash
# Test Scout (recon agent)
bun run scout -- "Find all TypeScript files in src/"

# Test Brooks (architect)
bun run brooks -- "What is the project structure?"
```

### Verify Allura Brain (Optional)

If using Allura Brain memory:

```bash
# Start memory services
docker compose up -d

# Check service health
bun run brain-health

# Query memory
bun run brain-query -- "What was decided about the API schema?"
```

---

## Install as Plugin (OpenCode Marketplace)

Team RAM is available as a plugin in the OpenCode ecosystem.

### From Marketplace

1. **Open OpenCode**

2. **Navigate to Plugins**:

   ```
   Settings → Plugins → Browse
   ```

3. **Search for "Team RAM"**

4. **Click Install**

5. **Activate the Plugin**:

   ```
   Settings → Plugins → Installed → Team RAM → Enable
   ```

### Manual Plugin Installation

```bash
# Clone to plugins directory
git clone https://github.com/Charitablebusinessronin/team_durham.git \
  ~/.config/opencode/plugins/team-ram

# Install dependencies
cd ~/.config/opencode/plugins/team-ram
bun install

# Apply preset
./scripts/apply-preset.sh
```

### Verify Plugin Installation

```bash
# List available agents
opencode agents list

# Should show all 11 Team RAM specialists
```

---

## Install for Claude Code

Team RAM supports dual-runtime: OpenCode and Claude Code.

### Option 1: Plugin Installation (Recommended)

```bash
# Install as Claude Code plugin
mkdir -p ~/.claude/plugins
git clone https://github.com/Charitablebusinessronin/team_durham.git \
  ~/.claude/plugins/team-ram

# Apply anthropic preset (Claude Code native)
cd ~/.claude/plugins/team-ram
./scripts/apply-preset.sh anthropic
```

### Option 2: Manual Agent Files

Copy agent definitions to your project:

```bash
# Copy agent files
cp -r .claude/agents/ /path/to/your/project/.claude/agents/

# Copy skills
cp -r .claude/skills/ /path/to/your/project/.claude/skills/
```

### Configure Claude Code

Create or update `~/.claude/settings.json`:

```json
{
  "agents": {
    "brooks": {
      "model": "claude-opus-4-6",
      "fallback_model": "claude-sonnet-4"
    },
    "woz": {
      "model": "claude-sonnet-4",
      "fallback_model": "claude-haiku-4-5"
    }
  }
}
```

Or use the preset script which handles this automatically:

```bash
./scripts/apply-preset.sh anthropic
```

---

## Troubleshooting

### Ollama Models Not Found

**Symptom**: `ollama pull` fails with "model not found"

**Solution**:

```bash
# Check Ollama is running
ollama serve

# Try pulling without tag
ollama pull glm-5.1

# Or use alternative model
./scripts/apply-preset.sh openai
```

### Preset Script Fails

**Symptom**: `./scripts/apply-preset.sh` returns error

**Solutions**:

```bash
# Make script executable
chmod +x scripts/apply-preset.sh

# Check preset file exists
ls -la .opencode/team-ram-presets.jsonc

# Run with verbose output
bash -x scripts/apply-preset.sh

# Check Python is available (script uses Python for JSON parsing)
python3 --version
```

### Agent Surface Drift

**Symptom**: `./scripts/lint-agents.sh` reports inconsistencies

**Solution**:

```bash
# Re-apply preset to sync all surfaces
./scripts/apply-preset.sh ollama

# Verify
./scripts/lint-agents.sh
```

### Allura Brain Connection Failed

**Symptom**: `bun run brain-health` shows PostgreSQL or graph tables disconnected

**Solutions**:

```bash
# Check Docker services
docker compose ps

# Restart services
docker compose down
docker compose up -d

# Check .env configuration
cat .env | grep POSTGRES

# Test PostgreSQL connection
psql -h localhost -U ronin4life -d memory

# Verify graph tables exist in PostgreSQL
psql -h localhost -U ronin4life -d memory -c "\dt graph_*"
```

### API Key Errors

**Symptom**: 401 Unauthorized when using OpenAI/Anthropic presets

**Solutions**:

```bash
# Verify key is set
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Test key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Regenerate key if compromised
# Visit provider console and create new key
```

### Permission Denied on Scripts

**Symptom**: `Permission denied` when running scripts

**Solution**:

```bash
# Make all scripts executable
chmod +x scripts/*.sh
```

### Model Fallback Not Working

**Symptom**: Agent fails instead of falling back to secondary model

**Solution**:

```bash
# Check fallback_model is set in agent config
cat .opencode/agent/brooks.md | grep fallback_model

# Re-apply preset to ensure fallback chains are configured
./scripts/apply-preset.sh ollama
```

---

## Next Steps

- [Configuration Guide](configuration.md) — Full config reference
- [Agent Roster](agents.md) — Meet all 11 specialists
- [Presets Guide](presets.md) — When to use each preset
- [Quick Reference](quick-reference.md) — Commands and workflows

---

*For additional help: `./scripts/apply-preset.sh --help` or check `.opencode/team-ram-presets.jsonc`*
