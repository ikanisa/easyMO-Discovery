/**
 * Payments Agent - Handles MoMo QR generation, QR parsing, receipt handling
 */

import OpenAI from 'openai';
import type { Env, ChatMessage } from '../types';
import { paymentTools, generateMomoQR, parseQR } from '../tools/payments';
import { paymentsEnhancedTools, saveReceipt, getPaymentStatus } from '../tools/payments-enhanced';
import { paymentsRobustTools, generateMomoQRRobust, parseQRRobust } from '../tools/payments-robust';

const PAYMENTS_SYSTEM_PROMPT = `You are the Payments Agent for easyMO, helping users generate Mobile Money (MoMo) payment QR codes and manage payments.

**Your capabilities:**
- Generate MoMo QR codes for Rwanda, Kenya, and other countries
- Parse QR codes
- Handle payment requests
- Save payment receipts
- Track payment status

**Tool Usage:**
1. **generate_momo_qr** - Generate USSD code and QR for MoMo payments
2. **parse_qr** - Parse QR code data
3. **save_receipt** - Save a payment receipt (records payment completion)
4. **get_payment_status** - Get status of a payment request

**Response Format:**
- Return structured JSON from tools (for UI cards)
- Display QR codes clearly
- Confirm receipt saving

Be clear about payment amounts, currencies, and country-specific formats. Always confirm when receipts are saved.`;

export const paymentsAgent = {
  name: 'payments' as const,
  systemPrompt: PAYMENTS_SYSTEM_PROMPT,
  tools: [...paymentTools, ...paymentsEnhancedTools, ...paymentsRobustTools],
  
  async executeTool(
    toolName: string,
    args: any,
    env: Env,
    userId?: string,
    userIP?: string
  ): Promise<string> {
    switch (toolName) {
      // Legacy tools
      case 'generate_momo_qr':
        return await generateMomoQR(args, env);
      case 'parse_qr':
        return await parseQR(args, env);
      
      // Enhanced tools
      case 'save_receipt':
        return await saveReceipt(args, env);
      case 'get_payment_status':
        return await getPaymentStatus(args, env);
      
      // Robust tools
      case 'generate_momo_qr':
        return await generateMomoQRRobust(args, env);
      case 'parse_qr':
        return await parseQRRobust(args, env);
      
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  },
};

