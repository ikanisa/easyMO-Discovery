/**
 * Router Agent - Orchestrates sub-agents based on user intent
 */

import OpenAI from 'openai';
import type { Env, AgentType, ChatMessage } from '../types';

const ROUTER_SYSTEM_PROMPT = `You are the Router Agent for easyMO, a mobility, marketplace, and payments app for Rwanda.

Your job is to analyze user messages and route them to the appropriate specialized agent:

1. **mobility** - For ride requests, driver availability, finding nearby drivers/passengers, trip planning
   Examples: "I need a ride", "Find nearby drivers", "I'm a driver, I'm available", "going to Kigali"

2. **marketplace** - For finding businesses, products, services, restaurants, shops
   Examples: "Find hardware stores", "Where can I buy a phone?", "Restaurants nearby", "Pharmacies"

3. **payments** - For Mobile Money (MoMo) QR codes, payment requests, QR scanning
   Examples: "Generate MoMo QR", "I need to receive payment", "Scan QR code", "Payment code"

4. **support** - For general help, FAQ, app usage questions
   Examples: "How do I use this app?", "Help", "What can you do?", general questions

Rules:
- Be decisive - choose ONE agent per message
- Default to "marketplace" for ambiguous queries about products/services
- Default to "support" for general questions
- Return ONLY the agent type name: "mobility", "marketplace", "payments", or "support"
`;

export async function routeMessage(
  messages: ChatMessage[],
  openai: OpenAI
): Promise<AgentType> {
  const userMessage = messages[messages.length - 1]?.content || '';
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ROUTER_SYSTEM_PROMPT },
        { role: 'user', content: `Route this message to the appropriate agent: "${userMessage}"` },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });
    
    const agentType = response.choices[0]?.message?.content?.trim().toLowerCase();
    
    // Validate and return agent type
    if (agentType === 'mobility' || agentType === 'marketplace' || agentType === 'payments' || agentType === 'support') {
      return agentType;
    }
    
    // Default fallback
    return 'support';
  } catch (error) {
    console.error('Router error:', error);
    return 'support'; // Safe fallback
  }
}

