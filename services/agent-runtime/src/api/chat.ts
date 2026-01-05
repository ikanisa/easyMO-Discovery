/**
 * Chat API endpoint handler
 * Streaming endpoint /api/chat (SSE)
 */

import OpenAI from 'openai';
import type { Env } from '../types';
import { Logger, generateTraceId, generateRequestId } from '../utils/logging';
import { Tracer } from '../utils/tracing';
import { RateLimiter } from '../utils/rateLimit';
import { createErrorResponse, WorkerError, ErrorCode, wrapOpenAIError, withTimeout } from '../utils/errors';
import { routeMessage } from '../agents/router';
import { getAgentByType, executeToolCall } from '../utils/tools';
import type { ChatMessage, AgentType } from '@easymo/shared/types';
import { agentRequestSchema } from '@easymo/shared/schemas';
import { getOrCreateConversation, saveMessage, loadConversationHistory } from '../utils/persistence';
import { createFileSearchTool } from '../tools/file-search';
import { executeToolCallsParallel } from '../utils/parallel-tools';
import { getAllAgentMemories, buildMemoryContext } from '../utils/memory';
import { requiresMultiAgent, executeMultiAgentQuery } from '../agents/orchestrator';

/**
 * Handle chat requests (streaming and non-streaming)
 */
