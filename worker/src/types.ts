/**
 * TypeScript types for OpenAI Agents Worker
 */

export interface Env {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_MAPS_API_KEY?: string;
  // Custom bindings
  DB?: D1Database;
  KV?: KVNamespace;
  R2?: R2Bucket;
}

export type Role = 'passenger' | 'driver' | 'vendor';
export type VehicleType = 'moto' | 'cab' | 'liffan' | 'truck' | 'other' | 'shop';
export type AgentType = 'mobility' | 'marketplace' | 'payments' | 'support' | 'router';

export interface Location {
  lat: number;
  lng: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolResult {
  tool_call_id: string;
  role: 'tool';
  name: string;
  content: string;
}

export interface AgentRequest {
  messages: ChatMessage[];
  agent_type?: AgentType;
  user_id?: string;
  user_location?: Location;
  conversation_id?: string;
  stream?: boolean;
}

export interface AgentResponse {
  message: string;
  agent_type: AgentType;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
  conversation_id?: string;
}

export interface StreamingChunk {
  type: 'token' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  tool_call?: ToolCall;
  tool_result?: ToolResult;
  error?: string;
}

