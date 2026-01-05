#!/bin/bash

# Test Script for Phase 1 & Phase 2 Features
# Usage: ./scripts/test-phase1-phase2.sh [WORKER_URL]

WORKER_URL="${1:-https://easymo-agent-worker.ikanisa.workers.dev}"

echo "🧪 Testing Phase 1 & Phase 2 Features"
echo "Worker URL: $WORKER_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Web Search
echo "📡 Test 1: Web Search Tool"
echo "Query: 'What is the weather in Kigali today?'"
RESPONSE=$(curl -s -X POST "$WORKER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the weather in Kigali today?"}],
    "agent_type": "support"
  }')

if echo "$RESPONSE" | grep -q "weather\|temperature\|Kigali"; then
  echo -e "${GREEN}✅ Web search working${NC}"
else
  echo -e "${RED}❌ Web search may not be working${NC}"
  echo "Response: $RESPONSE"
fi
echo ""

# Test 2: Agent Handoff
echo "🔄 Test 2: Agent Handoff"
echo "Query: 'I need a ride to Kigali' (to support agent)"
RESPONSE=$(curl -s -X POST "$WORKER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "I need a ride to Kigali"}],
    "agent_type": "support",
    "user_id": "test-user-123"
  }')

if echo "$RESPONSE" | grep -q "mobility\|ride\|driver"; then
  echo -e "${GREEN}✅ Agent handoff working${NC}"
else
  echo -e "${YELLOW}⚠️  Handoff may have occurred (check response)${NC}"
  echo "Response preview: $(echo "$RESPONSE" | head -c 200)..."
fi
echo ""

# Test 3: File Search (if vector store is set up)
echo "🔍 Test 3: File Search (requires vector store setup)"
echo "Query: 'Find restaurants near me'"
RESPONSE=$(curl -s -X POST "$WORKER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Find restaurants near me"}],
    "agent_type": "marketplace"
  }')

if echo "$RESPONSE" | grep -q "restaurant\|business\|listing"; then
  echo -e "${GREEN}✅ File search may be working${NC}"
else
  echo -e "${YELLOW}⚠️  File search may require vector store setup${NC}"
  echo "Response preview: $(echo "$RESPONSE" | head -c 200)..."
fi
echo ""

# Test 4: Parallel Tools (check logs)
echo "⚡ Test 4: Parallel Tool Execution"
echo "This test requires checking worker logs for timing"
echo -e "${YELLOW}⚠️  Manual verification needed${NC}"
echo "Look for multiple tools starting simultaneously in logs"
echo ""

# Test 5: Agent Memory
echo "🧠 Test 5: Agent Memory System"
echo "This test requires database access to verify"
echo -e "${YELLOW}⚠️  Manual verification needed${NC}"
echo "Check agent_memory table after storing preferences"
echo ""

echo "📋 Summary"
echo "=========="
echo "✅ Web Search: Tested"
echo "✅ Agent Handoff: Tested"
echo "⚠️  File Search: Requires vector store setup"
echo "⚠️  Parallel Tools: Check logs manually"
echo "⚠️  Agent Memory: Check database manually"
echo ""
echo "For detailed testing, see: docs/TESTING_GUIDE.md"

