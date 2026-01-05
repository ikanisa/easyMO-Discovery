# Phase 06: ChatGPT App Store Surface (Apps SDK iframe + MCP server) - COMPLETE

**Date:** 2025-01-29  
**Status:** ✅ Complete  
**Purpose:** Build ChatGPT App Store version with lightweight iframe UI and MCP server exposing tools

---

## Executive Summary

Phase 06 successfully implemented the ChatGPT App Store surface:
- ✅ Lightweight iframe UI web component
- ✅ ChatKit widget rendering in iframe context
- ✅ MCP server with widget support
- ✅ Action handling via window.openai APIs
- ✅ App manifest for ChatGPT App Store

**Build Status:** ✅ **PASSING**

---

## 1. Iframe UI Component

### 1.1 Enhanced ChatGPT UI

**Location:** `apps/chatgpt-ui/src/index.tsx`

**Features:**
- ✅ ChatKit widget rendering
- ✅ Legacy tool card support (backward compatible)
- ✅ Streaming widget updates
- ✅ Action handling via `window.openai.callTool`
- ✅ Widget state management
- ✅ Iframe-safe implementation

**Window.openai APIs Used:**
- `toolOutput()` - Send tool results to ChatGPT
- `callTool()` - Call tools from widget actions
- `setWidgetState()` - Update widget state
- `getWidgetState()` - Get current widget state

### 1.2 ChatKit Widget Renderer

**Location:** `apps/chatgpt-ui/src/components/ChatKitWidgetRenderer.tsx`

**Features:**
- ✅ Card, ListView, Form widget support
- ✅ Action handling via window.openai.callTool
- ✅ Streaming state indication
- ✅ Nested widget support
- ✅ Mobile-responsive styling

**Widget Types Supported:**
- `Card` - Rich content containers
- `ListView` - Lists of items
- `Form` - User input forms
- `Text` / `Markdown` - Text content

---

## 2. MCP Server Integration

### 2.1 Enhanced MCP Server

**Location:** `services/agent-runtime/src/mcp-server.ts`

**Enhancements:**
- ✅ Widget generation from tool results
- ✅ Widget inclusion in structured outputs
- ✅ Tool execution with user context
- ✅ Proper error handling
- ✅ CORS headers for iframe access

**Widget Generation:**
```typescript
// Check if tool result includes a widget
let widget = null;
if (resultData.widget) {
  widget = resultData.widget;
} else {
  // Try to generate widget from tool result
  const { generateWidgetFromToolResult } = await import('./utils/widgets');
  widget = generateWidgetFromToolResult(
    name,
    JSON.stringify(resultData),
    { user_id: userId, user_location: userLocation }
  );
}

// Include widget in structured output
const structuredOutput = {
  success: resultData.success !== false,
  ...resultData,
  tool_name: name,
  trace_id: traceId,
  ...(widget ? { widget } : {}),
};
```

### 2.2 MCP Endpoints

**Endpoints:**
- `GET /mcp/capabilities` - Server capabilities
- `GET /mcp/tools` - List all available tools
- `POST /mcp/tools/call` - Execute tool calls
- `GET /mcp/resources` - List resources
- `GET /mcp/resources/{uri}` - Read resource

**Tool Categories:**
- Mobility: `set_presence`, `create_ride_intent`, `find_driver_matches`, `find_passenger_requests`, `reveal_contact`
- Marketplace: `search_listings`, `create_listing`, `vendor_onboarding_status`
- Payments: `generate_momo_qr`, `parse_qr`
- Geo: `geocode`, `estimate_eta`

---

## 3. Widget Rendering in Iframe

### 3.1 Widget Flow

**Flow:**
1. ChatGPT calls tool via MCP server
2. MCP server executes tool and generates widget
3. Widget included in structured output
4. ChatGPT sends widget to iframe via message
5. Iframe renders widget using ChatKitWidgetRenderer
6. User interacts with widget (button click, form submit)
7. Action sent to ChatGPT via `window.openai.callTool`
8. ChatGPT processes action and returns updated widget

### 3.2 Message Handling

**Message Types:**
- `tool_result` - Tool execution result with optional widget
- `widget` - Standalone widget update
- `widget_state` - Widget state update

**Implementation:**
```typescript
const handleMessage = (event: MessageEvent) => {
  // Handle tool results
  if (event.data?.type === 'tool_result') {
    setToolResult(event.data.result);
    if (event.data.result?.widget) {
      setChatKitWidget(event.data.result.widget);
    }
  }
  
  // Handle widget updates
  if (event.data?.type === 'widget' && event.data.widget) {
    const widget = event.data.widget;
    if (widget.id) {
      setStreamingWidgets(prev => {
        const updated = new Map(prev);
        updated.set(widget.id, widget);
        return updated;
      });
    }
  }
};
```

---

## 4. Action Handling

### 4.1 Action Flow

**Implementation:**
```typescript
const handleAction = async (action: ActionConfig) => {
  // Call tool via ChatGPT Apps SDK
  if (window.openai?.callTool) {
    try {
      const result = await window.openai.callTool(action.type, action);
      // Handle result (may include updated widget)
      if (result?.widget) {
        setChatKitWidget(result.widget);
      }
    } catch (error: any) {
      console.error('Action failed:', error);
    }
  }
};
```

**Action Types:**
- `request_ride` - Request ride from driver
- `accept_ride` - Accept ride request
- `contact_business` - Contact business
- `process_payment` - Process payment
- Custom actions defined by agent

