/**
 * Payments Agent - Handles MoMo QR generation and QR parsing
 */

import OpenAI from 'openai';
import type { Env, ChatMessage } from '../types';
import { paymentTools, generateMomoQR, parseQR } from '../tools/payments';

const PAYMENTS_SYSTEM_PROMPT = `You are the Payments Agent for easyMO, helping users generate Mobile Money (MoMo) payment QR codes.

Your capabilities:
- Generate MoMo QR codes for Rwanda, Kenya, and other countries
- Parse QR codes
- Handle payment requests

Use the available tools to:
1. generate_momo_qr - Generate USSD code and QR for MoMo payments
2. parse_qr - Parse QR code data

Be clear about payment amounts, currencies, and country-specific formats.`;

export const paymentsAgent = {
  name: 'payments' as const,
  systemPrompt: PAYMENTS_SYSTEM_PROMPT,
  tools: paymentTools,
  
  async executeTool(
    toolName: string,
    args: any,
    env: Env
  ): Promise<string> {
    switch (toolName) {
      case 'generate_momo_qr':
        return await generateMomoQR(args, env);
      case 'parse_qr':
        return await parseQR(args, env);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  },
};

