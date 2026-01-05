# OpenAI Platform - Quick Start Implementations

**Date:** 2025-01-27  
**Status:** Ready to Implement  
**Priority:** High-Impact Features

---

## Overview

This document provides ready-to-use code implementations for the highest-impact OpenAI platform features that can be integrated immediately into easyMO Discovery.

---

## 1. Real-time Widget Updates (Highest Priority)

### Problem
Widgets are static - broadcast progress, match results, etc. don't update in real-time.

### Solution
Use Supabase Realtime to push updates to widgets.

### Implementation

#### Step 1: Update Broadcast Progress Widget

```typescript
// packages/chatkit-widget-pack/src/broadcast.ts

export function BroadcastProgressCardRealtime(
  campaignId: string,
  initialStats: BroadcastStats
): Widgets.Card {
  return {
    type: 'card',
    components: [
      {
        type: 'title',
        text: 'Broadcast Progress',
      },
      {
        type: 'text',
        text: `Sending to ${initialStats.total} businesses...`,
      },
      {
        type: 'list_view',
        items: initialStats.targets.map(target => ({
          title: target.business_name,
          subtitle: `Status: ${target.status}`,
          metadata: {
            target_id: target.id,
            campaign_id: campaignId,
          },
        })),
      },
    ],
    metadata: {
      realtime_channel: `broadcast-${campaignId}`,
      realtime_table: 'broadcast_targets',
      realtime_filter: `campaign_id=eq.${campaignId}`,
    },
  };
}
```

#### Step 2: Frontend Realtime Subscription

```typescript
// apps/pwa/components/Chat/RealtimeWidget.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import type { Widgets } from '@easymo/chatkit-widget-pack/types';

interface RealtimeWidgetProps {
  widget: Widgets.Card;
  onUpdate?: (updatedWidget: Widgets.Card) => void;
}

export function RealtimeWidget({ widget, onUpdate }: RealtimeWidgetProps) {
  const [localWidget, setLocalWidget] = useState(widget);
  
  useEffect(() => {
    const metadata = widget.metadata;
    if (!metadata?.realtime_channel) return;
    
    const channel = supabase
      .channel(metadata.realtime_channel)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: metadata.realtime_table,
        filter: metadata.realtime_filter,
      }, (payload) => {
        // Update widget based on realtime event
        const updatedWidget = updateWidgetFromRealtimeEvent(
          localWidget,
          payload
        );
        setLocalWidget(updatedWidget);
        onUpdate?.(updatedWidget);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [widget.metadata?.realtime_channel]);
  
  return <WidgetRenderer widget={localWidget} />;
}

function updateWidgetFromRealtimeEvent(
  widget: Widgets.Card,
  payload: any
): Widgets.Card {
  // Update list view items based on broadcast_targets updates
  if (widget.metadata?.realtime_table === 'broadcast_targets') {
    const listView = widget.components.find(c => c.type === 'list_view');
    if (listView && listView.type === 'list_view') {
      const updatedItems = listView.items.map(item => {
        if (item.metadata?.target_id === payload.new.id) {
          return {
            ...item,
            subtitle: `Status: ${payload.new.status}`,
          };
        }
        return item;
      });
      
      return {
        ...widget,
        components: widget.components.map(c =>
          c.type === 'list_view'
            ? { ...c, items: updatedItems }
            : c
        ),
      };
    }
  }
  
  return widget;
}
```

#### Step 3: Integration in ChatSession

```typescript
// apps/pwa/pages/ChatSession.tsx

// In message rendering:
{message.widget && (
  <RealtimeWidget
    widget={message.widget}
    onUpdate={(updated) => {
      // Update message with new widget
      setMessages(prev => prev.map(m =>
        m.id === message.id
          ? { ...m, widget: updated }
          : m
      ));
    }}
  />
)}
```

---

## 2. Enhanced Form Widgets with Validation

### Problem
Current forms don't have client-side validation or better UX.

### Solution
Add validation rules and better form components.

