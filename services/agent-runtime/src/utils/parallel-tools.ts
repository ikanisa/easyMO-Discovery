/**
 * Parallel Tool Execution Utilities
 * 
 * Executes independent tools in parallel for better performance.
 * Tools with dependencies are executed sequentially.
 */

import type { ToolCall, AgentType, Env, ChatMessage } from '../types';
import { executeToolCall } from './tools';

export interface ToolResult {
  tool_call_id: string;
  result: string;
  success: boolean;
  latency_ms: number;
}

/**
 * Detect if a tool has dependencies on other tools
 */
function hasDependencies(
  toolCall: ToolCall,
  allToolCalls: ToolCall[]
): boolean {
  const toolName = toolCall.function.name;
  
  // Parse arguments to check for dependencies
  let args: any;
  try {
    args = JSON.parse(toolCall.function.arguments || '{}');
  } catch {
    return false;
  }
  
  // Known dependencies:
  // - create_match_candidates depends on create_ride_intent (intent_id)
  if (toolName === 'create_match_candidates') {
    return allToolCalls.some(tc => tc.function.name === 'create_ride_intent');
  }
  
  // - rank_listings might depend on search_listings results
  if (toolName === 'rank_listings') {
    return allToolCalls.some(tc => tc.function.name === 'search_listings');
  }
  
  // - estimate_eta might depend on geocode results
  if (toolName === 'estimate_eta') {
    return allToolCalls.some(tc => 
      tc.function.name === 'geocode' || tc.function.name === 'reverse_geocode'
    );
  }
  
  // Most tools are independent
  return false;
}

/**
 * Group tools by execution order (independent vs dependent)
 */
function groupToolsByDependency(toolCalls: ToolCall[]): {
  independent: ToolCall[];
  dependent: ToolCall[];
} {
  const independent: ToolCall[] = [];
  const dependent: ToolCall[] = [];
  
  for (const toolCall of toolCalls) {
    if (hasDependencies(toolCall, toolCalls)) {
      dependent.push(toolCall);
    } else {
      independent.push(toolCall);
    }
  }
  
  return { independent, dependent };
}

/**
 * Execute tool calls in parallel where possible
 * 
 * Independent tools are executed in parallel.
 * Dependent tools are executed sequentially after their dependencies.
 * 
 * @param toolCalls - Array of tool calls to execute
 * @param agentType - Agent type
 * @param env - Environment variables
 * @param options - Execution options
 * @returns Array of tool results
 */
export async function executeToolCallsParallel(
  toolCalls: ToolCall[],
  agentType: AgentType,
  env: Env,
  options: {
    conversation_id?: string;
    messages?: ChatMessage[];
    user_location?: { lat: number; lng: number };
    user_id?: string;
    user_ip?: string;
  } = {}
): Promise<ToolResult[]> {
  if (toolCalls.length === 0) {
    return [];
  }
  
  // Group tools by dependency
  const { independent, dependent } = groupToolsByDependency(toolCalls);
  
  const results: ToolResult[] = [];
  
  // Execute independent tools in parallel
  if (independent.length > 0) {
    const independentResults = await Promise.allSettled(
      independent.map(async (toolCall) => {
        const startTime = Date.now();
        try {
          const result = await executeToolCall(toolCall, agentType, env, options);
          const latency = Date.now() - startTime;
          return {
            tool_call_id: toolCall.id,
            result,
            success: true,
            latency_ms: latency,
          };
        } catch (error: any) {
          const latency = Date.now() - startTime;
          return {
            tool_call_id: toolCall.id,
            result: JSON.stringify({
              error: error.message || 'Tool execution failed',
              code: error.code || 'TOOL_ERROR',
            }),
            success: false,
            latency_ms: latency,
          };
        }
      })
    );
    
    // Process results
    independentResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          tool_call_id: independent[index].id,
          result: JSON.stringify({ error: result.reason?.message || 'Unknown error' }),
          success: false,
          latency_ms: 0,
        });
      }
    });
  }
  
  // Execute dependent tools sequentially
  // (They may depend on results from independent tools)
  for (const toolCall of dependent) {
    const startTime = Date.now();
    try {
      // Inject results from previous tools into context if needed
      const result = await executeToolCall(toolCall, agentType, env, options);
      const latency = Date.now() - startTime;
      results.push({
        tool_call_id: toolCall.id,
        result,
        success: true,
        latency_ms: latency,
      });
    } catch (error: any) {
      const latency = Date.now() - startTime;
      results.push({
        tool_call_id: toolCall.id,
        result: JSON.stringify({
          error: error.message || 'Tool execution failed',
          code: error.code || 'TOOL_ERROR',
        }),
        success: false,
        latency_ms: latency,
      });
    }
  }
  
  // Return results in original order
  const resultMap = new Map(results.map(r => [r.tool_call_id, r]));
  return toolCalls.map(tc => resultMap.get(tc.id) || {
    tool_call_id: tc.id,
    result: JSON.stringify({ error: 'Tool result not found' }),
    success: false,
    latency_ms: 0,
  });
}

