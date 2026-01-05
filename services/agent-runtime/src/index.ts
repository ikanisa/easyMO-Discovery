/**
 * Cloudflare Worker Entry Point
 * OpenAI Agents SDK Backend for easyMO Discovery
 */

import { handleMCPServer } from './mcp-server';
import { handleChatRequest } from './api/chat';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Route MCP server requests
    if (url.pathname.startsWith('/mcp')) {
      return handleMCPServer(request, env);
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

