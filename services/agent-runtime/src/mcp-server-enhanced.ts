/**
 * Enhanced MCP Server for ChatGPT Apps SDK
 * 
 * Optimized per OpenAI Apps SDK guidelines:
 * - Clear, focused tool descriptions
 * - Privacy by design
 * - Structured outputs
 * - State management
 * - Error handling
 * - Ecosystem-friendly design
 * 
 * Based on: https://developers.openai.com/apps-sdk/build/mcp-server
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
 * Enhanced tool metadata per OpenAI Apps SDK guidelines
 * 
 * Principles:
 * - Clear, descriptive names
 * - Well-documented parameters
 * - Privacy-conscious
 * - Structured outputs
 * - Ecosystem-friendly
 */
interface EnhancedToolMetadata {
  name: string;
  description: string;
  inputSchema: any;
  annotations: {
    category: string;
    requiresLocation?: boolean;
    requiresAuth?: boolean;
    privacyLevel?: 'public' | 'user' | 'sensitive';
    outputFormat?: 'structured' | 'text' | 'mixed';
    ecosystemFriendly?: boolean;
  };
}

/**
 * Convert OpenAI function tool to enhanced MCP format
 */
function convertToolToEnhancedMCP(tool: any): EnhancedToolMetadata {
  const toolName = tool.function.name;
  const category = getToolCategory(toolName);
  
  // Enhanced description based on OpenAI guidelines
  const enhancedDescription = enhanceToolDescription(
    tool.function.description || '',
    toolName,
    category
  );
  
  // Privacy level assessment
  const privacyLevel = assessPrivacyLevel(toolName, tool.function.parameters);
  
  return {
    name: toolName,
    description: enhancedDescription,
    inputSchema: {
      type: 'object',
      ...tool.function.parameters,
      // Add parameter descriptions if missing
      ...(tool.function.parameters?.properties ? {
        properties: enhanceParameterDescriptions(tool.function.parameters.properties),
      } : {}),
    },
    annotations: {
      category,
      requiresLocation: toolName.includes('presence') || 
                       toolName.includes('match') ||
                       toolName.includes('intent') ||
                       toolName.includes('geocode') ||
                       toolName.includes('eta'),
      requiresAuth: true, // All tools require user authentication
      privacyLevel,
      outputFormat: 'structured', // All tools return structured JSON
      ecosystemFriendly: true, // All tools designed to be chainable
    },
  };
}

/**
 * Enhance tool description per OpenAI Apps SDK guidelines
 * 
 * Guidelines:
 * - Clear about what the tool does
 * - When to use it
 * - What it returns
 * - Privacy considerations
 */
function enhanceToolDescription(
  originalDescription: string,
  toolName: string,
  category: string
): string {
  // Base description
  let enhanced = originalDescription;
  
  // Add category context
  const categoryContext: Record<string, string> = {
    mobility: 'Mobility services for ride matching and transportation in Rwanda.',
    marketplace: 'Marketplace services for finding and listing businesses, products, and services.',
    payments: 'Payment services for Mobile Money (Momo) and QR code payments in Rwanda.',
    geo: 'Geocoding and location services for addresses and ETA calculations.',
  };
  
  if (categoryContext[category]) {
    enhanced = `${enhanced} ${categoryContext[category]}`;
  }
  
  // Add privacy note for location-based tools
  if (toolName.includes('location') || toolName.includes('presence') || toolName.includes('geocode')) {
    enhanced += ' Location data is sanitized to ~100m precision for privacy.';
  }
  
  // Add output format note
  enhanced += ' Returns structured JSON data suitable for further processing.';
  
  return enhanced;
}

/**
 * Enhance parameter descriptions
 */
function enhanceParameterDescriptions(properties: any): any {
  const enhanced: any = {};
  
  for (const [key, value] of Object.entries(properties)) {
    const param = value as any;
    enhanced[key] = {
      ...param,
      description: param.description || getDefaultParameterDescription(key),
    };
  }
  
  return enhanced;
}

/**
 * Get default parameter description
 */
function getDefaultParameterDescription(paramName: string): string {
  const defaults: Record<string, string> = {
    user_id: 'Unique identifier for the user (UUID format)',
    location: 'Geographic coordinates with latitude and longitude',
    lat: 'Latitude coordinate (-90 to 90)',
    lng: 'Longitude coordinate (-180 to 180)',
    query: 'Search query string',
    category: 'Category or type filter',
    radius_km: 'Search radius in kilometers',
  };
  
  return defaults[paramName] || `Parameter: ${paramName}`;
}

