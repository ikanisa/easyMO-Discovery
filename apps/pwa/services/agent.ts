/**
 * Agent Service - Client for OpenAI Agents SDK Worker
 * Handles streaming and non-streaming responses from Cloudflare Worker
 */

import type { Message, Location, ChatSession as ChatSessionType } from '@easymo/shared/types';
import { CONFIG } from '../config';

export type AgentType = 'mobility' | 'marketplace' | 'payments' | 'support' | 'router';

export interface AgentRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  agent_type?: AgentType;
  user_id?: string;
  user_location?: Location;
  conversation_id?: string;
  stream?: boolean;
}

export interface AgentResponse {
  message: string;
  agent_type: AgentType;
  conversation_id?: string;
  tool_calls?: any[];
  tool_results?: any[];
}

export interface StreamingChunk {
  type: 'start' | 'token' | 'tool_call' | 'tool_result' | 'widget' | 'done' | 'error';
  content?: string;
  tool_call?: any; // Present in tool_call chunks
  tool_result?: any; // Content of tool result (JSON string)
  widget?: any; // ChatKit widget definition
  agent_type?: AgentType;
  conversation_id?: string;
  request_id?: string;
  structured_output?: any; // Parsed tool results for UI cards
  error?: string;
  code?: string;
}

// Worker URL - set via environment variable or config
const WORKER_URL = import.meta.env.VITE_WORKER_URL || CONFIG.WORKER_URL || '';

if (!WORKER_URL && import.meta.env.MODE === 'production') {
  console.warn('VITE_WORKER_URL not set. Agent features will not work.');
}

/**
 * Map ChatSession type to Agent type
 */
export function mapSessionTypeToAgentType(sessionType: string): AgentType {
  switch (sessionType) {
    case 'mobility':
      return 'mobility';
    case 'business':
    case 'real_estate':
      return 'marketplace';
    case 'support':
    case 'legal':
      return 'support';
    default:
      return 'router'; // Let router decide
  }
}

export const AgentService = {
  /**
   * Send a message to the agent worker (non-streaming)
   */
  async chat(
    messages: Message[],
    agentType: AgentType = 'router',
    userId?: string,
    userLocation?: Location,
    conversationId?: string
  ): Promise<AgentResponse> {
    if (!WORKER_URL) {
      throw new Error('Worker URL not configured. Set VITE_WORKER_URL environment variable.');
    }

    const request: AgentRequest = {
      messages: messages.map(m => ({
        role: m.sender === 'user' ? 'user' : m.sender === 'ai' ? 'assistant' : 'system',
        content: m.text,
      })),
      agent_type: agentType,
      user_id: userId,
      user_location: userLocation,
      conversation_id: conversationId,
      stream: false,
    };

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || `Worker error: ${response.status}`);
      }

      const data: AgentResponse = await response.json();
      return data;
    } catch (error: any) {
      console.error('Agent service error:', error);
      throw error;
    }
  },

  /**
   * Send a message to the agent worker (streaming via SSE)
   */
  async *chatStream(
    messages: Message[],
    agentType: AgentType = 'router',
    userId?: string,
    userLocation?: Location,
    conversationId?: string
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    if (!WORKER_URL) {
      throw new Error('Worker URL not configured. Set VITE_WORKER_URL environment variable.');
    }

    const request: AgentRequest = {
      messages: messages.map(m => ({
        role: m.sender === 'user' ? 'user' : m.sender === 'ai' ? 'assistant' : 'system',
        content: m.text,
      })),
      agent_type: agentType,
      user_id: userId,
      user_location: userLocation,
      conversation_id: conversationId,
      stream: true,
    };

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || `Worker error: ${response.status}`);
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data as StreamingChunk;
            } catch (e) {
              console.warn('Failed to parse SSE chunk:', e);
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim() && buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6));
          yield data as StreamingChunk;
        } catch (e) {
          console.warn('Failed to parse final SSE chunk:', e);
        }
      }
    } catch (error: any) {
      console.error('Agent service streaming error:', error);
      yield {
        type: 'error',
        error: error.message || 'Streaming failed',
      };
    }
  },
};

