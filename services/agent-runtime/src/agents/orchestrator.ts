/**
 * Multi-Agent Orchestrator
 * 
 * Handles complex queries requiring multiple agents to collaborate.
 * Example: "Find a restaurant near me and book a ride there"
 */

import type { Env, AgentType, ChatMessage } from '../types';
import { Logger, generateTraceId } from '../utils/logging';
import { getAgentByType } from '../utils/tools';
import { OpenAI } from 'openai';
import { routeMessage } from './router';

export interface MultiAgentQuery {
  query: string;
  requiredAgents: AgentType[];
  context?: Record<string, any>;
}

export interface MultiAgentResponse {
  success: boolean;
  results: Record<AgentType, any>;
  synthesized_response: string;
  execution_time_ms: number;
}

/**
 * Identify required agents from a query
 */
export function identifyRequiredAgents(query: string): AgentType[] {
  const agents: AgentType[] = [];
  const lowerQuery = query.toLowerCase();
  
  // Check for mobility intents
  if (
    lowerQuery.includes('ride') ||
    lowerQuery.includes('driver') ||
    lowerQuery.includes('passenger') ||
    lowerQuery.includes('going to') ||
    lowerQuery.includes('pickup') ||
    lowerQuery.includes('dropoff') ||
    lowerQuery.includes('moto') ||
    lowerQuery.includes('taxi')
  ) {
    agents.push('mobility');
  }
  
  // Check for marketplace intents
  if (
    lowerQuery.includes('find') ||
    lowerQuery.includes('buy') ||
    lowerQuery.includes('shop') ||
    lowerQuery.includes('restaurant') ||
    lowerQuery.includes('pharmacy') ||
    lowerQuery.includes('store') ||
    lowerQuery.includes('business') ||
    lowerQuery.includes('vendor')
  ) {
    agents.push('marketplace');
  }
  
  // Check for payment intents
  if (
    lowerQuery.includes('payment') ||
    lowerQuery.includes('qr') ||
    lowerQuery.includes('momo') ||
    lowerQuery.includes('mobile money') ||
    lowerQuery.includes('pay') ||
    lowerQuery.includes('receive payment')
  ) {
    agents.push('payments');
  }
  
  // Support is usually not needed for multi-agent queries
  // (it's for general help, not specific actions)
  
  return [...new Set(agents)]; // Remove duplicates
}

/**
 * Execute multiple agents in parallel or sequence
 */
export async function executeMultiAgentQuery(
  query: string,
  userLocation: { lat: number; lng: number } | undefined,
  userId: string | undefined,
  conversationId: string | undefined,
  env: Env
): Promise<MultiAgentResponse> {
  const startTime = Date.now();
  const traceId = generateTraceId();
  const logger = new Logger(traceId, userId);
  
  logger.info('Starting multi-agent query', { query });
  
  // Identify required agents
  const requiredAgents = identifyRequiredAgents(query);
  
  if (requiredAgents.length === 0) {
    return {
      success: false,
      results: {},
      synthesized_response: 'Could not identify required agents for this query.',
      execution_time_ms: Date.now() - startTime,
    };
  }
  
  if (requiredAgents.length === 1) {
    // Single agent - use standard flow
    logger.info('Single agent identified, using standard flow', { agent: requiredAgents[0] });
    return {
      success: true,
      results: {},
      synthesized_response: 'Use standard single-agent flow for this query.',
      execution_time_ms: Date.now() - startTime,
    };
  }
  
  logger.info('Multi-agent query detected', {
    agents: requiredAgents,
    count: requiredAgents.length,
  });
  
  // Execute agents in parallel
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const agentResults = await Promise.all(
    requiredAgents.map(async (agentType) => {
      const agent = getAgentByType(agentType);
      
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `${agent.systemPrompt}\n\n**Context:** This is part of a multi-agent query. Focus on your specific domain.`,
        },
        {
          role: 'user',
          content: query,
        },
      ];
      
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages as any,
          tools: agent.tools.length > 0 ? agent.tools : undefined,
          tool_choice: agent.tools.length > 0 ? 'auto' : undefined,
          temperature: 0.7,
        });
        
        const message = response.choices[0]?.message;
        return {
          agent: agentType,
          response: message?.content || '',
          tool_calls: message?.tool_calls || [],
        };
      } catch (error: any) {
        logger.error(`Agent ${agentType} execution failed`, error);
        return {
          agent: agentType,
          response: `Error: ${error.message}`,
          tool_calls: [],
        };
      }
    })
  );
  
  // Synthesize results
  const resultsMap: Record<AgentType, any> = {} as any;
  for (const result of agentResults) {
    resultsMap[result.agent] = result;
  }
  
  // Create synthesized response
  const synthesisPrompt = `You are synthesizing results from multiple agents for this query: "${query}"

Agent Results:
${agentResults.map(r => `- ${r.agent}: ${r.response}`).join('\n')}

Create a coherent, helpful response that combines these results.`;

  const synthesisResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You synthesize multi-agent results into a coherent response.' },
      { role: 'user', content: synthesisPrompt },
    ],
    temperature: 0.7,
  });
  
  const synthesizedResponse = synthesisResponse.choices[0]?.message?.content || 'Unable to synthesize response.';
  
  return {
    success: true,
    results: resultsMap,
    synthesized_response: synthesizedResponse,
    execution_time_ms: Date.now() - startTime,
  };
}

/**
 * Check if a query requires multiple agents
 */
export function requiresMultiAgent(query: string): boolean {
  const agents = identifyRequiredAgents(query);
  return agents.length > 1;
}

