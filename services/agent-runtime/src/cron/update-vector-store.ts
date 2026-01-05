/**
 * Cron Job: Update Business Vector Store
 * 
 * This endpoint should be called periodically (e.g., daily) to update
 * the vector store with new businesses.
 * 
 * Route: /cron/update-vector-store
 * Method: GET or POST
 * Auth: Requires secret header or Cloudflare Cron trigger
 */

import type { Env } from '../types';
import { setupBusinessVectorStore } from '../tools/file-search';
import { Logger, generateTraceId } from '../utils/logging';

export async function handleUpdateVectorStore(request: Request, env: Env): Promise<Response> {
  const traceId = generateTraceId();
  const logger = new Logger(traceId);
  
  // Optional: Check for secret header to prevent unauthorized access
  const secret = request.headers.get('X-Cron-Secret');
  const expectedSecret = env.CRON_SECRET || 'change-me-in-production';
  
  if (secret !== expectedSecret) {
    logger.warn('Unauthorized vector store update attempt');
    return new Response('Unauthorized', { status: 401 });
  }
  
  try {
    logger.info('Starting vector store update');
    const startTime = Date.now();
    
    const vectorStoreId = await setupBusinessVectorStore(env);
    
    const duration = Date.now() - startTime;
    logger.info('Vector store update complete', {
      vector_store_id: vectorStoreId,
      duration_ms: duration,
    });
    
    return new Response(JSON.stringify({
      success: true,
      vector_store_id: vectorStoreId,
      duration_ms: duration,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    logger.error('Vector store update failed', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