/**
 * Assess privacy level of a tool
 */
function assessPrivacyLevel(toolName: string, parameters: any): 'public' | 'user' | 'sensitive' {
  // Tools that access user-specific data
  if (toolName.includes('presence') || 
      toolName.includes('user') ||
      toolName.includes('account')) {
    return 'user';
  }
  
  // Tools that handle sensitive operations
  if (toolName.includes('payment') ||
      toolName.includes('momo') ||
      toolName.includes('qr')) {
    return 'sensitive';
  }
  
  // Public tools (search, listings, etc.)
  return 'public';
}

/**
 * Get tool category
 */
function getToolCategory(toolName: string): string {
  if (toolName.includes('presence') || toolName.includes('match') || toolName.includes('intent') || toolName.includes('ride')) {
    return 'mobility';
  }
  if (toolName.includes('listing') || toolName.includes('vendor') || toolName.includes('search') || toolName.includes('business')) {
    return 'marketplace';
  }
  if (toolName.includes('momo') || toolName.includes('qr') || toolName.includes('payment')) {
    return 'payments';
  }
  if (toolName.includes('geocode') || toolName.includes('eta') || toolName.includes('location')) {
    return 'geo';
  }
  return 'general';
}

/**
 * State management for ChatGPT Apps
 * 
 * Per OpenAI guidelines: https://developers.openai.com/apps-sdk/build/state-management
 */
interface AppState {
  sessionId: string;
  userId?: string;
  conversationId?: string;
  lastActivity: number;
  context: Record<string, any>;
}

const sessionStore = new Map<string, AppState>();

/**
 * Get or create session state
 */
function getSessionState(sessionId: string, userId?: string): AppState {
  if (!sessionStore.has(sessionId)) {
    sessionStore.set(sessionId, {
      sessionId,
      userId,
      lastActivity: Date.now(),
      context: {},
    });
  }
  
  const state = sessionStore.get(sessionId)!;
  state.lastActivity = Date.now();
  
  return state;
}

/**
 * Enhanced MCP Server endpoint handler
 */
