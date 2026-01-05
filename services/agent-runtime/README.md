# Agent Runtime Service

OpenAI Agents SDK orchestration service running on Cloudflare Workers.

## Features

- Streaming endpoint `/api/chat` (SSE)
- Tool invocation framework
- Logging + trace IDs
- Rate limiting
- Error handling

## Development

```bash
npm run dev
```

## Deployment

```bash
npm run deploy
```

## API

### POST `/api/chat`

Chat endpoint with streaming support.

**Request:**
```json
{
  "messages": [{"role": "user", "content": "I need a ride"}],
  "agent_type": "router",
  "stream": true
}
```

**Response (streaming):**
```
data: {"type":"start","agent_type":"mobility"}
data: {"type":"token","content":"I"}
...
data: {"type":"done"}
```