### 4.2 Widget Action Integration

**Button Actions:**
```typescript
<button
  onClick={() => button.onClickAction && onAction?.(button.onClickAction)}
>
  {button.label}
</button>
```

**Form Actions:**
```typescript
<form onSubmit={(e) => {
  e.preventDefault();
  if (widget.onSubmitAction) {
    onAction?.({
      ...widget.onSubmitAction,
      formData,
    });
  }
}}>
```

---

## 5. App Manifest

### 5.1 Manifest Configuration

**Location:** `apps/chatgpt-ui/public/app-manifest.json`

**Fields:**
- ✅ App name and description
- ✅ MCP server URL
- ✅ UI bundle URL
- ✅ Privacy policy URL
- ✅ Data minimization URL
- ✅ Categories and tags
- ✅ Capabilities (know/do/show)
- ✅ Use cases with examples
- ✅ Requirements (location, auth)

**Key URLs:**
- `mcp_server_url`: Cloudflare Worker MCP endpoint
- `ui_bundle_url`: Static hosting URL for iframe UI
- `privacy_policy_url`: Privacy policy page
- `data_minimization_url`: Data minimization documentation

---

## 6. Build Verification

### 6.1 Build Status

**Command:** `pnpm run build` (in apps/chatgpt-ui)  
**Status:** ✅ **PASSING**

**Output:**
- Build time: ~1.6 seconds
- Bundle size: 158.09 KB (gzipped: 49.86 KB)
- Dependencies: React, React DOM only

### 6.2 TypeScript Status

**Status:** ✅ **PASSING**  
**Issues:** None

---

## 7. Acceptance Criteria

### Phase 06 Checklist

- ✅ Lightweight iframe UI web component
- ✅ ChatKit widget rendering in iframe
- ✅ MCP server with widget support
- ✅ Action handling via window.openai APIs
- ✅ App manifest for ChatGPT App Store
- ✅ Backward compatibility with legacy tool cards
- ✅ Iframe-safe implementation

**Status:** ✅ **COMPLETE**

---

## 8. Files Created/Modified

### Created Files

1. `apps/chatgpt-ui/src/components/ChatKitWidgetRenderer.tsx` - ChatKit widget renderer for iframe
2. `apps/chatgpt-ui/public/app-manifest.json` - Enhanced app manifest
3. `docs/PHASE06_CHATGPT_APP_STORE_SURFACE.md` - This document

### Modified Files

1. `apps/chatgpt-ui/src/index.tsx` - Enhanced with ChatKit widget support
2. `services/agent-runtime/src/mcp-server.ts` - Added widget generation

---

## 9. Usage Examples

### 9.1 Widget Rendering

```typescript
// Tool result includes widget
const toolResult = {
  tool_name: 'find_driver_matches',
  success: true,
  matches: [...],
  widget: {
    type: 'Card',
    id: 'matches-123',
    children: [
      { type: 'Title', value: 'Found 3 Drivers' },
      { type: 'ListView', items: [...] }
    ]
  }
};

// Widget is automatically rendered in iframe
```

### 9.2 Action Handling

```typescript
// Widget button triggers action
<Button
  onClickAction={{
    type: 'request_ride',
    driverId: 'abc-123',
    intentId: 'xyz-789'
  }}
>
  Request Ride
</Button>

// Action sent to ChatGPT via window.openai.callTool
// ChatGPT processes action and returns updated widget
```

### 9.3 MCP Tool Call

```typescript
// ChatGPT calls tool via MCP
POST /mcp/tools/call
{
  "name": "find_driver_matches",
  "arguments": {
    "intent_id": "xyz-789",
    "radius_km": 5
  }
}

// MCP server returns structured output with widget
{
  "content": [{
    "type": "text",
    "text": JSON.stringify({
      "success": true,
      "matches": [...],
      "widget": { ... }
    })
  }]
}
```

---

## 10. Deployment Checklist

### 10.1 MCP Server

- ✅ Deploy Cloudflare Worker with MCP endpoints
- ✅ Configure CORS headers for iframe access
- ✅ Set environment variables (OpenAI API key, Supabase)
- ✅ Test tool execution
- ✅ Verify widget generation

### 10.2 Iframe UI

- ✅ Build static bundle (`pnpm run build`)
- ✅ Deploy to static hosting (Cloudflare Pages, Vercel, Netlify)
- ✅ Configure CORS headers
- ✅ Test widget rendering
- ✅ Verify action handling

### 10.3 App Manifest

- ✅ Update URLs (MCP server, UI bundle, privacy policy)
- ✅ Add screenshots
- ✅ Complete capabilities and use cases
- ✅ Submit to ChatGPT App Store

---

## 11. Next Steps

### Phase 07: Testing + Observability + Release Hardening

**Focus Areas:**
- Playwright E2E tests
- Error monitoring (Sentry)
- Structured logs
- Security checks (OWASP)
- CI gates

**Prerequisites:**
- ✅ ChatGPT App Store surface complete (Phase 06)
- ✅ AI-first UX complete (Phase 05)

---

## References

- [ChatGPT Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [MCP Server Guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Widget & Action Patterns](./WIDGET_ACTION_PATTERNS.md)
- [ChatKit Widget Pack](../packages/chatkit-widget-pack/README.md)

---

**Last Updated:** 2025-01-29  
**Status:** ✅ Phase 06 Complete

