/**
 * OAuth Authentication for ChatGPT Apps SDK
 * 
 * Per OpenAI Apps SDK guidelines:
 * - https://developers.openai.com/apps-sdk/build/auth
 * 
 * Implements OAuth 2.0 flow for user authentication
 */

import type { Env } from '../types';
import { Logger, generateTraceId } from '../utils/logging';

/**
 * OAuth configuration
 */
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

/**
 * Get OAuth configuration from environment
 */
function getOAuthConfig(env: Env): OAuthConfig {
  return {
    clientId: env.OAUTH_CLIENT_ID || '',
    clientSecret: env.OAUTH_CLIENT_SECRET || '',
    redirectUri: env.OAUTH_REDIRECT_URI || `${env.WORKER_URL || ''}/auth/callback`,
    authorizationUrl: env.OAUTH_AUTHORIZATION_URL || 'https://easymo.discovery/oauth/authorize',
    tokenUrl: env.OAUTH_TOKEN_URL || 'https://easymo.discovery/oauth/token',
    scopes: ['read', 'write', 'location'],
  };
}

/**
 * Handle OAuth authorization request
 * 
 * Returns authorization URL for user to authenticate
 */
export async function handleOAuthAuthorize(
  request: Request,
  env: Env
): Promise<Response> {
  const traceId = generateTraceId();
  const logger = new Logger(traceId);
  
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || generateTraceId();
  const redirectUri = url.searchParams.get('redirect_uri') || getOAuthConfig(env).redirectUri;
  
  const config = getOAuthConfig(env);
  
  // Build authorization URL
  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scopes.join(' '));
  authUrl.searchParams.set('state', state);
  
  logger.info('OAuth authorization initiated', {
    state,
    redirect_uri: redirectUri,
  });
  
  // Store state in KV (if available)
  if (env.KV) {
    await env.KV.put(`oauth_state:${state}`, JSON.stringify({
      redirect_uri: redirectUri,
      timestamp: Date.now(),
    }), { expirationTtl: 600 }); // 10 minutes
  }
  
  return new Response(
    JSON.stringify({
      authorization_url: authUrl.toString(),
      state,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

/**
 * Handle OAuth callback
 * 
 * Exchanges authorization code for access token
 */
export async function handleOAuthCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const traceId = generateTraceId();
  const logger = new Logger(traceId);
  
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  
  if (error) {
    logger.error('OAuth error', new Error(error));
    return new Response(
      JSON.stringify({
        error,
        error_description: url.searchParams.get('error_description') || 'OAuth authorization failed',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
  
  if (!code || !state) {
    return new Response(
      JSON.stringify({
        error: 'missing_parameters',
        error_description: 'Code and state are required',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
  
  // Verify state
  let stateData: any = null;
  if (env.KV) {
    const storedState = await env.KV.get(`oauth_state:${state}`);
    if (storedState) {
      stateData = JSON.parse(storedState);
      await env.KV.delete(`oauth_state:${state}`);
    }
  }
  
  if (!stateData) {
    return new Response(
      JSON.stringify({
        error: 'invalid_state',
        error_description: 'State mismatch or expired',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
  
  // Exchange code for token
  const config = getOAuthConfig(env);
  
  try {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: stateData.redirect_uri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_description || 'Token exchange failed');
    }
    
    const tokenData = await tokenResponse.json();
    
    logger.info('OAuth token obtained', {
      state,
      has_access_token: !!tokenData.access_token,
    });
    
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    logger.error('OAuth token exchange failed', error);
    return new Response(
      JSON.stringify({
        error: 'token_exchange_failed',
        error_description: error.message || 'Failed to exchange authorization code for token',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

/**
 * Verify access token
 * 
 * Validates an access token and returns user information
 */
export async function verifyAccessToken(
  token: string,
  env: Env
): Promise<{ valid: boolean; userId?: string; scopes?: string[] }> {
  // TODO: Implement actual token verification
  // For now, return placeholder
  
  // In production, this would:
  // 1. Verify token signature
  // 2. Check token expiration
  // 3. Extract user ID and scopes
  // 4. Return user information
  
  return {
    valid: true,
    userId: 'user-placeholder',
    scopes: ['read', 'write', 'location'],
  };
}

/**
 * Extract user ID from request headers
 * 
 * ChatGPT Apps SDK provides user context in headers
 */
export function extractUserFromRequest(request: Request): {
  userId?: string;
  accessToken?: string;
} {
  const userId = request.headers.get('X-User-ID') || undefined;
  const authHeader = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || undefined;
  
  return {
    userId,
    accessToken,
  };
}

