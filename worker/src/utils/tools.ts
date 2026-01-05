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
    const args = JSON.parse(toolCall.function.arguments);
    return await agent.executeTool(toolCall.function.name, args, env);
  } catch (error: any) {
    return JSON.stringify({
      error: error.message || 'Failed to execute tool',
      tool_call_id: toolCall.id,
    });
  }
}

