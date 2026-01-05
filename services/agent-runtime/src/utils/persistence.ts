/**
 * Persistence utilities for conversations, messages, and tool traces
 */

import type { Env } from '../types';
import { createSupabaseClient } from './supabase';
import type { ChatMessage } from '@easymo/shared/types';

export interface ConversationData {
  user_id: string;
  agent_type: string;
  title?: string;
  channel?: string;
}

export interface MessageData {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_call?: any;
}

export interface ToolTraceData {
  conversation_id: string;
  tool_name: string;
  input: any;
  output?: any;
  latency_ms: number;
  ok: boolean;
  error_message?: string;
}

/**
 * Create or get conversation
 */
export async function getOrCreateConversation(
  data: ConversationData,
  conversation_id: string | undefined,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  if (conversation_id) {
    // Verify conversation exists and belongs to user
    const { data: existing, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('user_id', data.user_id)
      .single();
    
    if (!error && existing) {
      return conversation_id;
    }
  }
  
  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      user_id: data.user_id,
      agent_type: data.agent_type,
      title: data.title,
      channel: data.channel || 'chat',
    })
    .select('id')
    .single();
  
  if (error || !newConv) {
    throw new Error(`Failed to create conversation: ${error?.message || 'Unknown error'}`);
  }
  
  return newConv.id;
}

/**
 * Save message to conversation
 */
export async function saveMessage(
  data: MessageData,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: data.conversation_id,
      role: data.role,
      content: data.content,
      tool_call: data.tool_call || null,
    })
    .select('id')
    .single();
  
  if (error || !message) {
    throw new Error(`Failed to save message: ${error?.message || 'Unknown error'}`);
  }
  
  return message.id;
}

/**
 * Save tool trace
 */
export async function saveToolTrace(
  data: ToolTraceData,
  env: Env
): Promise<void> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { error } = await supabase
    .from('tool_traces')
    .insert({
      conversation_id: data.conversation_id,
      tool_name: data.tool_name,
      input: data.input,
      output: data.output,
      latency_ms: data.latency_ms,
      ok: data.ok,
      error_message: data.error_message || null,
    });
  
  if (error) {
    // Log but don't throw - tool traces are non-critical
    console.error('Failed to save tool trace:', error);
  }
}

/**
 * Load conversation history
 */
export async function loadConversationHistory(
  conversation_id: string,
  user_id: string,
  env: Env,
  limit: number = 50
): Promise<ChatMessage[]> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  // Verify conversation belongs to user
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversation_id)
    .eq('user_id', user_id)
    .single();
  
  if (convError || !conv) {
    return [];
  }
  
  // Load messages
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })
    .limit(limit);
  
  if (error || !messages) {
    return [];
  }
  
  // Convert to ChatMessage format
  return messages.map((m: any) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    tool_calls: m.tool_call ? [m.tool_call] : undefined,
  }));
}

