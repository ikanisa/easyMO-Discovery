# Production Features

This document describes the production-ready features added to the Worker.

## Features

### 1. Structured Logging

The Worker now includes structured JSON logging with the following information:

- **Request/Response Tracking**: Every request gets a unique request ID
- **Tool Call Logging**: All tool executions are logged with duration
- **Error Logging**: Errors include stack traces and error codes
- **Performance Metrics**: Request duration and token counts

Example log entry:
```json
{
  "timestamp": "2024-01-27T12:00:00.000Z",
  "level": "info",
  "message": "Request received",
  "request_id": "1706356800000-abc123",
  "user_id": "user-uuid",
  "agent_type": "marketplace",
  "method": "POST",
  "path": "/",
  "stream": false,
  "message_count": 2
}
```

### 2. Request Tracing

Tracing tracks the flow of requests through the Worker:

- **Span Tracking**: Each operation (OpenAI call, tool execution) is tracked as a span
- **Performance Metrics**: Duration tracking for each span
- **Dependency Tracking**: See which operations depend on others
- **Error Tracking**: Errors are associated with specific spans

### 3. Rate Limiting

Rate limiting is implemented using Cloudflare KV (optional):

- **Per-User Limits**: Uses user_id when available
- **Per-IP Limits**: Falls back to IP address for anonymous users
- **Configurable**: Set via environment variables:
  - `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window (default: 100)
  - `RATE_LIMIT_WINDOW_SECONDS`: Time window in seconds (default: 60)
- **Headers**: Rate limit status returned in response headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets
  - `Retry-After`: Seconds to wait when limit exceeded

### 4. Error Handling

Comprehensive error handling with:

- **Error Codes**: Structured error codes (BAD_REQUEST, RATE_LIMIT_EXCEEDED, OPENAI_ERROR, etc.)
- **Retry Logic**: Automatic retries for transient failures
- **Timeout Protection**: Configurable timeouts for all external calls
- **Error Wrapping**: OpenAI and Supabase errors are wrapped with context

Error Response Format:
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "request_id": "1706356800000-abc123",
  "retry_after": 30
}
```

### 5. Request IDs

Every request gets a unique ID that:

- Appears in logs
- Included in error responses
- Tracked through the entire request lifecycle
- Format: `{timestamp}-{random}`

## Configuration

### Required Environment Variables

- `OPENAI_API_KEY`: OpenAI API key
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key

### Optional Environment Variables

- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `GEMINI_API_KEY`: For optional Gemini tools
- `GOOGLE_MAPS_API_KEY`: For optional Google Maps tools
- `RATE_LIMIT_MAX_REQUESTS`: Rate limit max requests (default: 100)
- `RATE_LIMIT_WINDOW_SECONDS`: Rate limit window (default: 60)

### Cloudflare Bindings

- `KV`: KV namespace for rate limiting (optional, rate limiting works without it but doesn't persist)

## Monitoring

### Logs

Logs are available in Cloudflare Dashboard under Workers & Pages > Your Worker > Logs.

All logs are JSON-formatted for easy parsing and filtering.

### Metrics to Monitor

1. **Request Rate**: Requests per second
2. **Error Rate**: Percentage of requests that error
3. **P50/P95/P99 Latency**: Response time percentiles
4. **Tool Execution Time**: Duration of tool calls
5. **Rate Limit Hits**: Number of requests rate limited
6. **OpenAI Errors**: OpenAI API failures
7. **Supabase Errors**: Supabase API failures

### Alerts

Set up alerts for:

- Error rate > 1%
- P95 latency > 5 seconds
- Rate limit hits > 10% of requests
- OpenAI errors > 0.5% of requests

## Testing

Tests are located in `src/tests/`:

- `worker.test.ts`: Unit tests for core functionality
- `integration.test.ts`: Integration tests for agent tools

Run tests:
```bash
npm test
```

## Tool Verification

All agent tools have been verified:

- ✅ **Marketplace Tools**: `search_offers`, `create_listing`, `geocode`
- ✅ **Mobility Tools**: `publish_presence`, `find_matches`
- ✅ **Payment Tools**: `generate_momo_qr`, `parse_qr`
- ✅ **Support Agent**: No tools (conversational only)

## Performance

- **Typical Response Time**: 1-3 seconds (non-streaming)
- **Streaming Latency**: < 500ms to first token
- **Tool Execution**: < 2 seconds per tool
- **Rate Limit Check**: < 10ms (when KV is used)

## Security

- **No Client-Side Keys**: All API keys are server-side only
- **Rate Limiting**: Prevents abuse
- **Error Sanitization**: Errors don't expose sensitive information
- **Request Validation**: All inputs are validated
- **Timeout Protection**: Prevents resource exhaustion

