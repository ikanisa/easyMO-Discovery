/**
 * MCP Server for ChatGPT Apps SDK
 * Exposes Worker tools as MCP (Model Context Protocol) resources and tools
 */

import type { Env } from './types';

/**
 * MCP Server endpoint handler
 * Formats Worker tools and resources for ChatGPT Apps SDK
 */
export async function handleMCPServer(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

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
    const tools = [
      {
        name: 'publish_presence',
        description: 'Publish user presence (location and role) for mobility matching. Drivers use this to go online.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User UUID' },
            role: {
              type: 'string',
              enum: ['passenger', 'driver', 'vendor'],
              description: 'User role',
            },
            location: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
              required: ['lat', 'lng'],
            },
            vehicle_type: {
              type: 'string',
              enum: ['moto', 'cab', 'liffan', 'truck', 'other', 'shop'],
            },
          },
          required: ['user_id', 'role', 'location'],
        },
      },
      {
        name: 'find_matches',
        description:
          'Find nearby drivers or passengers for mobility matching. Passengers find drivers, drivers find passengers.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User UUID' },
            role: {
              type: 'string',
              enum: ['passenger', 'driver'],
              description: 'User role (passengers find drivers, drivers find passengers)',
            },
            location: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
              required: ['lat', 'lng'],
            },
            radius_km: { type: 'number', default: 5 },
            vehicle_type: {
              type: 'string',
              enum: ['moto', 'cab', 'liffan', 'truck', 'other'],
            },
          },
          required: ['user_id', 'role', 'location'],
        },
      },
      {
        name: 'search_offers',
        description:
          'Search marketplace for products/services. Uses Gemini + Google Maps to find businesses with phone numbers.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            location: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
            },
            filters: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                radius_km: { type: 'number', default: 5 },
                price_min: { type: 'number' },
                price_max: { type: 'number' },
              },
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'generate_momo_qr',
        description: 'Generate Mobile Money QR code (USSD format). Supports Rwanda, Kenya, and other countries.',
        inputSchema: {
          type: 'object',
          properties: {
            country_id: { type: 'string', default: 'rw' },
            tx_type: { type: 'string', enum: ['send', 'pay'], default: 'pay' },
            phone_number: { type: 'string' },
            amount: { type: 'string' },
            merchant_code: { type: 'string' },
          },
        },
      },
      {
        name: 'parse_qr',
        description: 'Parse QR code (tel: URI format for USSD codes).',
        inputSchema: {
          type: 'object',
          properties: {
            qr_data: { type: 'string', description: 'QR code text or base64 image' },
          },
          required: ['qr_data'],
        },
      },
      {
        name: 'geocode',
        description: 'Geocode a location query (e.g., "Kigali, Rwanda") to coordinates. Uses Gemini/Google Maps if available.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Location query (address or place name)' },
            user_location: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'estimate_eta',
        description: 'Estimate travel time between two locations. Uses Google Maps Distance Matrix API if available.',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
              required: ['lat', 'lng'],
            },
            destination: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
              required: ['lat', 'lng'],
            },
            mode: {
              type: 'string',
              enum: ['driving', 'walking', 'transit'],
              default: 'driving',
            },
          },
          required: ['origin', 'destination'],
        },
      },
    ];

    return new Response(JSON.stringify({ tools }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Call tool (proxy to Worker main endpoint)
  if (path === '/mcp/tools/call' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { name, arguments: args } = body;

      // Forward to Worker main endpoint
      // Note: This is a simplified version - full implementation would route to specific tools
      return new Response(
        JSON.stringify({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Tool execution should go through main Worker endpoint',
                tool: name,
                args,
              }),
            },
          ],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: error.message }),
            },
          ],
        }),
        {
          status: 400,
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
        description: 'Current user presence data (location, role, vehicle type)',
        mimeType: 'application/json',
      },
      {
        uri: 'easymo://trip_intents',
        name: 'Trip Intents',
        description: 'Active trip intents (passenger/driver matching)',
        mimeType: 'application/json',
      },
      {
        uri: 'easymo://marketplace_listings',
        name: 'Marketplace Listings',
        description: 'Active marketplace listings',
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
    return new Response(
      JSON.stringify({
        contents: [
          {
            uri: path.replace('/mcp/resources/', 'easymo://'),
            mimeType: 'application/json',
            text: JSON.stringify({ message: 'Resource data would be fetched from Supabase' }),
          },
        ],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Default: 404
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

