/**
 * Robust Payments Tools
 * - generate_momo_qr
 * - parse_qr
 */

import { z } from 'zod';
import type { Env } from '../types';

/**
 * Generate MoMo QR code
 */
const generateMomoQRRobustSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().default('RWF'),
  reference: z.string(),
  merchant_id: z.string().optional(),
});

export async function generateMomoQRRobust(
  args: z.infer<typeof generateMomoQRRobustSchema>,
  env: Env
): Promise<string> {
  const { amount, currency, reference, merchant_id } = args;
  
  try {
    // Country-specific USSD formats
    const formats: Record<string, { send: string; pay: string }> = {
      rw: {
        send: '*182*6*1*{p}*{a}#',
        pay: '*182*6*2*{p}*{a}#',
      },
      ke: {
        send: '*234*1*{p}*{a}#',
        pay: '*234*2*{p}*{a}#',
      },
    };
    
    // Determine country from currency or default to Rwanda
    const country = currency === 'KES' ? 'ke' : 'rw';
    const countryFormat = formats[country] || formats.rw;
    const template = merchant_id ? countryFormat.pay : countryFormat.send;
    
    let code = template;
    
    // Replace placeholders
    if (merchant_id) {
      code = code.replace('{m}', merchant_id);
    }
    
    if (amount) {
      code = code.replace('{a}', amount.toString());
    } else {
      code = code.replace('*{a}', '').replace('{a}', '');
    }
    
    // Clean up double asterisks
    code = code.replace(/\*\*/g, '*');
    
    // Generate QR value (tel: URI)
    const qrValue = `tel:${code.replace(/#/g, '%23')}`;
    
    // Base64 encode for QR data URL (simplified - use actual QR library in production)
    const svgText = `<svg><text>${qrValue}</text></svg>`;
    const base64Svg = btoa(svgText);
    
    return JSON.stringify({
      success: true,
      ussd_code: code,
      qr_value: qrValue,
      qr_data_url: `data:image/svg+xml;base64,${base64Svg}`,
      amount: amount || null,
      currency,
      reference,
      country,
      message: `MoMo QR code generated. Amount: ${amount ? `${amount} ${currency}` : 'Any amount'}`,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to generate MoMo QR',
    });
  }
}

/**
 * Parse QR code data
 */
const parseQRRobustSchema = z.object({
  payload: z.string(), // QR code text or scanned data
});

export async function parseQRRobust(
  args: z.infer<typeof parseQRRobustSchema>,
  env: Env
): Promise<string> {
  const { payload } = args;
  
  try {
    // Parse tel: URI format (USSD codes)
    if (payload.startsWith('tel:')) {
      const code = decodeURIComponent(payload.replace('tel:', ''));
      
      // Parse USSD code structure
      const parts = code.split('*');
      let txType: 'send' | 'pay' | 'unknown' = 'unknown';
      let amount: string | null = null;
      let phone: string | null = null;
      let merchant: string | null = null;
      
      // Rwanda format: *182*6*1*{phone}*{amount}#
      if (code.includes('*182*6*1*')) {
        txType = 'send';
        const match = code.match(/\*182\*6\*1\*(\d+)\*(\d+)#/);
        if (match) {
          phone = match[1];
          amount = match[2];
        }
      } else if (code.includes('*182*6*2*')) {
        txType = 'pay';
        const match = code.match(/\*182\*6\*2\*(\d+)\*(\d+)#/);
        if (match) {
          merchant = match[1];
          amount = match[2];
        }
      }
      
      return JSON.stringify({
        success: true,
        type: 'ussd',
        code,
        parsed: {
          tx_type: txType,
          amount: amount ? parseFloat(amount) : null,
          phone,
          merchant,
          currency: 'RWF', // Default for Rwanda
        },
        message: `QR code parsed: ${txType} ${amount ? `${amount} RWF` : 'any amount'}`,
      });
    }
    
    // Try to parse as JSON (if QR contains structured data)
    try {
      const json = JSON.parse(payload);
      return JSON.stringify({
        success: true,
        type: 'json',
        parsed: json,
        message: 'QR code parsed as JSON',
      });
    } catch {
      // Not JSON
    }
    
    // Fallback: return raw payload
    return JSON.stringify({
      success: true,
      type: 'text',
      parsed: {
        raw: payload,
      },
      message: 'QR code parsed as text',
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to parse QR code',
    });
  }
}

// Export tool definitions
export const paymentsRobustTools = [
  {
    type: 'function' as const,
    function: {
      name: 'generate_momo_qr',
      description: 'Generate Mobile Money (MoMo) payment QR code and USSD code for Rwanda, Kenya, and other supported countries.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Payment amount (optional for any amount)' },
          currency: { type: 'string', description: 'Currency code (RWF, KES, etc.)', default: 'RWF' },
          reference: { type: 'string', description: 'Payment reference number' },
          merchant_id: { type: 'string', description: 'Merchant ID (for payment requests)' },
        },
        required: ['reference'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'parse_qr',
      description: 'Parse QR code data. Supports tel: URI format (USSD codes) and JSON/text formats.',
      parameters: {
        type: 'object',
        properties: {
          payload: { type: 'string', description: 'QR code text or scanned data' },
        },
        required: ['payload'],
      },
    },
  },
];

