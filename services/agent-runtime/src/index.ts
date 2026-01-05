/**
 * Cloudflare Worker Entry Point
 * OpenAI Agents SDK Backend for easyMO Discovery
 */

import { handleMCPServer } from './mcp-server';
import { handleEnhancedMCPServer } from './mcp-server-enhanced';
import { handleChatRequest } from './api/chat';
import { handleUpdateVectorStore } from './cron/update-vector-store';
import { handleRealtimeConnection } from './api/realtime';
import { handleWorkflowExecution, handleWorkflowList } from './api/workflows';
import { handleOAuthAuthorize, handleOAuthCallback } from './auth/oauth';
import { getAppMetadata } from './app-metadata';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // App metadata endpoint (for ChatGPT Apps SDK)
    if (url.pathname === '/app/metadata' && request.method === 'GET') {
      return new Response(
        JSON.stringify(getAppMetadata()),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    
    // OAuth endpoints
    if (url.pathname === '/auth/authorize' && request.method === 'GET') {
      return handleOAuthAuthorize(request, env);
    }
    
    if (url.pathname === '/auth/callback' && request.method === 'GET') {
      return handleOAuthCallback(request, env);
    }
    
    // Route MCP server requests (use enhanced version)
    if (url.pathname.startsWith('/mcp')) {
      return handleEnhancedMCPServer(request, env);
    }

    // Route cron jobs
    if (url.pathname === '/cron/update-vector-store') {
      return handleUpdateVectorStore(request, env);
    }

    // Route Realtime API (WebSocket)
    if (url.pathname === '/api/realtime') {
      return handleRealtimeConnection(request, env);
    }

    // Route workflow execution
    const workflowMatch = url.pathname.match(/^\/api\/workflows\/([^/]+)\/execute$/);
    if (workflowMatch) {
      return handleWorkflowExecution(request, env, workflowMatch[1]);
    }

    // Route workflow list
    if (url.pathname === '/api/workflows') {
      return handleWorkflowList(request, env);
    }

    // Route chat API requests to /api/chat endpoint
    if (url.pathname.startsWith('/api/chat') || url.pathname === '/') {
      // For backward compatibility, also handle root path
      return handleChatRequest(request, env);
    }

    // Fallback for unknown routes
    return new Response('Not Found', { status: 404 });
  },
};

