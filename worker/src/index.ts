/**
 * Cloudflare Worker Entry Point
 * OpenAI Agents SDK Backend for easyMO Discovery
 */

import OpenAI from 'openai';
import type { Env, AgentRequest, StreamingChunk, ChatMessage, ToolCall, AgentType } from './types';
import { routeMessage } from './agents/router';
import { getAgentByType, executeToolCall } from './utils/tools';
import { handleMCPServer } from './mcp-server';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Route MCP server requests
    if (url.pathname.startsWith('/mcp')) {
      return handleMCPServer(request, env);
    }
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST for chat requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST for chat requests.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const body: AgentRequest = await request.json();
      const { messages, agent_type, user_id, user_location, conversation_id, stream = false } = body;

      if (!messages || messages.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Messages are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });

      // Determine agent type (router or direct)
      let agentType: AgentType = agent_type || 'router';
      
      if (agentType === 'router') {
        agentType = await routeMessage(messages, openai);
      }

      // Get agent configuration
      const agent = getAgentByType(agentType);

      // Handle streaming
      if (stream) {
        return handleStreamingResponse(
          messages,
          agent,
          agentType,
          openai,
          env,
          user_id,
          user_location,
          conversation_id,
          corsHeaders
        );
      }

      // Handle non-streaming response
      return await handleNonStreamingResponse(
        messages,
        agent,
        agentType,
        openai,
        env,
        user_id,
        user_location,
        conversation_id,
        corsHeaders
      );

    } catch (error: any) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};

async function handleNonStreamingResponse(
  messages: ChatMessage[],
  agent: any,
  agentType: AgentType,
  openai: OpenAI,
  env: Env,
  user_id?: string,
  user_location?: { lat: number; lng: number },
  conversation_id?: string,
  corsHeaders?: Record<string, string>
): Promise<Response> {
  const systemMessage: ChatMessage = {
    role: 'system',
    content: agent.systemPrompt,
  };

  const conversationMessages = [systemMessage, ...messages];

  // Call OpenAI with tools
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: conversationMessages as any,
    tools: agent.tools.length > 0 ? agent.tools : undefined,
    tool_choice: agent.tools.length > 0 ? 'auto' : undefined,
    temperature: 0.7,
  });

  const choice = response.choices[0];
  const message = choice?.message;

  if (!message) {
    return new Response(
      JSON.stringify({ error: 'No response from OpenAI' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Handle tool calls
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolResults = await Promise.all(
      message.tool_calls.map(async (toolCall: any) => {
        const result = await executeToolCall(toolCall, agentType, env);
        return {
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: result,
        };
      })
    );

    // Make a second call with tool results
    const secondResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        ...conversationMessages,
        message as any,
        ...toolResults,
      ] as any,
      temperature: 0.7,
    });

    const finalMessage = secondResponse.choices[0]?.message;
    
    return new Response(
      JSON.stringify({
        message: finalMessage?.content || '',
        agent_type: agentType,
        conversation_id,
        tool_calls: message.tool_calls,
        tool_results: toolResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // No tool calls - direct response
  return new Response(
    JSON.stringify({
      message: message.content || '',
      agent_type: agentType,
      conversation_id,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleStreamingResponse(
  messages: ChatMessage[],
  agent: any,
  agentType: AgentType,
  openai: OpenAI,
  env: Env,
  user_id?: string,
  user_location?: { lat: number; lng: number },
  conversation_id?: string,
  corsHeaders?: Record<string, string>
): Promise<Response> {
  const systemMessage: ChatMessage = {
    role: 'system',
    content: agent.systemPrompt,
  };

  const conversationMessages = [systemMessage, ...messages];

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // Send initial chunk
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'start', agent_type: agentType })}\n\n`)
        );

        // Call OpenAI with streaming
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: conversationMessages as any,
          tools: agent.tools.length > 0 ? agent.tools : undefined,
          tool_choice: agent.tools.length > 0 ? 'auto' : undefined,
          temperature: 0.7,
          stream: true,
        });

        let fullContent = '';
        let toolCalls: any[] = [];

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;
          
          if (delta?.content) {
            fullContent += delta.content;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'token', content: delta.content })}\n\n`)
            );
          }

          if (delta?.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              const index = toolCallDelta.index || 0;
              if (!toolCalls[index]) {
                toolCalls[index] = {
                  id: toolCallDelta.id || '',
                  type: 'function',
                  function: {
                    name: toolCallDelta.function?.name || '',
                    arguments: toolCallDelta.function?.arguments || '',
                  },
                };
              } else {
                toolCalls[index].function.arguments += toolCallDelta.function?.arguments || '';
              }
            }
          }
        }

        // Execute tool calls if any
        if (toolCalls.length > 0) {
          const toolResults = await Promise.all(
            toolCalls.map(async (toolCall: any) => {
              const result = await executeToolCall(toolCall, agentType, env);
              
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'tool_result',
                    tool_call: toolCall,
                    content: result,
                  })}\n\n`
                )
              );

              return {
                role: 'tool' as const,
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: result,
              };
            })
          );

          // Make second streaming call with tool results
          const secondResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              ...conversationMessages,
              {
                role: 'assistant',
                content: fullContent,
                tool_calls: toolCalls,
              },
              ...toolResults,
            ] as any,
            temperature: 0.7,
            stream: true,
          });

          for await (const chunk of secondResponse) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'token', content: delta.content })}\n\n`)
              );
            }
          }
        }

        // Send completion chunk
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done', agent_type: agentType, conversation_id })}\n\n`)
        );

      } catch (error: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

