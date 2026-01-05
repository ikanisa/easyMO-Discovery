#!/bin/bash
# Local development script for ChatGPT App (MCP + UI)

set -e

echo "🚀 Starting easyMO ChatGPT App Development Mode"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from project root"
  exit 1
fi

# Start MCP server in background
echo "📡 Starting MCP server..."
cd services/agent-runtime
npm run dev &
MCP_PID=$!
cd ../..

# Wait for MCP server to start
sleep 3

# Start ChatGPT UI in background
echo "🎨 Starting ChatGPT UI..."
cd apps/chatgpt-ui
npm install 2>/dev/null || true
npm run dev &
UI_PID=$!
cd ../..

echo ""
echo "✅ Development servers started!"
echo ""
echo "📍 MCP Server: http://localhost:8787"
echo "   - Capabilities: http://localhost:8787/mcp/capabilities"
echo "   - Tools: http://localhost:8787/mcp/tools"
echo ""
echo "🎨 ChatGPT UI: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user interrupt
trap "kill $MCP_PID $UI_PID 2>/dev/null; exit" INT TERM
wait

