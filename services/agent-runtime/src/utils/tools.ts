/**
 * Tool execution and routing utilities
 * Enhanced with policy enforcement and persistence
 */

import type { Env, AgentType, ToolCall, ChatMessage } from '../types';
import { mobilityAgent } from '../agents/mobility';
import { marketplaceAgent } from '../agents/marketplace';
import { paymentsAgent } from '../agents/payments';
import { supportAgent } from '../agents/support';
import { validateLocationConsent, enforcePresenceTTL, enforceIntentTTL } from './policy';
import { saveToolTrace } from './persistence';

export function getAgentByType(agentType: AgentType) {
  switch (agentType) {
    case 'mobility':
      return mobilityAgent;
    case 'marketplace':
      return marketplaceAgent;
    case 'payments':
      return paymentsAgent;
    case 'support':
      return supportAgent;
    default:
      return supportAgent;
  }
}

export interface ExecuteToolCallOptions {
  conversation_id?: string;
  messages?: ChatMessage[];
  user_location?: { lat: number; lng: number };
  user_id?: string;
  user_ip?: string;
}

export async function executeToolCall(
  toolCall: ToolCall,
  agentType: AgentType,
  env: Env,
  options: ExecuteToolCallOptions = {}
): Promise<string> {
  const agent = getAgentByType(agentType);
  const toolStartTime = Date.now();
  const { conversation_id, messages = [], user_location, user_id, user_ip } = options;
  
  try {
    // Parse arguments with better error handling
    let args: any;
    try {
      args = JSON.parse(toolCall.function.arguments || '{}');
    } catch (parseError) {
      throw new Error(`Invalid tool arguments JSON: ${toolCall.function.arguments}`);
    }

    // Policy enforcement: Check location consent
    const consentCheck = validateLocationConsent(toolCall.function.name, messages, user_location);
    if (!consentCheck.allowed) {
      const errorResult = JSON.stringify({
        error: consentCheck.reason || 'Location consent required',
        code: 'LOCATION_CONSENT_REQUIRED',
        tool_call_id: toolCall.id,
        tool_name: toolCall.function.name,
      });
      
      // Save tool trace
      if (conversation_id) {
        await saveToolTrace({
          conversation_id,
          tool_name: toolCall.function.name,
          input: args,
          output: errorResult,
          latency_ms: Date.now() - toolStartTime,
          ok: false,
          error_message: consentCheck.reason,
        }, env);
      }
      
      return errorResult;
    }

    // Policy enforcement: Enforce TTL for presence and intents
    if (toolCall.function.name === 'publish_presence' && args.ttl) {
      args.ttl = enforcePresenceTTL(args.ttl);
    }
    if (toolCall.function.name === 'create_ride_intent' && args.ttl_seconds) {
      args.ttl_seconds = enforceIntentTTL(args.ttl_seconds);
    }

    // Execute tool with timeout and pass user context for rate limiting
    const toolResult = await Promise.race([
      agent.executeTool(toolCall.function.name, args, env, user_id, user_ip),
      new Promise<string>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Tool ${toolCall.function.name} timeout after 10 seconds`));
        }, 10000);
      }),
    ]);

    const latency = Date.now() - toolStartTime;

    // Save tool trace
    if (conversation_id) {
      await saveToolTrace({
        conversation_id,
        tool_name: toolCall.function.name,
        input: args,
        output: toolResult,
        latency_ms: latency,
        ok: true,
      }, env);
    }

    return toolResult;
  } catch (error: any) {
    const latency = Date.now() - toolStartTime;
    
    // Return structured error as JSON string
    const errorResult = JSON.stringify({
      error: error.message || 'Failed to execute tool',
      code: (error as any).code || 'TOOL_ERROR',
      tool_call_id: toolCall.id,
      tool_name: toolCall.function.name,
    });

    // Save tool trace with error
    if (conversation_id) {
      await saveToolTrace({
        conversation_id,
        tool_name: toolCall.function.name,
        input: JSON.parse(toolCall.function.arguments || '{}'),
        output: errorResult,
        latency_ms: latency,
        ok: false,
        error_message: error.message,
      }, env);
    }

    return errorResult;
  }
}