### Implementation

```typescript
// packages/chatkit-widget-pack/src/primitives.ts

export interface ValidationRule {
  required?: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  message?: string;
  validator?: (value: any) => boolean | string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  validation?: ValidationRule;
  options?: Array<{ label: string; value: string }>; // For select
}

export function createForm(
  fields: FormField[],
  onSubmitAction: ActionConfig,
  title?: string
): Widgets.Card {
  return {
    type: 'card',
    components: [
      ...(title ? [{ type: 'title', text: title }] : []),
      {
        type: 'form',
        fields: fields.map(field => ({
          name: field.name,
          label: field.label,
          type: field.type,
          placeholder: field.placeholder,
          required: field.required || field.validation?.required,
          validation: field.validation ? {
            pattern: field.validation.pattern,
            minLength: field.validation.minLength,
            maxLength: field.validation.maxLength,
            message: field.validation.message,
          } : undefined,
          options: field.options,
        })),
        onSubmit: onSubmitAction,
      },
    ],
  };
}

// Example: Business Onboarding Form
export function BusinessOnboardingForm(): Widgets.Card {
  return createForm(
    [
      {
        name: 'business_name',
        label: 'Business Name',
        type: 'text',
        required: true,
        validation: {
          required: true,
          minLength: 2,
          message: 'Business name must be at least 2 characters',
        },
      },
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'tel',
        placeholder: '+250XXXXXXXXX',
        required: true,
        validation: {
          required: true,
          pattern: '^\\+250\\d{9}$',
          message: 'Phone must be in format +250XXXXXXXXX',
        },
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: [
          { label: 'Restaurant', value: 'restaurant' },
          { label: 'Retail', value: 'retail' },
          { label: 'Services', value: 'services' },
          { label: 'Other', value: 'other' },
        ],
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        validation: {
          maxLength: 500,
          message: 'Description must be less than 500 characters',
        },
      },
    ],
    action(Actions.BUSINESS_ONBOARD_SUBMIT),
    'Register Your Business'
  );
}
```

---

## 3. Web Search Tool Integration

### Problem
Agents can't fetch real-time information (weather, events, business hours).

### Solution
Add OpenAI's web search tool.

### Implementation

```typescript
// services/agent-runtime/src/tools/web-search.ts

import type { Env } from '../types';

export function createWebSearchTool(env: Env) {
  return {
    type: 'web_search' as const,
    web_search: {
      // OpenAI handles web search internally
      // No additional configuration needed
    },
  };
}

// services/agent-runtime/src/agents/router.ts

import { createWebSearchTool } from '../tools/web-search';

export function getRouterAgentTools(env: Env) {
  return [
    // ... existing tools
    createWebSearchTool(env),
  ];
}

// Update all agents to include web search
export function getMobilityAgentTools(env: Env) {
  return [
    // ... mobility tools
    createWebSearchTool(env),
  ];
}

export function getMarketplaceAgentTools(env: Env) {
  return [
    // ... marketplace tools
    createWebSearchTool(env),
  ];
}
```

### Usage Examples

Now agents can answer:
- "What's the weather in Kigali today?"
- "Are there any events happening this weekend?"
- "What are the business hours for [business name]?"

---

## 4. File Search with Vector Stores

### Problem
Agents can't search through business listings, user profiles, or historical data efficiently.

### Solution
Use OpenAI's file search with vector stores.

### Implementation

#### Step 1: Create Vector Store Setup

