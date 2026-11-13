# Current memory model

PostgreSQL stores append-only episodic and audit events. PostgreSQL/RuVector
provide semantic, graph, and vector storage. Semantic history is immutable;
approved new versions preserve `SUPERSEDES` lineage rather than editing history.

All access uses supported governed memory interfaces with an authorized
`group_id` and transport-derived principal. Human approval is required for
canonical promotion. No direct database bypass or retired-backend fallback.
