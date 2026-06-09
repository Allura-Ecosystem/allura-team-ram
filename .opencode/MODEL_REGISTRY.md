# Agent Model Registry

## Allura Agent-OS — cross-runtime model mapping

Update this file whenever a model is changed in either runtime

This is the authoritative contract between OpenCode and Claude Code agent equivalents

version: "3.0.0"
last_updated: "2026-04-18"

## Routing Philosophy

This registry uses **role-first routing with task-based specialist overrides**:

1. **Role-based base routing** — each agent gets a primary model matched to its role's reasoning needs
2. **Task-based specialist overrides** — code-producing and perf-fixing tasks escalate to the coding specialist
3. **Fallback-only recovery path** — when any primary is unavailable, all agents fall back to glm-5.1

Do not make nano the universal default. The repository is organized around named agents and deterministic routing.

## Primary Assignments

| Agent        | Role           | Primary Model                 | Specialist Override               | Fallback Model          |
| ------------ | -------------- | ----------------------------- | --------------------------------- | ----------------------- |
| brooks       | Orchestrator   | ollama-cloud/gpt-5.4          | —                                 | ollama-cloud/glm-5.1    |
| hightower    | Infra          | ollama-cloud/gpt-5.4          | —                                 | ollama-cloud/glm-5.1    |
| jobs         | Strategy       | ollama-cloud/gpt-5.4          | —                                 | ollama-cloud/glm-5.1    |
| scout        | Search/Triage  | ollama-cloud/nemotron-3-super | gpt-5.4-nano for tiny checks      | ollama-cloud/glm-5.1    |
| woz          | Code           | ollama-cloud/gpt-5.4-mini     | qwen3-coder-next for codegen      | ollama-cloud/glm-5.1    |
| bellard      | Code/Diag      | ollama-cloud/gpt-5.4-mini     | qwen3-coder-next for perf code    | ollama-cloud/glm-5.1    |
| carmack      | Code/Perf      | ollama-cloud/gpt-5.4-mini     | —                                 | ollama-cloud/glm-5.1    |
| knuth        | Code/Data      | ollama-cloud/gpt-5.4-mini     | —                                 | ollama-cloud/glm-5.1    |
| fowler       | Code/Refactor  | ollama-cloud/gpt-5.4-mini     | —                                 | ollama-cloud/glm-5.1    |
| pike         | Code/Interface | ollama-cloud/gpt-5.4-mini     | —                                 | ollama-cloud/glm-5.1    |

## Routing Logic

```yaml
routing:
  - if: agent in [BROOKS_ARCHITECT, JOBS_INTENT_GATE, HIGHTOWER_DEVOPS]
    use: gpt-5.4

  - if: agent == SCOUT_RECON and task in [tiny_lookup, cheap_prefilter, path_check]
    use: gpt-5.4-nano

  - if: agent == SCOUT_RECON
    use: nemotron-3-super:cloud

  - if: agent == WOZ_BUILDER and task in [patch, feature, test_fix, codegen, repo_surgery]
    use: qwen3-coder-next:cloud

  - if: agent == BELLARD_DIAGNOSTICS_PERF and task in [perf_patch, hotpath_fix, benchmark_refactor]
    use: qwen3-coder-next:cloud

  - if: agent in [WOZ_BUILDER, PIKE_INTERFACE_REVIEW, FOWLER_REFACTOR_GATE, BELLARD_DIAGNOSTICS_PERF, CARMACK_PERFORMANCE, KNUTH_DATA_ARCHITECT]
    use: gpt-5.4-mini

  - if: any_primary_unavailable
    use: glm-5.1:cloud
```

## Global Default (opencode.json)

```json
{
  "model": "ollama-cloud/glm-5.1"
}
```

> All agents without an explicit `model:` field inherit this. Fallback activates on credit exhaustion or API error.

## Agent Frontmatter (per .md file)

```yaml
# brooks.md / hightower.md / jobs.md
model: ollama-cloud/gpt-5.4

# scout.md
model: ollama-cloud/nemotron-3-super

# woz.md / bellard.md / carmack.md / knuth.md / fowler.md / pike.md
model: ollama-cloud/gpt-5.4-mini
```

## Model Rationale

| Model                         | Why                                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| ollama-cloud/gpt-5.4          | Highest judgment for orchestration, scope, and infra reasoning      |
| ollama-cloud/gpt-5.4-mini     | Strong mini model for steady coding subagent work                   |
| ollama-cloud/gpt-5.4-nano     | Fastest/cheapest for tiny scout lookups and prefilter checks        |
| ollama-cloud/nemotron-3-super | Fast wide-context scanning for recon and discovery (see note)       |
| ollama-cloud/kimi-k2.5        | Long-context strategy and multimodal product reasoning (reserve)    |
| ollama-cloud/qwen3-coder-next | Coding specialist for patch, codegen, and perf-fix tasks            |
| ollama-cloud/glm-5.1          | Universal fallback — instruction-following, always-on               |

## Benchmark Note

Performance claims for Nemotron-3-Super (e.g., "fastest overall at 1.63s") are **internal benchmark data** from this harness environment, not a generally established property of the model. Validate with your own per-agent evals before locking Nemotron as SCOUT primary.

## Excluded Models

| Model                      | Reason                                                     |
|----------------------------|------------------------------------------------------------|
| gpt-oss:120b-cloud         | Removed per owner decision                                 |
| gemma3:27b-cloud           | Removed per owner decision                                 |
| deepseek-v3.1:671b-cloud   | Removed per owner decision                                 |

## Validation Checklist

Before freezing this routing, run per-agent evals with 10–20 tasks and record:

- Success rate per route candidate
- Latency (p50, p95)
- Token cost
- Retry count

Most likely changes after real evals:

- **SCOUT_RECON** may swap away from Nemotron if discovery accuracy is weaker than speed suggests
- **PIKE/FOWLER** may occasionally need frontier escalation on tricky architectural reviews