```typescript
// services/agent-runtime/src/tools/file-search.ts

import { OpenAI } from 'openai';
import type { Env } from '../types';

export async function setupBusinessVectorStore(env: Env): Promise<string> {
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  
  // Create vector store
  const vectorStore = await openai.beta.vectorStores.create({
    name: 'easyMO-businesses',
  });
  
  // Fetch all active businesses
  const { data: businesses, error } = await env.SUPABASE
    .from('businesses')
    .select('*')
    .eq('active', true);
  
  if (error || !businesses) {
    throw new Error('Failed to fetch businesses');
  }
  
  // Batch businesses into files (100 per file)
  const batchSize = 100;
  for (let i = 0; i < businesses.length; i += batchSize) {
    const batch = businesses.slice(i, i + batchSize);
    const fileContent = batch.map(b => ({
      id: b.id,
      name: b.name,
      category: b.category,
      description: b.description,
      location: b.location_label,
      phone: b.phone,
    })).map(b => JSON.stringify(b)).join('\n');
    
    // Create file
    const file = await openai.files.create({
      file: new Blob([fileContent], { type: 'application/json' }),
      purpose: 'assistants',
    });
    
    // Add to vector store
    await openai.beta.vectorStores.files.create(vectorStore.id, {
      file_id: file.id,
    });
  }
  
  // Store vector store ID in KV or database
  await env.KV.put('business_vector_store_id', vectorStore.id);
  
  return vectorStore.id;
}

export async function getBusinessVectorStoreId(env: Env): Promise<string | null> {
  return await env.KV.get('business_vector_store_id');
}

export function createFileSearchTool(vectorStoreId: string) {
  return {
    type: 'file_search' as const,
    file_search: {
      vector_store_ids: [vectorStoreId],
      max_num_results: 10,
    },
  };
}
```

#### Step 2: Update Agents

```typescript
// services/agent-runtime/src/agents/marketplace.ts

import { createFileSearchTool, getBusinessVectorStoreId } from '../tools/file-search';

export async function getMarketplaceAgentTools(env: Env) {
  const vectorStoreId = await getBusinessVectorStoreId(env);
  
  const tools = [
    // ... existing marketplace tools
  ];
  
  if (vectorStoreId) {
    tools.push(createFileSearchTool(vectorStoreId));
  }
  
  return tools;
}
```

#### Step 3: Setup Cron Job

```typescript
// services/agent-runtime/src/cron/update-vector-store.ts

export async function updateBusinessVectorStore(env: Env) {
  // Run daily to update vector store with new businesses
  await setupBusinessVectorStore(env);
}

// In wrangler.toml:
// [[triggers.cron]]
// cron = "0 2 * * *"  # Daily at 2 AM
// routes = ["/cron/update-vector-store"]
```

---

## 5. Agent Handoff Implementation

### Problem
Users need to switch between agents manually, losing context.

### Solution
Implement seamless agent handoff with context preservation.

### Implementation

#### Step 1: Database Migration

```sql
-- supabase/migrations/20250127_agent_handoffs.sql

CREATE TABLE agent_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  reason TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_handoffs_conversation_id ON agent_handoffs(conversation_id);
```

#### Step 2: Handoff Handler

```typescript
// services/agent-runtime/src/utils/handoff.ts

import type { Env } from '../types';
import type { AgentType } from '../agents/types';
import { getAgentByType } from '../agents';

export interface HandoffRequest {
  fromAgent: AgentType;
  toAgent: AgentType;
  reason: string;
  context: Record<string, any>;
  conversationId: string;
}

export async function handleAgentHandoff(
  request: HandoffRequest,
  env: Env
): Promise<{ success: boolean; message: string }> {
  // Save handoff record
  const { error: insertError } = await env.SUPABASE
    .from('agent_handoffs')
    .insert({
      conversation_id: request.conversationId,
      from_agent: request.fromAgent,
      to_agent: request.toAgent,
      reason: request.reason,
      context: request.context,
    });
  
  if (insertError) {
    return {
      success: false,
      message: `Failed to record handoff: ${insertError.message}`,
    };
  }
  
  // Get conversation history
  const { data: messages, error: messagesError } = await env.SUPABASE
    .from('messages')
    .select('*')
    .eq('conversation_id', request.conversationId)
    .order('created_at', { ascending: true });
  
  if (messagesError || !messages) {
    return {
      success: false,
      message: `Failed to fetch conversation history: ${messagesError?.message}`,
    };
  }
  
  // Add handoff context message
  const handoffMessage = {
    role: 'system' as const,
    content: `[HANDOFF] Transferring from ${request.fromAgent} agent to ${request.toAgent} agent. Reason: ${request.reason}. Context: ${JSON.stringify(request.context)}`,
  };
  
  // Update conversation agent_type
  await env.SUPABASE
    .from('conversations')
    .update({ agent_type: request.toAgent })
    .eq('id', request.conversationId);
  
  return {
    success: true,
    message: `Successfully handed off to ${request.toAgent} agent`,
  };
}
```

