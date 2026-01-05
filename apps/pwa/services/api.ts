
import { supabase, isSupabaseConfigured, NetworkService } from './supabase';
import { CONFIG } from '../config';
import { MonitoringService } from './monitoring';
import { OfflineQueue } from './offlineQueue';

export interface ApiResponse {
  status?: 'success' | 'error' | 'ok';
  result?: 'success' | 'error' | 'queued';
  message?: string;
  data?: any;
  [key: string]: any;
}

const QUEUEABLE_ACTIONS = new Set([
  'create_request',
  'queue_broadcast',
  'batch_broadcast',
]);

/**
 * Invokes Supabase Edge Functions.
 */
export async function callBackend(
  payload: any,
  options: { skipQueue?: boolean } = {}
): Promise<ApiResponse> {
  
  // Map actions to Edge Function names
  let functionName = '';
  
  if (payload.action === 'secure_gemini') functionName = 'chat-gemini';
  else if (payload.action === 'queue_broadcast' || payload.action === 'batch_broadcast') functionName = 'whatsapp-broadcast';
  else if (payload.action === 'check_broadcast_status') functionName = 'whatsapp-status';
  else if (payload.action === 'create_request') functionName = 'log-request';
  else {
    console.warn("Unknown action:", payload.action);
    MonitoringService.captureMessage(`Unknown action called: ${payload.action}`, 'warning');
    return { status: 'error', message: 'Unknown action' };
  }

  if (!isSupabaseConfigured) {
    return {
      status: 'error',
      message: 'Service is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  if (!options.skipQueue && !NetworkService.isOnline()) {
    if (QUEUEABLE_ACTIONS.has(payload.action)) {
      // Generate idempotency key from payload
      const idempotencyKey = `${payload.action}-${JSON.stringify(payload).slice(0, 100)}-${Date.now()}`;
      await OfflineQueue.enqueue(payload, {
        idempotencyKey,
        action: payload.action,
        maxRetries: 5,
        metadata: {
          functionName,
          timestamp: Date.now(),
        },
      });
      return {
        status: 'ok',
        result: 'queued',
        message: 'Offline. Action queued for sync.',
      };
    }
    return {
      status: 'error',
      message: 'You are offline. Please reconnect to continue.',
    };
  }

  // 1. Attempt Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });

    if (error) {
      // Don't throw immediately for non-critical functions
      if (functionName === 'log-request') {
         console.warn(`Non-critical Edge Function '${functionName}' failed silently:`, error.message);
         return { status: 'error', message: 'Logging failed' };
      }
      
      MonitoringService.captureException(error, { functionName, payload });
      console.error(`Edge Function '${functionName}' failed:`, error);
      throw error;
    }

    return data || { status: 'success', data: {} };

  } catch (error: any) {
    // Suppress console.error for log-request
    if (functionName !== 'log-request') {
        console.error(`Backend API Error (${functionName}):`, error);
        MonitoringService.captureException(error, { functionName, payload });
    } else {
        console.debug(`Backend API Warn (${functionName}):`, error.message);
    }
    
    // Fallback: Demo Mode Simulation if network fails or function is missing
    if (CONFIG.ENABLE_DEMO_MODE) {
       console.log("Returning Mock Response (Demo/Offline Mode)");
       
       if (functionName === 'chat-gemini') {
          return { 
              text: "I am running in offline demo mode. I cannot reach the AI brain right now.",
              status: 'success' 
          };
       }
       return { status: 'success', result: 'success', message: 'Simulated success (Offline Mode)' };
    }

    if (!options.skipQueue && QUEUEABLE_ACTIONS.has(payload.action)) {
      // Generate idempotency key from payload
      const idempotencyKey = `${payload.action}-${JSON.stringify(payload).slice(0, 100)}-${Date.now()}`;
      await OfflineQueue.enqueue(payload, {
        idempotencyKey,
        action: payload.action,
        maxRetries: 5,
        metadata: {
          functionName,
          timestamp: Date.now(),
          error: error.message,
        },
      });
      return { status: 'ok', result: 'queued', message: 'Action queued for sync.' };
    }

    return {
      status: "error",
      message: "Service unavailable. Please check your internet connection."
    };
  }
}

/**
 * Flush queued requests with conflict handling
 */
export async function flushQueuedRequests() {
  return OfflineQueue.flush(async (payload, metadata) => {
    try {
      const response = await callBackend(payload, { skipQueue: true });
      
      // Check for conflict indicators in response
      if (response.status === 'error' && response.message?.includes('conflict')) {
        return {
          status: 'error',
          conflict: true,
          conflictResolution: 'last-write-wins', // Default strategy
          error: response.message,
        };
      }
      
      return response;
    } catch (error: any) {
      // Check for conflict errors (e.g., 409 status)
      if (error.status === 409 || error.message?.includes('conflict')) {
        return {
          status: 'error',
          conflict: true,
          conflictResolution: 'last-write-wins',
          error: error.message,
        };
      }
      
      // Re-throw for retry logic
      throw error;
    }
  });
}