export async function handleEnhancedMCPServer(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const traceId = generateTraceId();
  const logger = new Logger(traceId);

  // CORS headers (per OpenAI Apps SDK requirements)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-User-Location, X-Session-ID',
    'X-Trace-ID': traceId,
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Extract session ID
  const sessionId = request.headers.get('X-Session-ID') || traceId;
  const userId = request.headers.get('X-User-ID') || undefined;
  const state = getSessionState(sessionId, userId);

  // MCP Server capabilities (enhanced)
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
          // State management capability
          state: {
            supported: true,
          },
        },
        serverInfo: {
          name: 'easyMO Discovery',
          version: '1.0.0',
          description: 'Mobility, marketplace, and payment services for Rwanda',
          homepage: 'https://easymo.discovery',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // List tools (enhanced with metadata)
  if (path === '/mcp/tools' && request.method === 'GET') {
    const mcpTools = allTools.map(convertToolToEnhancedMCP);

    logger.info('MCP tools listed', { 
      tool_count: mcpTools.length,
      session_id: sessionId,
    });

    return new Response(JSON.stringify({ tools: mcpTools }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Call tool (enhanced with state management and error handling)
  if (path === '/mcp/tools/call' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { name, arguments: args } = body;

      // Validate tool exists
      const tool = allTools.find(t => t.function.name === name);
      if (!tool) {
        return createErrorResponse(
          `Tool ${name} not found`,
          404,
          {
            available_tools: allTools.map(t => t.function.name),
            trace_id: traceId,
          },
          corsHeaders
        );
      }

      // Extract user context
      const userLocationHeader = request.headers.get('X-User-Location');
      let userLocation: { lat: number; lng: number } | undefined;
      
      if (userLocationHeader) {
        try {
          userLocation = JSON.parse(userLocationHeader);
        } catch {
          logger.warn('Failed to parse user location', { header: userLocationHeader });
        }
      }

      const clientIP = request.headers.get('CF-Connecting-IP') || 
                       request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                       'unknown';

      logger.info('MCP tool call', {
        tool_name: name,
        user_id: userId,
        session_id: sessionId,
        has_location: !!userLocation,
      });

      // Execute tool
      const toolCall = {
        id: `mcp-${traceId}`,
        type: 'function' as const,
        function: {
          name,
          arguments: JSON.stringify(args),
        },
      };

      // Determine agent type
      let agentType: 'mobility' | 'marketplace' | 'payments' | 'support' = 'support';
      const category = getToolCategory(name);
      if (category === 'mobility') agentType = 'mobility';
      else if (category === 'marketplace') agentType = 'marketplace';
      else if (category === 'payments') agentType = 'payments';

      // Execute with timeout
      const result = await Promise.race([
        executeToolCall(
          toolCall,
          agentType,
          env,
          {
            user_id: userId,
            user_location: userLocation,
            user_ip: clientIP,
            conversation_id: state.conversationId,
          }
        ),
        new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error('Tool execution timeout')), 30000);
        }),
      ]);

      // Parse and structure result
      let resultData: any;
      try {
        resultData = JSON.parse(result);
      } catch {
        resultData = { text: result };
      }

      // Enhanced structured output per OpenAI guidelines
      const structuredOutput = {
        success: resultData.success !== false,
        data: resultData,
        tool_name: name,
        trace_id: traceId,
        session_id: sessionId,
        // Add metadata for ecosystem compatibility
        metadata: {
          category,
          timestamp: new Date().toISOString(),
          privacy_level: assessPrivacyLevel(name, tool.function.parameters),
        },
      };

      // Update session state
      state.context[`last_tool_${name}`] = {
        timestamp: Date.now(),
        result: structuredOutput.success,
      };

      logger.info('MCP tool executed', {
        tool_name: name,
        success: structuredOutput.success,
        session_id: sessionId,
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
        session_id: sessionId,
      });

      return createErrorResponse(
        error.message || 'Tool execution failed',
        500,
        {
          trace_id: traceId,
          session_id: sessionId,
          error_type: error.name || 'UnknownError',
        },
        corsHeaders
      );
    }
  }

  // Get session state
  if (path === '/mcp/state' && request.method === 'GET') {
    return new Response(
      JSON.stringify({
        session_id: sessionId,
        state: {
          userId: state.userId,
          conversationId: state.conversationId,
          lastActivity: state.lastActivity,
          context: state.context,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Update session state
  if (path === '/mcp/state' && request.method === 'POST') {
    try {
      const body = await request.json();
      state.conversationId = body.conversationId || state.conversationId;
      state.context = { ...state.context, ...(body.context || {}) };
      
      return new Response(
        JSON.stringify({
          success: true,
          session_id: sessionId,
          state,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      return createErrorResponse(
        'Failed to update state',
        400,
        { error: error.message },
        corsHeaders
      );
    }
  }

  // List resources (enhanced)
  if (path === '/mcp/resources' && request.method === 'GET') {
    const resources = [
      {
        uri: 'easymo://presence',
        name: 'User Presence',
        description: 'Current user presence data (location, role, vehicle type). Coordinates are sanitized to ~100m precision for privacy.',
        mimeType: 'application/json',
      },
      {
        uri: 'easymo://trip_intents',
        name: 'Trip Intents',
        description: 'Active trip intents (passenger/driver matching). Expires after 10-15 minutes. Returns structured data suitable for further processing.',
        mimeType: 'application/json',
      },
      {
        uri: 'easymo://marketplace_listings',
        name: 'Marketplace Listings',
        description: 'Active marketplace listings with location data. Returns structured list of businesses, products, and services.',
        mimeType: 'application/json',
      },
    ];

    return new Response(JSON.stringify({ resources }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Read resource (enhanced with error handling)
  if (path.startsWith('/mcp/resources/') && request.method === 'GET') {
    const resourceUri = path.replace('/mcp/resources/', 'easymo://');
    
    // TODO: Implement actual resource fetching from Supabase
    // For now, return placeholder with proper structure
    
    return new Response(
      JSON.stringify({
        contents: [
          {
            uri: resourceUri,
            mimeType: 'application/json',
            text: JSON.stringify({
              message: 'Resource data would be fetched from Supabase',
              note: 'Full implementation would query Supabase with proper RLS and return structured data.',
              resource_uri: resourceUri,
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
  return createErrorResponse(
    'Endpoint not found',
    404,
    { 
      path,
      available_endpoints: [
        '/mcp/capabilities',
        '/mcp/tools',
        '/mcp/tools/call',
        '/mcp/resources',
        '/mcp/state',
      ],
      trace_id: traceId,
    },
    corsHeaders
  );
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  message: string,
  status: number,
  details: Record<string, any>,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...details,
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