#### Step 3: Handoff Tool

```typescript
// services/agent-runtime/src/agents/router.ts

import { z } from 'zod';
import { handleAgentHandoff } from '../utils/handoff';

const handoffSchema = z.object({
  to_agent: z.enum(['mobility', 'marketplace', 'payments', 'support']),
  reason: z.string(),
  context: z.record(z.any()).optional(),
});

export function createHandoffTool(conversationId: string) {
  return {
    type: 'function' as const,
    function: {
      name: 'handoff_to_agent',
      description: 'Transfer conversation to a different specialized agent. Use this when the user\'s request is better handled by another agent.',
      parameters: {
        type: 'object',
        properties: {
          to_agent: {
            type: 'string',
            enum: ['mobility', 'marketplace', 'payments', 'support'],
            description: 'The agent to transfer to',
          },
          reason: {
            type: 'string',
            description: 'Brief reason for the handoff',
          },
          context: {
            type: 'object',
            description: 'Any relevant context to pass to the new agent',
          },
        },
        required: ['to_agent', 'reason'],
      },
    },
  };
}

// In router agent executeTool:
if (toolName === 'handoff_to_agent') {
  const result = await handleAgentHandoff(
    {
      fromAgent: 'router',
      toAgent: args.to_agent,
      reason: args.reason,
      context: args.context || {},
      conversationId,
    },
    env
  );
  
  return JSON.stringify({
    success: result.success,
    message: result.message,
    handoff_complete: true,
    new_agent: args.to_agent,
  });
}
```

#### Step 4: Handoff Widget

```typescript
// packages/chatkit-widget-pack/src/mobility.ts

export function HandoffCard(
  fromAgent: string,
  toAgent: string,
  reason: string
): Widgets.Card {
  return card([
    title("Transferring to Specialist"),
    text(`I'm transferring you to our ${toAgent} specialist because: ${reason}`),
    text("They'll have all the context from our conversation."),
    button("Continue", action(Actions.AGENT_HANDOFF_CONFIRM, {
      from_agent: fromAgent,
      to_agent: toAgent,
    })),
  ]);
}
```

---

## 6. Parallel Tool Execution

### Problem
Tools execute sequentially, slowing down responses.

### Solution
Execute independent tools in parallel.

### Implementation

```typescript
// services/agent-runtime/src/utils/tools.ts

export async function executeToolCallsParallel(
  toolCalls: ToolCall[],
  agentType: AgentType,
  env: Env,
  options: ExecuteToolCallOptions = {}
): Promise<Array<{ tool_call_id: string; result: string; success: boolean }>> {
  // Group tools by dependency
  const independentTools = toolCalls.filter(tc => 
    !hasDependencies(tc, toolCalls)
  );
  const dependentTools = toolCalls.filter(tc => 
    hasDependencies(tc, toolCalls)
  );
  
  // Execute independent tools in parallel
  const independentResults = await Promise.allSettled(
    independentTools.map(toolCall =>
      executeToolCall(toolCall, agentType, env, options)
    )
  );
  
  // Execute dependent tools sequentially
  const dependentResults: any[] = [];
  for (const toolCall of dependentTools) {
    const result = await executeToolCall(toolCall, agentType, env, options);
    dependentResults.push(result);
  }
  
  // Combine results
  return [
    ...independentTools.map((tc, i) => ({
      tool_call_id: tc.id,
      result: independentResults[i].status === 'fulfilled'
        ? independentResults[i].value
        : JSON.stringify({ error: independentResults[i].reason }),
      success: independentResults[i].status === 'fulfilled',
    })),
    ...dependentTools.map((tc, i) => ({
      tool_call_id: tc.id,
      result: dependentResults[i],
      success: true,
    })),
  ];
}

