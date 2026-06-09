-- Migration: 001-events-schema.sql
-- Description: Create events table for performance logging with doc compliance support
-- Author: BROOKS_ARCHITECT
-- Date: 2026-04-10

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  group_id VARCHAR(100) NOT NULL,
  agent_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_agent_id ON events(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Insert test event to verify logging works
INSERT INTO events (event_type, group_id, agent_id, status, metadata)
VALUES ('TEST_LOG', 'test', 'woz_builder', 'completed', '{"test": true}');

-- Insert doc compliance test event
INSERT INTO events (event_type, group_id, agent_id, status, metadata)
VALUES (
  'DOC_COMPLIANCE_CHECK',
  'test',
  'woz_builder',
  'success',
  '{
    "guidelines_loaded": true,
    "required_artifacts_present": true,
    "missing_artifacts": [],
    "traceability_updated": true,
    "adr_written_if_needed": true
  }'
);

-- Verify insertion
SELECT COUNT(*) FROM events WHERE agent_id = 'woz_builder';

-- Expected: > 0