
import { supabase } from './supabase';
import { CONFIG } from '../config';

export interface ApiResponse {
  status?: 'success' | 'error' | 'ok';
  result?: 'success' | 'error';
  message?: string;
  data?: any;
  [key: string]: any;
}

/**
 * Invokes Supabase Edge Functions.
 */
export async function callBackend(payload: any): Promise<ApiResponse> {
  
  // Map actions to Edge Function names
  let functionName = '';
  
  if (payload.action === 'secure_gemini') functionName = 'chat-gemini';
  else if (payload.action === 'queue_broadcast' || payload.action === 'batch_broadcast') functionName = 'whatsapp-broadcast';
  else if (payload.action === 'check_broadcast_status') functionName = 'whatsapp-status';
  else if (payload.action === 'schedule_trip') functionName = 'schedule-trip';
  else if (payload.action === 'update_presence') functionName = 'update-presence';
  else if (payload.action === 'create_request') functionName = 'log-request';
  else {
    console.warn("Unknown action:", payload.action);
    return { status: 'error', message: 'Unknown action' };
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
      console.error(`Edge Function '${functionName}' failed:`, error);
      throw error;
    }

    return data || { status: 'success', data: {} };

  } catch (error: any) {
    // Suppress console.error for log-request
    if (functionName !== 'log-request') {
        console.error(`Backend API Error (${functionName}):`, error);
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

    return { 
        status: "error", 
        message: "Service unavailable. Please check your internet connection." 
    };
  }
}
