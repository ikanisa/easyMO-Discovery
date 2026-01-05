/**
 * Web Search Tool - Enables agents to search the web for real-time information
 * 
 * This tool uses OpenAI's built-in web_search capability to fetch real-time
 * information from the internet, such as weather, events, news, business hours, etc.
 */

import type { Env } from '../types';

/**
 * Creates a web_search tool that can be added to agent tool arrays.
 * 
 * OpenAI handles web search internally - no additional configuration needed.
 * The agent can use this tool to answer questions like:
 * - "What's the weather in Kigali today?"
 * - "Are there any events happening this weekend?"
 * - "What are the business hours for [business name]?"
 * 
 * @param env - Environment variables (not used, but kept for consistency)
 * @returns Web search tool definition
 */
export function createWebSearchTool(env: Env) {
  return {
    type: 'web_search' as const,
    web_search: {
      // OpenAI handles web search internally
      // No additional configuration needed
    },
  };
}

/**
 * Array of web search tools (for convenience when adding to agents)
 */
export const webSearchTools = [
  {
    type: 'web_search' as const,
    web_search: {},
  },
];

