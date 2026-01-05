/**
 * Tool execution and routing utilities
 */

import type { Env, AgentType, ToolCall } from '../types';
import { mobilityAgent } from '../agents/mobility';
import { marketplaceAgent } from '../agents/marketplace';
import { paymentsAgent } from '../agents/payments';
import { supportAgent } from '../agents/support';

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

export async function executeToolCall(
  toolCall: ToolCall,
  agentType: AgentType,
  env: Env
): Promise<string> {
  const agent = getAgentByType(agentType);
  
  try {
    // Parse arguments with better error handling
    let args: any;
    try {
      args = JSON.parse(toolCall.function.arguments || '{}');
    } catch (parseError) {
      throw new Error(`Invalid tool arguments JSON: ${toolCall.function.arguments}`);
    }

    // Execute tool with timeout
    const toolResult = await Promise.race([
      agent.executeTool(toolCall.function.name, args, env),
      new Promise<string>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Tool ${toolCall.function.name} timeout after 10 seconds`));
        }, 10000);
      }),
    ]);

    return toolResult;
  } catch (error: any) {
    // Return structured error as JSON string
    return JSON.stringify({
      error: error.message || 'Failed to execute tool',
      code: (error as any).code || 'TOOL_ERROR',
      tool_call_id: toolCall.id,
      tool_name: toolCall.function.name,
    });
  }
}

