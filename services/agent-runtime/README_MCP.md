# MCP Server for ChatGPT Apps SDK

MCP (Model Context Protocol) server that exposes easyMO tools to ChatGPT.

## Endpoints

### GET /mcp/capabilities
Returns MCP server capabilities and protocol version.

### GET /mcp/tools
Returns list of available tools with schemas and annotations.

### POST /mcp/tools/call
Executes a tool call.

**Headers:**
- `X-User-ID`: User UUID (optional)
- `X-User-Location`: JSON stringified location `{"lat": -1.9441, "lng": 30.0619}` (optional)

**Body:**
```json
{
  "name": "set_presence",
  "arguments": {
    "user_id": "uuid",
    "role": "driver",
    "lat": -1.9441,
    "lng": 30.0619,
    "is_online": true
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\": true, \"tool_name\": \"set_presence\", ...}"
    }
  ]
}
```

## Local Development

```bash
npm run dev
# Server runs on http://localhost:8787
```

## Testing

```bash
# Test capabilities
curl http://localhost:8787/mcp/capabilities

# Test tools list
curl http://localhost:8787/mcp/tools

# Test tool call
curl -X POST http://localhost:8787/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user-id" \
  -d '{
    "name": "set_presence",
    "arguments": {
      "user_id": "test-user-id",
      "role": "driver",
      "lat": -1.9441,
      "lng": 30.0619,
      "is_online": true
    }
  }'
```

## Deployment

```bash
npm run deploy
```

## Tool Annotations

Tools include safe annotations for ChatGPT:
- `requiresLocation`: Whether tool requires location data
- `requiresAuth`: Whether tool requires authentication
- `category`: Tool category (mobility, marketplace, payments, geo)

