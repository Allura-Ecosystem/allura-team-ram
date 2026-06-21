---
name: opencode-verify
description: >
  Systematic pre-flight check for OpenCode startup failures. **Never claim OpenCode is "fixed" without running this checklist.**
---

# OpenCode Startup Verification Skill

## Overview

Systematic pre-flight check for OpenCode startup failures. **Never claim OpenCode is "fixed" without running this checklist.**

## When to Use

- After editing `opencode.json`
- After moving/renaming agent files
- After adding new agents or models
- After Ollama/Docker/MCP changes
- Before telling a user "it's working"

## The Iron Rule

```
NO "IT'S WORKING" WITHOUT PASSING ALL CHECKS
```

## Verification Checklist

### Check 1: JSON Syntax Validation

```bash
python3 -c "import json; json.load(open('opencode.json')); print('✅ JSON valid')"
```

**Fail if:** Invalid JSON, trailing commas, malformed brackets.

### Check 2: Schema Key Validation

```bash
opencode debug config 2>&1 | head -20
```

**Fail if:** "Unrecognized key" errors. Common culprits:
- `plugins` → should be `plugin`
- `mcp_servers` → should be `mcp`
- `agents` → should be `agent`

### Check 3: Agent Path Resolution

```bash
# Extract all agent paths from opencode.json and verify they exist
python3 -c "
import json, os, sys
d = json.load(open('opencode.json'))
errors = []
for name, agent in d.get('agent', {}).items():
    path = agent.get('path', '')
    if path and not os.path.exists(path):
        errors.append(f'  ❌ {name}: {path}')
    elif path:
        print(f'  ✅ {name}: {path}')
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print('✅ All agent paths resolve')
"
```

**Fail if:** Any agent path does not exist on disk.

### Check 4: Global Config Agent Paths (if applicable)

```bash
# Check if global config references agents that don't exist
python3 -c "
import json, os, sys, re
config_path = os.path.expanduser('~/.config/opencode/opencode.json')
if not os.path.exists(config_path):
    print('ℹ️ No global config')
    sys.exit(0)
d = json.load(open(config_path))
errors = []
for name, agent in d.get('agent', {}).items():
    prompt = agent.get('prompt', '')
    match = re.search(r'\{file:([^}]+)\}', prompt)
    if match:
        path = match.group(1)
        if not os.path.exists(path):
            errors.append(f'  ❌ {name}: {path}')
        else:
            print(f'  ✅ {name}: {path}')
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print('✅ Global config agent paths resolve')
"
```

**Fail if:** Global config references non-existent agent files.

### Check 5: Ollama Provider Connectivity

```bash
curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1 && echo "✅ Ollama reachable" || echo "❌ Ollama not reachable at :11434"
```

**Fail if:** Ollama is not running or not on expected port.

### Check 6: Model Availability

```bash
# Check if default model exists in Ollama
python3 -c "
import json, subprocess, sys
d = json.load(open('opencode.json'))
default_model = d.get('model', '')
if not default_model:
    print('ℹ️ No default model configured')
    sys.exit(0)
model_name = default_model.split('/')[-1] if '/' in default_model else default_model
result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
if model_name in result.stdout:
    print(f'✅ Default model {model_name} available')
else:
    print(f'❌ Default model {model_name} NOT in ollama list')
    sys.exit(1)
"
```

**Fail if:** Default model not pulled in Ollama.

### Check 7: MCP Server Health (if configured)

```bash
# Check each MCP server
python3 -c "
import json, urllib.request, sys
d = json.load(open('opencode.json'))
mcp = d.get('mcp', {})
for name, cfg in mcp.items():
    if cfg.get('type') == 'remote' and cfg.get('enabled', False):
        url = cfg.get('url', '')
        try:
            req = urllib.request.Request(url, method='GET')
            resp = urllib.request.urlopen(req, timeout=5)
            print(f'✅ MCP {name}: {url} reachable')
        except Exception as e:
            print(f'⚠️ MCP {name}: {url} - {e}')
"
```

**Warn (don't fail):** MCP servers may be optional.

### Check 8: Docker Container Health (if applicable)

```bash
# Check if relevant Docker containers are healthy
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(opencode|ollama|allura)" || echo "ℹ️ No relevant Docker containers"
```

**Warn (don't fail):** Docker may not be used.

### Check 9: Agent List Load Test

```bash
opencode agent list > /dev/null 2>&1 && echo "✅ Agents load" || echo "❌ Agent list failed"
```

**Fail if:** Agent list command errors. This is the **critical integration test**.

### Check 10: Full Startup Test (Final)

```bash
# Run opencode for 3 seconds then exit
script -q -c "timeout 3 opencode 2>&1" /dev/null 2>&1 | cat | grep -i "error\|fail" || echo "✅ No startup errors detected"
```

**Fail if:** Any "Error:" or "fail" in startup output.

## Decision Matrix

| Check | Severity | Action on Fail |
|-------|----------|----------------|
| JSON Syntax | 🔴 Critical | Fix syntax errors immediately |
| Schema Keys | 🔴 Critical | Rename keys to match schema |
| Agent Paths | 🔴 Critical | Update paths or create missing files |
| Global Config | 🔴 Critical | Fix `~/.config/opencode/opencode.json` |
| Ollama Reachable | 🔴 Critical | Start Ollama service |
| Model Available | 🔴 Critical | `ollama pull <model>` |
| MCP Health | 🟡 Warning | Start MCP server or disable in config |
| Docker Health | 🟡 Warning | Start containers if needed |
| Agent List | 🔴 Critical | Fix config until this passes |
| Full Startup | 🔴 Critical | Debug with `opencode --log-level DEBUG` |

## Red Flags — STOP and Investigate

If you catch yourself:
- "`opencode --version` works so it's fine" → **NO.** Version doesn't load agents.
- "The JSON looks valid" → **NOT ENOUGH.** Run `opencode agent list`.
- "It worked before" → **IRRELEVANT.** Check what changed.
- "Probably just a small thing" → **VERIFY FIRST.**

## Quick Command

Run all checks at once:

```bash
opencode-verify
```

(If this skill is installed as a CLI command)

## Logging

After verification (pass or fail), log to Allura memory:

```
allura-memory/memory_add:
  group_id: "allura-system"
  user_id: "bellard"
  content: "opencode-verify: {pass/fail}; checks={N}/{M}; issues={...}"
  metadata: { source: "verification", component: "opencode" }
```

## Reflection Protocol

After running this skill:

```
📝 Reflection
├─ Action Taken: opencode startup verification
├─ Checks Passed: {N}/{M}
├─ Issues Found: {list or "none"}
├─ Event Logged: opencode-verify result
└─ Confidence: {High (all pass) / Low (any fail)}
```

**If any 🔴 Critical check fails:** Do NOT tell the user "it's working." Report the specific failure and required fix.
