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
  corsHeaders?: Record<string, string>,
  requestId?: string,
  logger?: Logger,
  tracer?: Tracer,
  rateLimitHeaders?: Record<string, string>
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
    
    // Check if any tool result should generate a widget
    const { generateWidgetFromToolResult } = await import('./utils/widgets');
    let widget = null;
    
    // Try to generate widget from the last tool result (most relevant)
    if (toolResults.length > 0) {
      const lastToolResult = toolResults[toolResults.length - 1];
      const lastToolCall = message.tool_calls?.find(tc => tc.id === lastToolResult.tool_call_id);
      if (lastToolCall) {
        widget = generateWidgetFromToolResult(
          lastToolCall.function.name,
          lastToolResult.content,
          { user_id, user_location, conversation_id }
        );
      }
    }
    
    return new Response(
      JSON.stringify({
        message: finalMessage?.content || '',
        agent_type: agentType,
        conversation_id,
        tool_calls: message.tool_calls,
        tool_results: toolResults,
        ...(widget ? { widget } : {}),
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
  corsHeaders?: Record<string, string>,
  requestId?: string,
  logger?: Logger,
  tracer?: Tracer,
  rateLimitHeaders?: Record<string, string>
): Promise<Response> {
  const startTime = Date.now();
  const loggerInstance = logger || new Logger(requestId || generateRequestId(), user_id);
  const tracerInstance = tracer || new Tracer(requestId || generateRequestId(), user_id, agentType);

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

          const toolResults = await Promise.all(
            toolCalls.map(async (toolCall: any) => {
              const toolName = toolCall.function.name;
              const toolStartTime = Date.now();
              
              try {
                loggerInstance.toolCall(toolName, JSON.parse(toolCall.function.arguments || '{}'));
                
                const result = await tracerInstance.trace(`tool_${toolName}`, async () => {
                  return await executeToolCall(toolCall, agentType, env);
                });

                const toolDuration = Date.now() - toolStartTime;
                loggerInstance.toolResult(toolName, true, toolDuration);
                
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
              } catch (error: any) {
                const toolDuration = Date.now() - toolStartTime;
                loggerInstance.toolResult(toolName, false, toolDuration, error);
                
                // Send error as tool result
                const errorResult = JSON.stringify({
                  error: error.message || 'Tool execution failed',
                  code: (error as any).code || ErrorCode.TOOL_ERROR,
                });
                
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'tool_result',
                      tool_call: toolCall,
                      content: errorResult,
                    })}\n\n`
                  )
                );

                return {
                  role: 'tool' as const,
                  tool_call_id: toolCall.id,
                  name: toolCall.function.name,
                  content: errorResult,
                };
              }
            })
          );

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

          let followupTokenCount = 0;
          for await (const chunk of secondResponse) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              followupTokenCount++;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'token', content: delta.content })}\n\n`)
              );
            }
          }

          tracerInstance.endSpan(secondSpan, undefined, {
            token_count: followupTokenCount,
          });
        }

        // Send completion chunk
        const duration = Date.now() - startTime;
        loggerInstance.response(200, duration, {
          agent_type: agentType,
          stream: true,
          token_count: tokenCount,
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done', agent_type: agentType, conversation_id, request_id: requestId })}\n\n`)
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

