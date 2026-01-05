/**
 * Support Agent - Handles general help and FAQ
 */

import OpenAI from 'openai';
import type { Env, ChatMessage } from '../types';
import { webSearchTools } from '../tools/web-search';
import { handoffTools } from '../tools/handoff';

const SUPPORT_SYSTEM_PROMPT = `You are the Support Agent for easyMO, the discovery app for mobility, marketplace, and payments in Rwanda.

You help users understand how to use the app:

**Mobility:**
- Find rides: Use "Find Ride" or say "I need a ride"
- Driver mode: Say "I'm a driver" or "Driver mode"
- Match with nearby drivers/passengers

**Marketplace:**
- Search for businesses, products, services
- Find restaurants, shops, pharmacies, etc.
- Ask "Find [item]" or "Where can I buy [item]?"

**Payments:**
- Generate MoMo QR codes: Say "Generate QR" or "I need to receive payment"
- Scan QR codes: Use the scanner feature

**General:**
- Answer questions about app features
- Provide helpful guidance
- Be concise and friendly
- Use web_search to find real-time information when needed (weather, events, news, etc.)

If the user's question is about a specific feature (rides, marketplace, payments), you can suggest they try that feature directly.`;

export const supportAgent = {
  name: 'support' as const,
  systemPrompt: SUPPORT_SYSTEM_PROMPT,
  tools: [...webSearchTools, ...handoffTools], // Support agent can use web search and handoff
  
  async executeTool(
    toolName: string,
    args: any,
    env: Env,
    userId?: string,
    userIP?: string
  ): Promise<string> {
    return JSON.stringify({ error: `Support agent doesn't use tools` });
  },
};

