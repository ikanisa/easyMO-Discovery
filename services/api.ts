
import { supabase } from './supabase';

export interface ApiResponse {
  status?: 'success' | 'error' | 'ok';
  result?: 'success' | 'error';
  message?: string;
  data?: any;
  [key: string]: any;
}

/**
 * Invokes Supabase Edge Functions.
 * Replaces the old Google Apps Script callBackend.
 */
export async function callBackend(payload: any): Promise<ApiResponse> {
  
  // Map old "actions" to Edge Function names
  let functionName = 'main-api'; // Default function
  
  if (payload.action === 'secure_gemini') functionName = 'chat-gemini';
  if (payload.action === 'queue_broadcast' || payload.action === 'batch_broadcast') functionName = 'whatsapp-broadcast';
  if (payload.action === 'check_broadcast_status') functionName = 'whatsapp-status';

  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });

    if (error) {
      console.error(`Edge Function '${functionName}' Error:`, error);
      
      // Fallback for development if functions aren't deployed yet
      // This prevents the app from crashing during migration
      return { 
        status: 'error', 
        message: 'Backend function not reachable. Ensure Edge Functions are deployed.',
        debug: error.message
      };
    }

    return data || { status: 'success', data: {} };
    
  } catch (error) {
    console.error("API Network Error:", error);
    return { status: "error", message: "Network failure" };
  }
}
