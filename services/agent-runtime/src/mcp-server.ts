/**
 * MCP Server for ChatGPT Apps SDK
 * Exposes Worker tools as MCP (Model Context Protocol) resources and tools
 * Provides proper tool execution routing and structured outputs
 */

import type { Env } from './types';
import { executeToolCall } from './utils/tools';
import { mobilityRobustTools } from './tools/mobility-robust';
import { marketplaceRobustTools } from './tools/marketplace-robust';
import { paymentsRobustTools } from './tools/payments-robust';
import { geoRobustTools } from './tools/geo-robust';
import { Logger, generateTraceId } from './utils/logging';

// Combine all tools
const allTools = [
  ...mobilityRobustTools,
  ...marketplaceRobustTools,
  ...paymentsRobustTools,
  ...geoRobustTools,
];

/**
 * Convert OpenAI function tool format to MCP tool format
 */
function convertToolToMCP(tool: any) {
  return {
    name: tool.function.name,
    description: tool.function.description,
    inputSchema: {
      type: 'object',
      ...tool.function.parameters,
    },
    // Safe annotations for ChatGPT Apps SDK
    annotations: {
      requiresLocation: tool.function.name.includes('presence') || 
                       tool.function.name.includes('match') ||
                       tool.function.name.includes('intent') ||
                       tool.function.name.includes('geocode'),
      requiresAuth: true,
      category: getToolCategory(tool.function.name),
    },
  };
}

function getToolCategory(toolName: string): string {
  if (toolName.includes('presence') || toolName.includes('match') || toolName.includes('intent')) {
    return 'mobility';
  }
  if (toolName.includes('listing') || toolName.includes('vendor') || toolName.includes('search')) {
    return 'marketplace';
  }
  if (toolName.includes('momo') || toolName.includes('qr') || toolName.includes('payment')) {
    return 'payments';
  }
  if (toolName.includes('geocode') || toolName.includes('eta')) {
    return 'geo';
  }
  return 'general';
}

/**
 * MCP Server endpoint handler
 */
export async function handleMCPServer(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const traceId = generateTraceId();
  const logger = new Logger(traceId);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-User-Location',
    'X-Trace-ID': traceId,
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // MCP Server capabilities
  if (path === '/mcp/capabilities' && request.method === 'GET') {
    return new Response(
      JSON.stringify({
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: true,
          },
          resources: {
            subscribe: true,
            listChanged: true,
          },
        },
        serverInfo: {
          name: 'easyMO Discovery',
          version: '1.0.0',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // List tools
  if (path === '/mcp/tools' && request.method === 'GET') {
    const mcpTools = allTools.map(convertToolToMCP);

    logger.info('MCP tools listed', { tool_count: mcpTools.length });

    return new Response(JSON.stringify({ tools: mcpTools }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Call tool
  if (path === '/mcp/tools/call' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { name, arguments: args } = body;

      // Extract user context from headers (ChatGPT Apps SDK provides these)
      const userId = request.headers.get('X-User-ID') || undefined;
      const userLocationHeader = request.headers.get('X-User-Location');
      let userLocation: { lat: number; lng: number } | undefined;
      
      if (userLocationHeader) {
        try {
          userLocation = JSON.parse(userLocationHeader);
        } catch {
          // Ignore parse errors
        }
      }

      const clientIP = request.headers.get('CF-Connecting-IP') || 
                       request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                       'unknown';

      logger.info('MCP tool call', {
        tool_name: name,
        user_id: userId,
        has_location: !!userLocation,
      });

      // Find the tool
      const tool = allTools.find(t => t.function.name === name);
      if (!tool) {
        return new Response(
          JSON.stringify({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Tool ${name} not found`,
                  available_tools: allTools.map(t => t.function.name),
                }),
              },
            ],
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Execute tool via the tool execution layer
      const toolCall = {
        id: `mcp-${traceId}`,
        type: 'function' as const,
        function: {
          name,
          arguments: JSON.stringify(args),
        },
      };

      // Determine agent type from tool category
      let agentType: 'mobility' | 'marketplace' | 'payments' | 'support' = 'support';
      const category = getToolCategory(name);
      if (category === 'mobility') agentType = 'mobility';
      else if (category === 'marketplace') agentType = 'marketplace';
      else if (category === 'payments') agentType = 'payments';

      const result = await executeToolCall(
        toolCall,
        agentType,
        env,
        {
          user_id: userId,
          user_location: userLocation,
          user_ip: clientIP,
        }
      );

      // Parse result and format for MCP
      let resultData: any;
      try {
        resultData = JSON.parse(result);
      } catch {
        resultData = { text: result };
      }

      // Check if tool result includes a widget
      let widget = null;
      if (resultData.widget) {
        widget = resultData.widget;
      } else {
        // Try to generate widget from tool result
        try {
          const { generateWidgetFromToolResult } = await import('./utils/widgets');
          widget = generateWidgetFromToolResult(
            name,
            JSON.stringify(resultData),
            { user_id: userId, user_location: userLocation }
          );
        } catch (error) {
          // Widget generation is optional, continue without it
          logger.warn('Widget generation failed', error);
        }
      }

      // Format as structured output for ChatGPT rendering
      const structuredOutput = {
        success: resultData.success !== false,
        ...resultData,
        tool_name: name,
        trace_id: traceId,
        ...(widget ? { widget } : {}),
      };

      logger.info('MCP tool executed', {
        tool_name: name,
        success: structuredOutput.success,
        has_widget: !!widget,
      });

      return new Response(
        JSON.stringify({
          content: [
            {
              type: 'text',
              text: JSON.stringify(structuredOutput),
            },
          ],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      logger.error('MCP tool call error', error, {
        path,
        method: request.method,
      });

      return new Response(
        JSON.stringify({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Tool execution failed',
                trace_id: traceId,
              }),
            },
          ],
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // List resources
  if (path === '/mcp/resources' && request.method === 'GET') {
    const resources = [
      {
        uri: 'easymo://presence',
        name: 'User Presence',
        description: 'Current user presence data (location, role, vehicle type). Coordinates are sanitized to ~100m precision.',
        mimeType: 'application/json',
      },
      {
        uri: 'easymo://trip_intents',
        name: 'Trip Intents',
        description: 'Active trip intents (passenger/driver matching). Expires after 10-15 minutes.',
        mimeType: 'application/json',
      },
      {
        uri: 'easymo://marketplace_listings',
        name: 'Marketplace Listings',
        description: 'Active marketplace listings with location data.',
        mimeType: 'application/json',
      },
    ];

    return new Response(JSON.stringify({ resources }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Read resource
  if (path.startsWith('/mcp/resources/') && request.method === 'GET') {
    // Placeholder - full implementation would fetch from Supabase
    const resourceUri = path.replace('/mcp/resources/', 'easymo://');
    
    return new Response(
      JSON.stringify({
        contents: [
          {
            uri: resourceUri,
            mimeType: 'application/json',
            text: JSON.stringify({
              message: 'Resource data would be fetched from Supabase',
              note: 'This is a placeholder. Full implementation would query Supabase with proper RLS.',
            }),
          },
        ],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Default: 404
  return new Response(JSON.stringify({ error: 'Not found', trace_id: traceId }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
