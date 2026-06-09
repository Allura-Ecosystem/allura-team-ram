-- Phase B: Skill Revision Queue
-- Append-only table for SONA pattern-driven skill revision proposals
-- AD-06, AD-07: SONA learning engine + HITL firewall

CREATE TABLE IF NOT EXISTS skill_revisions (
  id              BIGSERIAL PRIMARY KEY,
  skill_name      TEXT NOT NULL,
  agent_id        TEXT NOT NULL,
  revision_type   TEXT NOT NULL CHECK (revision_type IN (
    'content_update', 'new_section', 'remove_section', 'reorder'
  )),
  pattern_type    TEXT NOT NULL CHECK (pattern_type IN (
    'repeated_failure', 'success_cluster', 'duration_outlier', 'coverage_gap'
  )),
  pattern_description TEXT NOT NULL,
  current_content TEXT,
  proposed_change TEXT NOT NULL,
  evidence        JSONB NOT NULL DEFAULT '{}',
  sona_confidence REAL NOT NULL CHECK (sona_confidence >= 0 AND sona_confidence <= 1),
  gate_status     TEXT NOT NULL DEFAULT 'pending' CHECK (gate_status IN (
    'pending', 'passed', 'rejected'
  )),
  curator_status  TEXT NOT NULL DEFAULT 'pending' CHECK (curator_status IN (
    'pending', 'approved', 'rejected'
  )),
  group_id        TEXT NOT NULL DEFAULT 'allura-system' CHECK (group_id ~ '^allura-[a-z0-9-]+$'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for curator queue (pending proposals that passed the gate)
CREATE INDEX IF NOT EXISTS idx_skill_revisions_curator_queue
  ON skill_revisions (curator_status, gate_status)
  WHERE curator_status = 'pending' AND gate_status = 'passed';

-- Index for pattern lookup by agent
CREATE INDEX IF NOT EXISTS idx_skill_revisions_agent
  ON skill_revisions (agent_id, created_at DESC);

-- Append-only: prevent UPDATE and DELETE via trigger
CREATE OR REPLACE FUNCTION prevent_skill_revision_mutation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow status updates only (gate_status, curator_status)
  IF TG_OP = 'UPDATE' THEN
    IF NEW.skill_name != OLD.skill_name
       OR NEW.agent_id != OLD.agent_id
       OR NEW.revision_type != OLD.revision_type
       OR NEW.proposed_change != OLD.proposed_change
       OR NEW.evidence != OLD.evidence
       OR NEW.sona_confidence != OLD.sona_confidence
       OR NEW.group_id != OLD.group_id
    THEN
      RAISE EXCEPTION 'skill_revisions is append-only — only gate_status and curator_status may be updated';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'skill_revisions is append-only — DELETE is forbidden';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_skill_revision_immutability ON skill_revisions;
CREATE TRIGGER enforce_skill_revision_immutability
  BEFORE UPDATE OR DELETE ON skill_revisions
  FOR EACH ROW EXECUTE FUNCTION prevent_skill_revision_mutation();
