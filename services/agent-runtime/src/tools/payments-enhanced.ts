/**
 * Enhanced Payments Tools
 * - Receipt handling
 * - Payment request tracking
 */

import { z } from 'zod';
import type { Env } from '../types';
import { createSupabaseClient } from '../utils/supabase';
import { saveReceiptSchema, generateMomoQRSchema } from '@easymo/shared/schemas';

/**
 * Save payment receipt
 */
export async function saveReceipt(
  args: z.infer<typeof saveReceiptSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { user_id, payment_request_id, amount, currency, reference, notes } = args;
  
  try {
    // Create payment request record (if not already exists)
    let paymentId = payment_request_id;
    
    if (!paymentId) {
      const { data: payment, error } = await supabase
        .from('payment_requests')
        .insert({
          created_by: user_id,
          amount,
          currency,
          reference: reference || `RECEIPT-${Date.now()}`,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      
      if (error || !payment) {
        throw new Error(`Failed to create payment record: ${error?.message || 'Unknown error'}`);
      }
      
      paymentId = payment.id;
    } else {
      // Update existing payment request
      const { error } = await supabase
        .from('payment_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .eq('created_by', user_id);
      
      if (error) {
        throw new Error(`Failed to update payment record: ${error.message}`);
      }
    }
    
    // Return structured response
    return JSON.stringify({
      success: true,
      payment_id: paymentId,
      amount,
      currency,
      reference: reference || `RECEIPT-${Date.now()}`,
      status: 'paid',
      paid_at: new Date().toISOString(),
      message: `Receipt saved: ${amount} ${currency}`,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to save receipt',
    });
  }
}

/**
 * Get payment request status
 */
const getPaymentStatusSchema = z.object({
  payment_request_id: z.string().uuid(),
  user_id: z.string().uuid(),
});

export async function getPaymentStatus(
  args: z.infer<typeof getPaymentStatusSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { payment_request_id, user_id } = args;
  
  try {
    const { data: payment, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', payment_request_id)
      .eq('created_by', user_id)
      .single();
    
    if (error || !payment) {
      throw new Error(`Payment not found: ${error?.message || 'Unknown error'}`);
    }
    
    return JSON.stringify({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        reference: payment.reference,
        created_at: payment.created_at,
        paid_at: payment.paid_at,
        expires_at: payment.expires_at,
      },
      message: `Payment status: ${payment.status}`,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to get payment status',
    });
  }
}

// Enhanced payment tools
export const paymentsEnhancedTools = [
  {
    type: 'function' as const,
    function: {
      name: 'save_receipt',
      description: 'Save a payment receipt. Records payment completion and updates payment request status.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User UUID' },
          payment_request_id: { type: 'string', description: 'Optional: existing payment request ID' },
          amount: { type: 'number', description: 'Payment amount' },
          currency: { type: 'string', description: 'Currency code (default: RWF)' },
          reference: { type: 'string', description: 'Payment reference number' },
          notes: { type: 'string', description: 'Additional notes' },
        },
        required: ['user_id', 'amount'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_payment_status',
      description: 'Get status of a payment request.',
      parameters: {
        type: 'object',
        properties: {
          payment_request_id: { type: 'string', description: 'Payment request UUID' },
          user_id: { type: 'string', description: 'User UUID' },
        },
        required: ['payment_request_id', 'user_id'],
      },
    },
  },
];

