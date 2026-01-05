/**
 * TypeScript types for OpenAI Agents Worker
 * Uses shared types from @easymo/shared
 */

import type { AgentType, Location, ChatMessage, AgentRequest, AgentResponse, StreamingChunk } from '@easymo/shared/types';

// Re-export shared types
export type { AgentType, Location, ChatMessage, AgentRequest, AgentResponse, StreamingChunk };

export interface Env {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GEMINI_API_KEY?: string; // Server-side only, for optional enhancement tools
  GOOGLE_MAPS_API_KEY?: string; // Server-side only, for geocoding/routing
  SERPAPI_API_KEY?: string; // For web search
  // Custom bindings
  DB?: D1Database;
  KV?: KVNamespace; // For rate limiting and caching
  R2?: R2Bucket;
  // Rate limiting config (optional env vars)
  RATE_LIMIT_MAX_REQUESTS?: string; // Default: 100
  RATE_LIMIT_WINDOW_SECONDS?: string; // Default: 60
  // OAuth config (for ChatGPT Apps SDK)
  OAUTH_CLIENT_ID?: string;
  OAUTH_CLIENT_SECRET?: string;
  OAUTH_REDIRECT_URI?: string;
  OAUTH_AUTHORIZATION_URL?: string;
  OAUTH_TOKEN_URL?: string;
  // Worker URL (for OAuth redirects)
  WORKER_URL?: string;
  // Cron secret
  CRON_SECRET?: string;
}

// Legacy types for backward compatibility
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

