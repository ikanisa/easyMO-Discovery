/**
 * Agent Memory Utilities
 * 
 * Stores and retrieves user preferences and patterns for each agent type.
 * This allows agents to remember user preferences across conversations.
 */

import type { Env, AgentType } from '../types';

export interface MemoryValue {
  [key: string]: any;
}

/**
 * Get agent memory for a user
 * 
 * @param userId - User ID
 * @param agentType - Agent type
 * @param key - Memory key
 * @param env - Environment variables
 * @returns Memory value or null if not found
 */
export async function getAgentMemory(
  userId: string,
  agentType: AgentType,
  key: string,
  env: Env
): Promise<MemoryValue | null> {
  try {
    const { data, error } = await env.SUPABASE
      .from('agent_memory')
      .select('value, confidence')
      .eq('user_id', userId)
      .eq('agent_type', agentType)
      .eq('key', key)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data.value as MemoryValue;
  } catch (error) {
    console.error('Failed to get agent memory:', error);
    return null;
  }
}

/**
 * Set agent memory for a user
 * 
 * @param userId - User ID
 * @param agentType - Agent type
 * @param key - Memory key
 * @param value - Memory value
 * @param confidence - Confidence score (0.0 to 1.0, default: 1.0)
 * @param env - Environment variables
 */
export async function setAgentMemory(
  userId: string,
  agentType: AgentType,
  key: string,
  value: MemoryValue,
  confidence: number = 1.0,
  env: Env
): Promise<void> {
  try {
    await env.SUPABASE
      .from('agent_memory')
      .upsert({
        user_id: userId,
        agent_type: agentType,
        key,
        value,
        confidence: Math.max(0.0, Math.min(1.0, confidence)), // Clamp to 0-1
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,agent_type,key',
      });
  } catch (error) {
    console.error('Failed to set agent memory:', error);
    throw error;
  }
}

/**
 * Get all memories for a user and agent type
 * 
 * @param userId - User ID
 * @param agentType - Agent type
 * @param env - Environment variables
 * @returns Map of memory keys to values
 */
export async function getAllAgentMemories(
  userId: string,
  agentType: AgentType,
  env: Env
): Promise<Map<string, MemoryValue>> {
  try {
    const { data, error } = await env.SUPABASE
      .from('agent_memory')
      .select('key, value, confidence')
      .eq('user_id', userId)
      .eq('agent_type', agentType)
      .order('confidence', { ascending: false }); // Higher confidence first
    
    if (error || !data) {
      return new Map();
    }
    
    const memoryMap = new Map<string, MemoryValue>();
    for (const item of data) {
      memoryMap.set(item.key, item.value as MemoryValue);
    }
    
    return memoryMap;
  } catch (error) {
    console.error('Failed to get all agent memories:', error);
    return new Map();
  }
}

/**
 * Delete agent memory
 * 
 * @param userId - User ID
 * @param agentType - Agent type
 * @param key - Memory key
 * @param env - Environment variables
 */
export async function deleteAgentMemory(
  userId: string,
  agentType: AgentType,
  key: string,
  env: Env
): Promise<void> {
  try {
    await env.SUPABASE
      .from('agent_memory')
      .delete()
      .eq('user_id', userId)
      .eq('agent_type', agentType)
      .eq('key', key);
  } catch (error) {
    console.error('Failed to delete agent memory:', error);
    throw error;
  }
}

/**
 * Build memory context string for agent system prompt
 * 
 * @param memories - Map of memory keys to values
 * @returns Formatted string for system prompt
 */
export function buildMemoryContext(memories: Map<string, MemoryValue>): string {
  if (memories.size === 0) {
    return '';
  }
  
  const memoryLines: string[] = [];
  memoryLines.push('\n**User Preferences (from previous conversations):**');
  
  for (const [key, value] of memories.entries()) {
    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const formattedValue = typeof value === 'object' 
      ? JSON.stringify(value, null, 2)
      : String(value);
    memoryLines.push(`- ${formattedKey}: ${formattedValue}`);
  }
  
  return memoryLines.join('\n');
}

/**
 * Extract and save memory from conversation
 * 
 * This is a helper that can be called after tool execution to extract
 * user preferences from the conversation and save them.
 * 
 * Example: If user says "I prefer moto taxis", extract and save:
 * - key: "preferred_vehicle_type"
 * - value: { type: "moto", reason: "user preference" }
 * 
 * @param userId - User ID
 * @param agentType - Agent type
 * @param extractedMemories - Map of memory keys to values
 * @param env - Environment variables
 */
export async function saveExtractedMemories(
  userId: string,
  agentType: AgentType,
  extractedMemories: Map<string, { value: MemoryValue; confidence?: number }>,
  env: Env
): Promise<void> {
  const promises = Array.from(extractedMemories.entries()).map(([key, { value, confidence = 1.0 }]) =>
    setAgentMemory(userId, agentType, key, value, confidence, env)
  );
  
  await Promise.all(promises);
}

