/**
 * Agent Handoff Tool
 * 
 * Allows agents to transfer conversations to other specialized agents
 * while preserving context and conversation history.
 */

import { z } from 'zod';
import type { Env } from '../types';
import { handleAgentHandoff } from '../utils/handoff';

const handoffSchema = z.object({
  to_agent: z.enum(['mobility', 'marketplace', 'payments', 'support']),
  reason: z.string().describe('Brief reason for the handoff (e.g., "User needs a ride")'),
  context: z.record(z.any()).optional().describe('Any relevant context to pass to the new agent'),
});

export const handoffTool = {
  type: 'function' as const,
  function: {
    name: 'handoff_to_agent',
    description: 'Transfer conversation to a different specialized agent. Use this when the user\'s request is better handled by another agent. The conversation history and context will be preserved.',
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
          description: 'Any relevant context to pass to the new agent (optional)',
          additionalProperties: true,
        },
      },
      required: ['to_agent', 'reason'],
    },
  },
};

export const handoffTools = [handoffTool];

/**
 * Execute handoff tool
 */
export async function executeHandoff(
  args: z.infer<typeof handoffSchema>,
  env: Env,
  conversationId: string,
  currentAgent: 'mobility' | 'marketplace' | 'payments' | 'support' | 'router'
): Promise<string> {
  const result = await handleAgentHandoff(
    {
      fromAgent: currentAgent,
      toAgent: args.to_agent,
      reason: args.reason,
      context: args.context || {},
      conversationId,
    },
    env
  );

  if (result.success) {
    return JSON.stringify({
      success: true,
      message: result.message,
      handoff_complete: true,
      new_agent: args.to_agent,
      handoff_id: result.handoffId,
    });
  } else {
    return JSON.stringify({
      success: false,
      error: result.message,
      handoff_complete: false,
    });
  }
}

