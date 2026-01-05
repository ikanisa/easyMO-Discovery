# OpenAI Platform - Quick Reference Card

**Last Updated:** 2025-01-27

---

## 🚀 Quick Start (1 Week)

### 1. Web Search Tool (1 day)
```typescript
// services/agent-runtime/src/tools/web-search.ts
export function createWebSearchTool(env: Env) {
  return { type: 'web_search' as const, web_search: {} };
}

// Add to agent tools array
const tools = [...existingTools, createWebSearchTool(env)];
```

### 2. Real-time Widget Updates (2-3 days)
```typescript
// Widget metadata
metadata: {
  realtime_channel: `broadcast-${campaignId}`,
  realtime_table: 'broadcast_targets',
}

// Frontend subscription
supabase.channel(channel)
  .on('postgres_changes', { table, filter }, updateWidget)
  .subscribe();
```

### 3. Enhanced Forms (2-3 days)
```typescript
// Add validation
validation: {
  pattern: '^\\+250\\d{9}$',
  message: 'Invalid phone format',
}
```

---

## 📋 Implementation Checklist

### Phase 1: Quick Wins
- [ ] Web Search Tool
- [ ] Real-time Widget Updates
- [ ] Enhanced Form Widgets
- [ ] Agent Handoff

### Phase 2: Advanced
- [ ] File Search (Vector Stores)
- [ ] Parallel Tool Execution
- [ ] Agent Memory System

### Phase 3: Future
- [ ] Realtime API (Voice)
- [ ] Agent Builder Workflows
- [ ] Multi-Agent Collaboration

---

## 🔗 Key Files

### New Files to Create
- `services/agent-runtime/src/tools/web-search.ts`
- `services/agent-runtime/src/utils/handoff.ts`
- `apps/pwa/components/Chat/RealtimeWidget.tsx`
- `supabase/migrations/20250127_agent_handoffs.sql`

### Files to Update
- `services/agent-runtime/src/agents/*.ts` (add web search)
- `packages/chatkit-widget-pack/src/broadcast.ts` (realtime metadata)
- `apps/pwa/pages/ChatSession.tsx` (realtime widgets)

---

## 📚 Documentation

- **Full Guide:** `docs/OPENAI_ENHANCEMENTS_IMPLEMENTATION.md`
- **Quick Start:** `docs/OPENAI_QUICK_START_IMPLEMENTATIONS.md`
- **Summary:** `docs/OPENAI_PLATFORM_SUMMARY.md`

---

## 🎯 Priority Order

1. **Web Search** - Easiest, immediate value
2. **Real-time Widgets** - High UX impact
3. **Enhanced Forms** - Better data collection
4. **Agent Handoff** - Better agent switching
5. **File Search** - Better business search
6. **Parallel Tools** - Performance boost

---

## 💡 Pro Tips

- Start with web search (5 minutes to add)
- Test real-time widgets with broadcast progress
- Use Agent Builder for complex workflows
- Monitor tool execution latency
- Cache vector store updates

---

## 🔍 Common Patterns

### Add Tool to Agent
```typescript
export function getAgentTools(env: Env) {
  return [
    ...existingTools,
    createWebSearchTool(env),
  ];
}
```

### Create Realtime Widget
```typescript
export function WidgetWithRealtime(id: string): Widgets.Card {
  return {
    ...widget,
    metadata: {
      realtime_channel: `channel-${id}`,
      realtime_table: 'table_name',
    },
  };
}
```

### Agent Handoff
```typescript
await handleAgentHandoff({
  fromAgent: 'router',
  toAgent: 'mobility',
  reason: 'User needs a ride',
  context: { pickup: 'Kigali' },
  conversationId,
}, env);
```

---

## 📊 Success Metrics

- Web search: Answer rate for real-time questions
- Real-time widgets: Update latency < 1s
- Forms: Completion rate increase
- Handoff: Success rate > 95%

---

## 🛠️ Troubleshooting

**Web search not working?**
- Check OpenAI API key
- Verify tool is in agent tools array
- Check model supports web_search

**Real-time widgets not updating?**
- Verify Supabase Realtime enabled
- Check channel subscription
- Verify RLS policies allow updates

**Agent handoff failing?**
- Check conversation_id exists
- Verify agent types are valid
- Check database migration applied

---

## 📞 Resources

- [OpenAI Platform Docs](https://platform.openai.com/docs)
- [ChatKit JS SDK](https://github.com/openai/chatkit-js)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

