/**
 * Agent Handoff Utilities
 * 
 * Handles seamless context switching between agents while preserving
 * conversation history and context.
 */

import type { Env } from '../types';
import type { AgentType } from '../agents/types';

export interface HandoffRequest {
  fromAgent: AgentType;
  toAgent: AgentType;
  reason: string;
  context: Record<string, any>;
  conversationId: string;
}

export interface HandoffResult {
  success: boolean;
  message: string;
  handoffId?: string;
}

/**
 * Handle agent handoff - transfer conversation to a different agent
 * 
 * This function:
 * 1. Records the handoff in the database
 * 2. Updates the conversation's agent_type
 * 3. Adds a system message with handoff context
 * 
 * @param request - Handoff request details
 * @param env - Environment variables
 * @returns Handoff result
 */
export async function handleAgentHandoff(
  request: HandoffRequest,
  env: Env
): Promise<HandoffResult> {
  try {
    // Validate agent types
    const validAgents: AgentType[] = ['router', 'mobility', 'marketplace', 'payments', 'support'];
    if (!validAgents.includes(request.fromAgent) || !validAgents.includes(request.toAgent)) {
      return {
        success: false,
        message: `Invalid agent type. Must be one of: ${validAgents.join(', ')}`,
      };
    }

    // Save handoff record
    const { data: handoff, error: insertError } = await env.SUPABASE
      .from('agent_handoffs')
      .insert({
        conversation_id: request.conversationId,
        from_agent: request.fromAgent,
        to_agent: request.toAgent,
        reason: request.reason,
        context: request.context,
      })
      .select('id')
      .single();

    if (insertError || !handoff) {
      return {
        success: false,
        message: `Failed to record handoff: ${insertError?.message || 'Unknown error'}`,
      };
    }

    // Update conversation agent_type
    const { error: updateError } = await env.SUPABASE
      .from('conversations')
      .update({ agent_type: request.toAgent })
      .eq('id', request.conversationId);

    if (updateError) {
      // Handoff record was created, but conversation update failed
      // This is not critical, but log it
      console.error('Failed to update conversation agent_type:', updateError);
    }

    // Add handoff context message to conversation
    const handoffMessage = {
      role: 'system' as const,
      content: `[HANDOFF] Transferring from ${request.fromAgent} agent to ${request.toAgent} agent. Reason: ${request.reason}. Context: ${JSON.stringify(request.context)}`,
    };

    // Save handoff message
    const { error: messageError } = await env.SUPABASE
      .from('messages')
      .insert({
        conversation_id: request.conversationId,
        role: 'system',
        content: handoffMessage.content,
      });

    if (messageError) {
      // Not critical, but log it
      console.error('Failed to save handoff message:', messageError);
    }

    return {
      success: true,
      message: `Successfully handed off to ${request.toAgent} agent`,
      handoffId: handoff.id,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Handoff failed: ${error.message || 'Unknown error'}`,
    };
  }
}

/**
 * Get handoff history for a conversation
 */
export async function getHandoffHistory(
  conversationId: string,
  env: Env
): Promise<Array<{
  id: string;
  from_agent: string;
  to_agent: string;
  reason: string | null;
  context: Record<string, any>;
  created_at: string;
}>> {
  const { data, error } = await env.SUPABASE
    .from('agent_handoffs')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

