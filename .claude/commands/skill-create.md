# /skill-create

Create, improve, or evaluate an OpenCode skill using the iterative skill-creator workflow.

## Usage

```bash
/skill-create <skill-name>              # Create a new skill from scratch
/skill-create <skill-name> --improve    # Improve an existing skill
/skill-create <skill-name> --eval      # Run evals on an existing skill
/skill-create <skill-name> --optimize  # Optimize skill description for triggering
```

## Examples

```bash
/skill-create pdf-extractor              # New skill: extract data from PDFs
/skill-create code-review --improve     # Improve the existing code-review skill
/skill-create mcp-builder --eval        # Run evals on mcp-builder skill
/skill-create memory-client --optimize  # Optimize description triggering
```

## How It Works

1. Routes to `@Brooks` (architect) for skill design and coordination
2. Brooks delegates implementation to `@Woz` (builder) via subagents
3. Follows the iterative skill-creator workflow:
   - **Capture Intent** → What should the skill do? When should it trigger?
   - **Interview & Research** → Edge cases, formats, success criteria
   - **Draft SKILL.md** → Write the skill with proper frontmatter
   - **Test** → Run test prompts with-skill and without-skill (baseline)
   - **Grade** → Evaluate assertions against outputs
   - **Review** → Launch eval-viewer for human feedback
   - **Improve** → Rewrite based on feedback, repeat
   - **Optimize** → Improve description for better triggering accuracy
4. Logs `SKILL_CREATED` or `SKILL_IMPROVED` event to PostgreSQL
5. Packages final skill as `.skill` file if requested

## Workflow Flags

| Flag         | Phase              | What Happens                                    |
| ------------ | ------------------ | ----------------------------------------------- |
| (none)       | Full creation      | Draft → Test → Review → Improve → Package        |
| `--improve`  | Improvement only   | Load existing → Test → Review → Rewrite         |
| `--eval`     | Evaluation only    | Run test cases → Grade → Show benchmark          |
| `--optimize` | Description only   | Generate trigger evals → Run optimization loop   |

## Skill-Creator Toolkit

| Resource                          | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| `scripts/init_skill.py`           | Scaffold a new skill from template         |
| `scripts/quick_validate.py`       | Validate SKILL.md frontmatter              |
| `scripts/package_skill.py`        | Package skill into .skill file             |
| `scripts/run_eval.py`             | Test skill triggering accuracy             |
| `scripts/run_loop.py`             | Description optimization loop              |
| `scripts/aggregate_benchmark.py`  | Aggregate grading into benchmark stats     |
| `scripts/improve_description.py`  | AI-powered description improvement         |
| `eval-viewer/generate_review.py`  | Launch HTML review interface               |
| `agents/grader.md`                | Subagent: evaluate assertions              |
| `agents/comparator.md`            | Subagent: blind A/B comparison             |
| `agents/analyzer.md`              | Subagent: benchmark analysis               |
| `references/schemas.md`           | JSON schemas for evals, grading, benchmark |
| `assets/eval_review.html`         | Eval set review template                   |

## Result

```json
{
  "event": "SKILL_CREATED",
  "skill_name": "pdf-extractor",
  "executor": "brooks-architect",
  "path": ".opencode/skills/pdf-extractor/SKILL.md",
  "phases_completed": ["draft", "test", "review", "improve", "optimize"],
  "benchmark": {
    "pass_rate": 0.85,
    "delta_vs_baseline": "+0.50"
  }
}
```

## Integration

- **Propose first:** `/skill-propose skill-creator` to see routing
- **Load after:** `/skill-load skill-creator` to execute
- **Quick access:** `/create <name>` (alias)

**Note:** Skill creation is an architect-level task. Brooks owns the design; Woz implements. The eval-viewer ensures human review before promotion.