export async function handleChatRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();
  const traceId = generateTraceId();
  const url = new URL(request.url);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Request-ID': traceId,
    'X-Trace-ID': traceId,
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    const logger = new Logger(traceId);
    logger.warn('Method not allowed', { method: request.method, path: url.pathname });
    
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST for chat requests.', trace_id: traceId, request_id: traceId }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get client IP for rate limiting
  const clientIP = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                   'unknown';

  try {
    const body = await request.json();
    
    // Validate request with zod schema
    const validatedBody = agentRequestSchema.parse(body);
    let { messages, agent_type, user_id, user_location, conversation_id, stream = false } = validatedBody;

    // Initialize logger with Supabase integration if configured
    const supabaseLogConfig = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? {
      url: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      enabled: true,
      tableName: 'request_logs',
    } : undefined;
    
    const logger = new Logger(traceId, user_id, supabaseLogConfig);
    const tracer = new Tracer(traceId, user_id, agent_type);

    logger.request(request.method, url.pathname, agent_type, {
      stream,
      message_count: messages?.length || 0,
      has_location: !!user_location,
    });

    // Rate limiting
    const rateLimiter = new RateLimiter(env.KV, {
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS ? parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10) : 100,
      windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS ? parseInt(env.RATE_LIMIT_WINDOW_SECONDS, 10) : 60,
    });

    const rateLimitResult = user_id
      ? await rateLimiter.checkUserLimit(user_id)
      : await rateLimiter.checkIPLimit(clientIP);

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', {
        user_id,
        ip: clientIP,
        limit: rateLimitResult.limit,
        retry_after: rateLimitResult.retryAfter,
      });

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: ErrorCode.RATE_LIMIT_EXCEEDED,
          trace_id: traceId,
          request_id: traceId, // Backward compatibility
          retry_after: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...rateLimiter.getHeaders(rateLimitResult),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Determine agent type (router or direct)
    let agentType: AgentType = agent_type || 'router';
    
    if (agentType === 'router') {
      agentType = await tracer.trace('route_message', async () => {
        try {
          return await withTimeout(routeMessage(messages, openai), 5000, 'Router timeout');
        } catch (error) {
          logger.error('Router failed', error as Error, { messages_count: messages.length });
          throw error;
        }
      });
    }

    logger.info('Agent type determined', { agent_type: agentType });

    // Get or create conversation (if user_id provided)
    let finalConversationId = conversation_id;
    if (user_id) {
      try {
        finalConversationId = await getOrCreateConversation(
          {
            user_id,
            agent_type: agentType,
            title: messages[messages.length - 1]?.content?.substring(0, 50) || 'New conversation',
            channel: 'chat',
          },
          conversation_id,
          env
        );
        
        // Load conversation history if conversation_id was provided
        if (conversation_id) {
          const history = await loadConversationHistory(conversation_id, user_id, env);
          if (history.length > 0) {
            // Prepend history to messages (excluding system message)
            messages = [...history, ...messages];
          }
        }
        
        // Save user message
        await saveMessage({
          conversation_id: finalConversationId,
          role: 'user',
          content: messages[messages.length - 1]?.content || '',
        }, env);
      } catch (error: any) {
        logger.warn('Failed to persist conversation', error);
        // Continue without persistence if it fails
      }
    }

    // Check if query requires multiple agents
    const userMessage = messages[messages.length - 1]?.content || '';
    const needsMultiAgent = requiresMultiAgent(userMessage);
    
    if (needsMultiAgent && agentType === 'router') {
      // Handle multi-agent query
      logger.info('Multi-agent query detected', { query: userMessage });
      
      const multiAgentResult = await executeMultiAgentQuery(
        userMessage,
        user_location,
        user_id,
        finalConversationId,
        env
      );
      
      // Save synthesized response
      if (user_id && finalConversationId) {
        await saveMessage({
          conversation_id: finalConversationId,
          role: 'assistant',
          content: multiAgentResult.synthesized_response,
        }, env);
      }
      
      return new Response(
        JSON.stringify({
          message: multiAgentResult.synthesized_response,
          agent_type: 'multi-agent',
          results: multiAgentResult.results,
          execution_time_ms: multiAgentResult.execution_time_ms,
          request_id: traceId,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    // Get agent configuration
    const agent = getAgentByType(agentType);
    
    // Add file search tool for marketplace agent (if vector store is set up)
    let agentTools = agent.tools;
    if (agentType === 'marketplace') {
      const fileSearchTool = await createFileSearchTool(env);
      if (fileSearchTool) {
        agentTools = [...agent.tools, fileSearchTool];
      }
    }

    // Get agent memories and build context
    let memoryContext = '';
    if (user_id) {
      const memories = await getAllAgentMemories(user_id, agentType, env);
      memoryContext = buildMemoryContext(memories);
    }
    
    // Create agent with dynamic tools and memory context
    const agentWithTools = { 
      ...agent, 
      tools: agentTools,
      systemPrompt: memoryContext ? `${agent.systemPrompt}${memoryContext}` : agent.systemPrompt,
    };
    
    // Handle streaming
    if (stream) {
      return handleStreamingResponse(
        messages,
        agentWithTools,
        agentType,
        openai,
        env,
        user_id,
        user_location,
        finalConversationId,
        corsHeaders,
        traceId,
        logger,
        tracer,
        rateLimiter.getHeaders(rateLimitResult),
        clientIP
      );
    }

    // Handle non-streaming response
    return await handleNonStreamingResponse(
      messages,
      agentWithTools,
      agentType,
      openai,
      env,
      user_id,
      user_location,
      finalConversationId,
      corsHeaders,
      requestId,
      logger,
      tracer,
      rateLimiter.getHeaders(rateLimitResult),
      clientIP
    );

  } catch (error: any) {
    const logger = new Logger(traceId);
    const duration = Date.now() - startTime;
    
    logger.error('Chat request error', error, {
      duration_ms: duration,
      path: url.pathname,
      method: request.method,
    });

    const errorResponse = createErrorResponse(error, requestId);
    
    return new Response(
      JSON.stringify(errorResponse.body),
      {
        status: errorResponse.status,
        headers: {
          ...corsHeaders,
          ...errorResponse.headers,
        },
      }
    );
  }
}

// Import handlers from existing worker code
async function handleNonStreamingResponse(
  messages: ChatMessage[],
  agent: any,
  agentType: AgentType,
  openai: OpenAI,
  env: Env,
  user_id?: string,
  user_location?: { lat: number; lng: number },
  conversation_id?: string,
  corsHeaders?: Record<string, string>,
  requestId?: string,
  logger?: Logger,
  tracer?: Tracer,
  rateLimitHeaders?: Record<string, string>
): Promise<Response> {
  const startTime = Date.now();
    const traceIdForFunction = traceId || generateTraceId();
    const loggerInstance = logger || new Logger(traceIdForFunction, user_id);
    const tracerInstance = tracer || new Tracer(traceIdForFunction, user_id, agentType);

  try {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: agent.systemPrompt,
    };

    const conversationMessages = [systemMessage, ...messages];

    // Call OpenAI with tools
    const openaiSpan = tracerInstance.startSpan('openai_completion', {
      model: 'gpt-4o-mini',
      message_count: conversationMessages.length,
      has_tools: agent.tools.length > 0,
    });

    const response = await tracerInstance.trace('openai_completion', async () => {
      try {
        return await withTimeout(
          openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: conversationMessages as any,
            tools: agent.tools.length > 0 ? agent.tools : undefined,
            tool_choice: agent.tools.length > 0 ? 'auto' : undefined,
            temperature: 0.7,
          }),
          30000, // 30 second timeout
          'OpenAI request timeout'
        );
      } catch (error: any) {
        loggerInstance.error('OpenAI API error', error, { agent_type: agentType });
        throw wrapOpenAIError(error);
      }
    });

    tracerInstance.endSpan(openaiSpan, undefined, {
      usage: response.usage,
    });

    const choice = response.choices[0];
    const message = choice?.message;

    if (!message) {
      loggerInstance.error('No response from OpenAI', undefined, { agent_type: agentType });
      throw new WorkerError(
        'No response from OpenAI',
        ErrorCode.OPENAI_ERROR,
        502,
        true
      );
    }

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      loggerInstance.info('Tool calls detected', {
        tool_count: message.tool_calls.length,
        tool_names: message.tool_calls.map((tc: any) => tc.function.name),
      });

      const toolSpan = tracerInstance.startSpan('tool_execution', {
        tool_count: message.tool_calls.length,
      });

      // Execute tools in parallel where possible
      const toolResults = await tracerInstance.trace('tool_execution_parallel', async () => {
        const parallelResults = await executeToolCallsParallel(
          message.tool_calls as any,
          agentType,
          env,
          {
            conversation_id: finalConversationId,
            messages: conversationMessages,
            user_location,
            user_id,
            user_ip: clientIP,
          }
        );
        
        // Convert to OpenAI tool result format
        return parallelResults.map((tr) => {
          const toolCall = message.tool_calls.find((tc: any) => tc.id === tr.tool_call_id);
          const toolName = toolCall?.function.name || 'unknown';
          
          // Log result
          if (tr.success) {
            loggerInstance.toolResult(toolName, true, tr.latency_ms);
          } else {
            loggerInstance.toolResult(toolName, false, tr.latency_ms);
          }
          
          return {
            role: 'tool' as const,
            tool_call_id: tr.tool_call_id,
            name: toolName,
            content: tr.result,
          };
        });
      });

      tracerInstance.endSpan(toolSpan, undefined, {
        tool_count: toolResults.length,
      });

      // Make a second call with tool results
      const secondSpan = tracerInstance.startSpan('openai_followup', {
        tool_result_count: toolResults.length,
      });

      const secondResponse = await tracerInstance.trace('openai_followup', async () => {
        try {
          return await withTimeout(
            openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                ...conversationMessages,
                message as any,
                ...toolResults,
              ] as any,
              temperature: 0.7,
            }),
            30000,
            'OpenAI followup timeout'
          );
        } catch (error: any) {
          loggerInstance.error('OpenAI followup error', error);
          throw wrapOpenAIError(error);
        }
      });

      tracerInstance.endSpan(secondSpan, undefined, {
        usage: secondResponse.usage,
      });

      const finalMessage = secondResponse.choices[0]?.message;
      
      const duration = Date.now() - startTime;
      loggerInstance.response(200, duration, {
        agent_type: agentType,
        tool_calls: message.tool_calls.length,
      });

      // Save assistant message
      if (user_id && finalConversationId) {
        try {
          await saveMessage({
            conversation_id: finalConversationId,
            role: 'assistant',
            content: finalMessage?.content || '',
            tool_call: message.tool_calls && message.tool_calls.length > 0 ? message.tool_calls[0] : null,
          }, env);
        } catch (error: any) {
          loggerInstance.warn('Failed to save assistant message', error);
        }
      }

      return new Response(
        JSON.stringify({
          message: finalMessage?.content || '',
          agent_type: agentType,
          conversation_id: finalConversationId,
          tool_calls: message.tool_calls,
          tool_results: toolResults,
          trace_id: traceId,
          request_id: traceId, // Backward compatibility
        }),
        {
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

  // No tool calls - direct response
  const duration = Date.now() - startTime;
  loggerInstance.response(200, duration, {
    agent_type: agentType,
  });

  // Save assistant message
  if (user_id && finalConversationId) {
    try {
      await saveMessage({
        conversation_id: finalConversationId,
        role: 'assistant',
        content: message.content || '',
      }, env);
    } catch (error: any) {
      loggerInstance.warn('Failed to save assistant message', error);
    }
  }

  return new Response(
    JSON.stringify({
      message: message.content || '',
      agent_type: agentType,
      conversation_id: finalConversationId,
      request_id: requestId,
    }),
      {
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    loggerInstance.error('Non-streaming response error', error, {
      duration_ms: duration,
      agent_type: agentType,
    });

    const errorResponse = createErrorResponse(error, requestId);
    
    return new Response(
      JSON.stringify(errorResponse.body),
      {
        status: errorResponse.status,
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          ...errorResponse.headers,
        },
      }
    );
  }
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
  corsHeaders?: Record<string, string>,
  requestId?: string,
  logger?: Logger,
  tracer?: Tracer,
  rateLimitHeaders?: Record<string, string>,
  clientIP?: string
): Promise<Response> {
  // Note: conversation_id is already finalConversationId from caller
  const startTime = Date.now();
    const traceIdForFunction = traceId || generateTraceId();
    const loggerInstance = logger || new Logger(traceIdForFunction, user_id);
    const tracerInstance = tracer || new Tracer(traceIdForFunction, user_id, agentType);

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
        loggerInstance.info('Starting streaming response', { agent_type: agentType });

        // Send initial chunk
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'start', agent_type: agentType, request_id: requestId })}\n\n`)
        );

        // Call OpenAI with streaming
        const openaiSpan = tracerInstance.startSpan('openai_streaming', {
          model: 'gpt-4o-mini',
          message_count: conversationMessages.length,
          has_tools: agent.tools.length > 0,
        });

        const response = await tracerInstance.trace('openai_streaming', async () => {
          try {
            return await withTimeout(
              openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: conversationMessages as any,
                tools: agent.tools.length > 0 ? agent.tools : undefined,
                tool_choice: agent.tools.length > 0 ? 'auto' : undefined,
                temperature: 0.7,
                stream: true,
              }),
              60000, // 60 second timeout for streaming
              'OpenAI streaming timeout'
            );
          } catch (error: any) {
            loggerInstance.error('OpenAI streaming error', error, { agent_type: agentType });
            throw wrapOpenAIError(error);
          }
        });

        let fullContent = '';
        let toolCalls: any[] = [];
        let tokenCount = 0;

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;
          
          if (delta?.content) {
            fullContent += delta.content;
            tokenCount++;
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

        tracerInstance.endSpan(openaiSpan, undefined, {
          token_count: tokenCount,
          tool_call_count: toolCalls.length,
        });

        // Execute tool calls if any
        if (toolCalls.length > 0) {
          loggerInstance.info('Tool calls detected in streaming', {
            tool_count: toolCalls.length,
            tool_names: toolCalls.map(tc => tc.function.name),
          });

          const toolSpan = tracerInstance.startSpan('tool_execution_streaming', {
            tool_count: toolCalls.length,
          });

          // Execute tools in parallel where possible
          const toolResults = await tracerInstance.trace('tool_execution_parallel_streaming', async () => {
            const parallelResults = await executeToolCallsParallel(
              toolCalls as any,
              agentType,
              env,
              {
                conversation_id,
                messages: conversationMessages,
                user_location,
                user_id,
                user_ip: clientIP || 'unknown',
              }
            );
            
            // Send tool results as they complete (for streaming)
            parallelResults.forEach((tr) => {
              const toolCall = toolCalls.find((tc: any) => tc.id === tr.tool_call_id);
              if (toolCall) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'tool_result',
                      tool_call: toolCall,
                      content: tr.result,
                    })}\n\n`
                  )
                );
              }
            });
            
            // Convert to OpenAI tool result format
            return parallelResults.map((tr) => {
              const toolCall = toolCalls.find((tc: any) => tc.id === tr.tool_call_id);
              const toolName = toolCall?.function.name || 'unknown';
              
              // Log result
              if (tr.success) {
                loggerInstance.toolResult(toolName, true, tr.latency_ms);
              } else {
                loggerInstance.toolResult(toolName, false, tr.latency_ms);
              }
              
              return {
                role: 'tool' as const,
                tool_call_id: tr.tool_call_id,
                name: toolName,
                content: tr.result,
              };
            });
          });

          tracerInstance.endSpan(toolSpan, undefined, {
            tool_count: toolResults.length,
          });

          // Make second streaming call with tool results
          const secondSpan = tracerInstance.startSpan('openai_followup_streaming', {
            tool_result_count: toolResults.length,
          });

          const secondResponse = await tracerInstance.trace('openai_followup_streaming', async () => {
            try {
              return await withTimeout(
                openai.chat.completions.create({
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
                }),
                60000,
                'OpenAI followup streaming timeout'
              );
            } catch (error: any) {
              loggerInstance.error('OpenAI followup streaming error', error);
              throw wrapOpenAIError(error);
            }
          });

          let followupContent = '';
          let followupTokenCount = 0;
          for await (const chunk of secondResponse) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              followupContent += delta.content;
              followupTokenCount++;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'token', content: delta.content })}\n\n`)
              );
            }
          }

          tracerInstance.endSpan(secondSpan, undefined, {
            token_count: followupTokenCount,
          });

          // Save assistant message with followup content
          if (user_id && conversation_id) {
            try {
              await saveMessage({
                conversation_id,
                role: 'assistant',
                content: followupContent,
                tool_call: toolCalls.length > 0 ? toolCalls[0] : null,
              }, env);
            } catch (error: any) {
              loggerInstance.warn('Failed to save assistant message', error);
            }
          }

          // Parse tool results for structured output
          let structuredOutput: any = null;
          if (toolResults && toolResults.length > 0) {
            try {
              structuredOutput = toolResults.map((tr: any) => {
                try {
                  return JSON.parse(tr.content);
                } catch {
                  return { raw: tr.content };
                }
              });
            } catch {
              // Ignore parsing errors
            }
          }

          // Send completion chunk with structured output
          const duration = Date.now() - startTime;
          loggerInstance.response(200, duration, {
            agent_type: agentType,
            stream: true,
            token_count: tokenCount + followupTokenCount,
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'done', 
              agent_type: agentType, 
              conversation_id, 
              trace_id: traceId,
          request_id: traceId, // Backward compatibility
              structured_output: structuredOutput,
            })}\n\n`)
          );
        } else {
          // No tool calls - save assistant message
          if (user_id && conversation_id) {
            try {
              await saveMessage({
                conversation_id,
                role: 'assistant',
                content: fullContent,
              }, env);
            } catch (error: any) {
              loggerInstance.warn('Failed to save assistant message', error);
            }
          }
        }

        // Save assistant message
        if (user_id && conversation_id) {
          try {
            await saveMessage({
              conversation_id,
              role: 'assistant',
              content: finalAssistantContent,
              tool_call: toolCalls.length > 0 ? toolCalls[0] : null,
            }, env);
          } catch (error: any) {
            loggerInstance.warn('Failed to save assistant message', error);
          }
        }

        // Send completion chunk with structured output
        const duration = Date.now() - startTime;
        loggerInstance.response(200, duration, {
          agent_type: agentType,
          stream: true,
          token_count: tokenCount,
        });

        // Parse tool results for structured output
        let structuredOutput: any = null;
        if (toolResults && toolResults.length > 0) {
          try {
            structuredOutput = toolResults.map((tr: any) => {
              try {
                return JSON.parse(tr.content);
              } catch {
                return { raw: tr.content };
              }
            });
          } catch {
            // Ignore parsing errors
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'done', 
            agent_type: agentType, 
            conversation_id, 
            trace_id: traceId,
            request_id: traceId, // Backward compatibility
            structured_output: structuredOutput,
          })}\n\n`)
        );

      } catch (error: any) {
        const duration = Date.now() - startTime;
        loggerInstance.error('Streaming error', error, {
          duration_ms: duration,
          agent_type: agentType,
        });

        const errorMessage = error instanceof WorkerError ? error.message : error.message || 'Streaming error';
        const errorCode = error instanceof WorkerError ? error.code : ErrorCode.INTERNAL_ERROR;

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage, code: errorCode, request_id: requestId })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      ...rateLimitHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