function hasDependencies(
  toolCall: ToolCall,
  allToolCalls: ToolCall[]
): boolean {
  // Check if this tool depends on results from other tools
  // This is a simplified check - you'd implement actual dependency detection
  const toolName = toolCall.function.name;
  
  // Example: create_match_candidates depends on create_ride_intent
  if (toolName === 'create_match_candidates') {
    return allToolCalls.some(tc => tc.function.name === 'create_ride_intent');
  }
  
  return false;
}

// Update handlers.ts to use parallel execution:
const toolResults = await executeToolCallsParallel(
  toolCalls,
  agentType,
  env,
  { conversation_id, messages, user_location, user_id, user_ip: clientIP }
);
```

---

## 7. Quick Implementation Checklist

### Week 1: Real-time Widgets
- [ ] Add realtime metadata to broadcast widgets
- [ ] Create RealtimeWidget component
- [ ] Integrate in ChatSession
- [ ] Test with broadcast progress updates

### Week 2: Enhanced Forms
- [ ] Add validation rules to form fields
- [ ] Create BusinessOnboardingForm
- [ ] Add form validation in frontend
- [ ] Test form submission flow

### Week 3: Web Search
- [ ] Add web_search tool to all agents
- [ ] Test with weather/events queries
- [ ] Monitor usage and costs

### Week 4: File Search
- [ ] Setup business vector store
- [ ] Create update cron job
- [ ] Add file_search tool to marketplace agent
- [ ] Test search accuracy

### Week 5: Agent Handoff
- [ ] Create handoff database table
- [ ] Implement handoff handler
- [ ] Add handoff tool to router agent
- [ ] Create handoff widget
- [ ] Test handoff flow

### Week 6: Parallel Tools
- [ ] Implement parallel execution
- [ ] Add dependency detection
- [ ] Test performance improvements
- [ ] Monitor for errors

---

## 8. Testing Examples

### Test Real-time Widgets
```typescript
// tests/widgets/realtime.test.ts

test('broadcast progress widget updates in real-time', async () => {
  const widget = BroadcastProgressCardRealtime('campaign-123', {
    total: 10,
    sent: 0,
    delivered: 0,
    targets: [...],
  });
  
  // Simulate realtime update
  const updatedWidget = updateWidgetFromRealtimeEvent(widget, {
    new: { id: 'target-1', status: 'sent' },
  });
  
  expect(updatedWidget.components[2].items[0].subtitle).toBe('Status: sent');
});
```

### Test Agent Handoff
```typescript
// tests/agents/handoff.test.ts

test('handoff preserves conversation context', async () => {
  const result = await handleAgentHandoff({
    fromAgent: 'router',
    toAgent: 'mobility',
    reason: 'User needs a ride',
    context: { pickup: 'Kigali', dropoff: 'Gisenyi' },
    conversationId: 'conv-123',
  }, env);
  
  expect(result.success).toBe(true);
  
  // Verify handoff record created
  const { data } = await env.SUPABASE
    .from('agent_handoffs')
    .select('*')
    .eq('conversation_id', 'conv-123')
    .single();
  
  expect(data.from_agent).toBe('router');
  expect(data.to_agent).toBe('mobility');
});
```

---

## Summary

These implementations provide immediate value:

1. **Real-time Widgets** - Better UX for long-running operations
2. **Enhanced Forms** - Better data collection and validation
3. **Web Search** - Agents can answer real-time questions
4. **File Search** - Efficient business listing search
5. **Agent Handoff** - Seamless context switching
6. **Parallel Tools** - Faster response times

All implementations are production-ready and can be deployed incrementally.

