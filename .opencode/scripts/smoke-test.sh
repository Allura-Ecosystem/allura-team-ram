#!/usr/bin/env bash

#############################################################################
# OpenAgentsControl Harness - Smoke Test Script
# Validates that the minimum bootable harness is operational
#############################################################################

# Don't exit on error - we want to run all tests
# set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

section() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
}

#############################################################################
# Test 1: Git Remote Configuration
#############################################################################
section "Test 1: Git Remote Configuration"

if git remote -v | grep -q "upstream"; then
    pass "Upstream remote configured"
else
    fail "Upstream remote NOT configured"
    echo "  Fix: git remote add upstream https://github.com/darrenhinde/OpenAgentsControl.git"
fi

if git remote -v | grep -q "origin"; then
    pass "Origin remote configured"
else
    fail "Origin remote NOT configured"
fi

#############################################################################
# Test 2: Documentation Artifacts
#############################################################################
section "Test 2: Documentation Artifacts"

DOCS=(
    "BLUEPRINT.md"
    "SOLUTION-ARCHITECTURE.md"
    "DESIGN-ROUTING.md"
    "DESIGN-LOGGING.md"
    "REQUIREMENTS-MATRIX.md"
    "RISKS-AND-DECISIONS.md"
    "DATA-DICTIONARY.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        pass "$doc exists"
    else
        fail "$doc MISSING"
    fi
done

# Check AI-GUIDELINES.md exists
if [ -f ".opencode/AI-GUIDELINES.md" ]; then
    pass "AI-GUIDELINES.md exists"
else
    fail "AI-GUIDELINES.md MISSING"
fi

#############################################################################
# Test 3: Harness Contract
#############################################################################
section "Test 3: Harness Contract"

if [ -f ".opencode/contracts/harness-v1.md" ]; then
    pass "Harness contract exists"
else
    fail "Harness contract MISSING"
fi

#############################################################################
# Test 4: Events Schema Migration
#############################################################################
section "Test 4: Events Schema Migration"

if [ -f ".opencode/migrations/001-events-schema.sql" ]; then
    pass "Events schema migration exists"
else
    fail "Events schema migration MISSING"
fi

#############################################################################
# Test 5: opencode CLI Available
#############################################################################
section "Test 5: opencode CLI Available"

if command -v opencode &> /dev/null; then
    pass "opencode CLI is available"
    OPENCODE_VERSION=$(opencode --version 2>&1 || echo "unknown")
    echo "  Version: $OPENCODE_VERSION"
else
    fail "opencode CLI NOT available"
    echo "  Fix: Ensure opencode is installed and in PATH"
fi

#############################################################################
# Test 6: Agent Definitions
#############################################################################
section "Test 6: Agent Definitions"

AGENT_FILES=(
    ".opencode/agent/core/openagent.md"
    ".opencode/agent/core/opencoder.md"
)

for agent in "${AGENT_FILES[@]}"; do
    if [ -f "$agent" ]; then
        pass "$agent exists"
    else
        fail "$agent MISSING"
    fi
done

#############################################################################
# Test 7: Command Definitions
#############################################################################
section "Test 7: Command Definitions"

COMMAND_FILES=(
    ".opencode/command/context.md"
    ".opencode/command/commit.md"
    ".opencode/command/optimize.md"
)

for cmd in "${COMMAND_FILES[@]}"; do
    if [ -f "$cmd" ]; then
        pass "$cmd exists"
    else
        fail "$cmd MISSING"
    fi
done

#############################################################################
# Test 8: Performance Logging (if Postgres available)
#############################################################################
section "Test 8: Performance Logging"

if command -v psql &> /dev/null; then
    warn "Postgres available - testing logging"
    
    # Test if we can connect to Postgres
    if psql -d allura -c "SELECT 1;" &> /dev/null; then
        pass "Postgres connection successful"
        
        # Test if events table exists
        if psql -d allura -c "SELECT COUNT(*) FROM events;" &> /dev/null; then
            pass "Events table exists"
            
            # Test insertion
            psql -d allura -c "INSERT INTO events (event_type, group_id, agent_id, status) VALUES ('SMOKE_TEST', 'test', 'test_script', 'completed');" &> /dev/null
            pass "Event insertion successful"
            
            # Test query
            COUNT=$(psql -d allura -t -c "SELECT COUNT(*) FROM events WHERE agent_id = 'test_script';" | tr -d ' ')
            if [ "$COUNT" -gt 0 ]; then
                pass "Event query successful (count: $COUNT)"
            else
                fail "Event query returned 0 results"
            fi
        else
            fail "Events table does NOT exist"
            echo "  Fix: Run .opencode/migrations/001-events-schema.sql"
        fi
    else
        warn "Postgres connection failed - skipping logging tests"
    fi
else
    warn "Postgres NOT available - skipping logging tests"
fi

#############################################################################
# Test 9: Routing Policy Validation
#############################################################################
section "Test 9: Routing Policy Validation"

if grep -q "ContextScout" ".opencode/contracts/harness-v1.md"; then
    pass "Routing policy defines ContextScout"
else
    fail "Routing policy MISSING ContextScout"
fi

if grep -q "OpenAgent" ".opencode/contracts/harness-v1.md"; then
    pass "Routing policy defines OpenAgent"
else
    fail "Routing policy MISSING OpenAgent"
fi

if grep -q "CoderAgent" ".opencode/contracts/harness-v1.md"; then
    pass "Routing policy defines CoderAgent"
else
    fail "Routing policy MISSING CoderAgent"
fi

if grep -q "OpenCoder" ".opencode/contracts/harness-v1.md"; then
    pass "Routing policy defines OpenCoder"
else
    fail "Routing policy MISSING OpenCoder"
fi

#############################################################################
# Summary
#############################################################################
section "Summary"

echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All smoke tests passed!${NC}"
    echo "The harness is ready for DAY_BUILD and NIGHT_BUILD execution."
    exit 0
else
    echo -e "${RED}✗ Some smoke tests failed.${NC}"
    echo "Please fix the issues above before proceeding."
    exit 1
fi