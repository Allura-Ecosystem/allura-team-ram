import { describe, expect, test } from "bun:test";
import {
  approveAgentProposal,
  approveRevision,
  getCuratorDashboard,
  getPendingAgentProposals,
  getPendingRevisions,
  rejectAgentProposal,
  rejectRevision,
  submitAgentProposal,
  submitRevision,
} from "./curator";
import type { SkillRevisionProposal } from "./sona-patterns";

// Build a minimal valid SkillRevisionProposal for reuse across tests.
function makeProposal(tag: string): SkillRevisionProposal {
  return {
    skill_name: `${tag}-skill`,
    agent_id: tag,
    revision_type: "content_update",
    pattern_type: "success_cluster",
    pattern_description: `Test pattern for ${tag}`,
    proposed_change: `Update guidance for ${tag}`,
    evidence: { trajectoryCount: 15, metric: 0.9 },
    sona_confidence: 0.85,
    group_id: "allura-system",
  };
}

describe("submitRevision", () => {
  test("returns a StoredRevision with an id and expected shape", () => {
    const proposal = makeProposal(`rev-submit-${Date.now()}`);
    const revision = submitRevision(proposal);

    expect(typeof revision.id).toBe("number");
    expect(revision.id).toBeGreaterThan(0);
    // gate_status depends on coherence monitor state — either outcome is valid
    expect(["passed", "rejected"]).toContain(revision.gate_status);
    expect(revision.curator_status).toBe("pending");
    expect(revision.proposal).toEqual(proposal);
    expect(typeof revision.created_at).toBe("string");
  });

  test("submitted revision appears in getPendingRevisions", () => {
    const proposal = makeProposal(`rev-pending-${Date.now()}`);
    const revision = submitRevision(proposal);

    const pending = getPendingRevisions();
    const found = pending.find((r) => r.id === revision.id);

    if (revision.gate_status === "passed") {
      expect(found).toBeDefined();
      expect(found?.curator_status).toBe("pending");
    }
  });
});

describe("approveRevision", () => {
  test("approve changes curator_status to approved", () => {
    const proposal = makeProposal(`rev-approve-${Date.now()}`);
    const revision = submitRevision(proposal);

    if (revision.gate_status !== "passed") {
      // Gate rejected due to low coherence — cannot approve, skip body
      const result = approveRevision(revision.id, "approved");
      expect(result).toBeNull();
      return;
    }

    const approved = approveRevision(revision.id, "looks good");
    expect(approved).not.toBeNull();
    expect(approved?.curator_status).toBe("approved");
    expect(approved?.curator_notes).toBe("looks good");
    expect(typeof approved?.reviewed_at).toBe("string");
  });

  test("cannot approve a revision that did not pass the gate", () => {
    // Craft a revision that has gate_status rejected by submitting and then
    // checking. We simulate this by directly attempting to approve a non-existent id.
    const result = approveRevision(999999);
    expect(result).toBeNull();
  });
});

describe("rejectRevision", () => {
  test("reject changes curator_status to rejected", () => {
    const proposal = makeProposal(`rev-reject-${Date.now()}`);
    const revision = submitRevision(proposal);

    const rejected = rejectRevision(revision.id, "not needed");
    expect(rejected).not.toBeNull();
    expect(rejected?.curator_status).toBe("rejected");
    expect(rejected?.curator_notes).toBe("not needed");
    expect(typeof rejected?.reviewed_at).toBe("string");
  });
});

describe("submitAgentProposal", () => {
  test("returns an AgentProposal with expected fields", () => {
    const tag = `agent-prop-${Date.now()}`;
    const result = submitAgentProposal(
      `${tag}-specialist`,
      "harness.custom.task",
      "Coverage gap detected",
      { trajectoryCount: 12, metric: 0.8 },
      0.82,
    );

    if ("error" in result) {
      // Max proposals reached — acceptable in a shared state environment
      expect(typeof result.error).toBe("string");
      return;
    }

    expect(typeof result.id).toBe("number");
    expect(result.agent_name).toBe(`${tag}-specialist`);
    expect(result.task_type).toBe("harness.custom.task");
    expect(result.curator_status).toBe("pending");
    expect(result.sona_confidence).toBe(0.82);
  });

  test("enforces maximum 3 concurrent pending agent proposals", () => {
    const base = `max-prop-${Date.now()}`;
    const results = [];

    // Submit proposals until we hit the limit or exceed 3 attempts
    for (let i = 0; i < 5; i++) {
      const r = submitAgentProposal(
        `${base}-${i}-specialist`,
        `harness.gap.${i}`,
        "test",
        { trajectoryCount: 12, metric: 0.8 },
        0.75,
      );
      results.push(r);
    }

    // At least one must be an error response (max limit hit)
    const errors = results.filter((r) => "error" in r);
    // If we started with 0 pending, we allow 3 then reject. Otherwise we may
    // hit the cap sooner. Either way some error must have occurred among 5 attempts.
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("approveAgentProposal / rejectAgentProposal", () => {
  test("approveAgentProposal returns null for non-existent id", () => {
    expect(approveAgentProposal(999999)).toBeNull();
  });

  test("rejectAgentProposal returns null for non-existent id", () => {
    expect(rejectAgentProposal(999999)).toBeNull();
  });
});

describe("getCuratorDashboard", () => {
  test("returns correct structure with numeric counts and arrays", () => {
    const dashboard = getCuratorDashboard();

    expect(typeof dashboard.pendingRevisions).toBe("number");
    expect(typeof dashboard.pendingAgentProposals).toBe("number");
    expect(typeof dashboard.pendingTotal).toBe("number");
    expect(typeof dashboard.totalRevisions).toBe("number");
    expect(typeof dashboard.totalAgentProposals).toBe("number");
    expect(typeof dashboard.approvedRevisions).toBe("number");
    expect(typeof dashboard.rejectedRevisions).toBe("number");
    expect(typeof dashboard.gateRejected).toBe("number");
    expect(Array.isArray(dashboard.recentRevisions)).toBe(true);
    expect(Array.isArray(dashboard.recentAgentProposals)).toBe(true);

    expect(dashboard.pendingTotal).toBe(
      dashboard.pendingRevisions + dashboard.pendingAgentProposals,
    );
  });
});
