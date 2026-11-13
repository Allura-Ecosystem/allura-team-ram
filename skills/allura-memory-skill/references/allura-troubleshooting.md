# Governed memory troubleshooting

| Symptom | Evidence-led action |
| --- | --- |
| Tool absent | Inspect host inventory; report the missing capability |
| Actor or tenant mismatch | Stop; verify authorized scope and transport identity, never guess |
| Search fails | Report retrieval unavailable; subsystem health remains unverified |
| Stale or missing result | Compare semantic and episodic freshness with scoped evidence |
| Promotion unavailable | Keep episodic outcome; require supported curator capability and human approval |

Current storage is PostgreSQL/RuVector. No direct database queries, container
commands, database passwords, endpoint substitutions, or retired-service probes
are part of this client workflow. Escalate deployment repairs to the authorized
operator with sanitized evidence. Do not expose credentials or internal addresses.
