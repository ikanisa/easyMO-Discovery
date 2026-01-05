/**
 * Payment Tools for Payments Agent
 */

import { z } from 'zod';

const generateMomoQRSchema = z.object({
  country_id: z.string().default('rw'),
  tx_type: z.enum(['send', 'pay']).default('pay'),
  phone_number: z.string().optional(),
  amount: z.string().optional(),
  merchant_code: z.string().optional(),
});

export async function generateMomoQR(
  args: z.infer<typeof generateMomoQRSchema>,
  env: Env
): Promise<string> {
  const { country_id, tx_type, phone_number, amount, merchant_code } = args;
  
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
      // Add more countries as needed
    };
    
    const countryFormat = formats[country_id] || formats.rw;
    const template = tx_type === 'send' ? countryFormat.send : countryFormat.pay;
    
    let code = template;
    code = code.replace('{p}', phone_number || '');
    code = code.replace('{m}', merchant_code || '');
    
    if (amount) {
      code = code.replace('{a}', amount);
    } else {
      code = code.replace('*{a}', '').replace('{a}', '');
    }
    
    code = code.replace(/\*\*/g, '*');
    
    // Generate QR value (tel: URI)
    const qrValue = `tel:${code.replace(/#/g, '%23')}`;
    
    return JSON.stringify({
      success: true,
      ussd_code: code,
      qr_value: qrValue,
      qr_data_url: `data:image/svg+xml;base64,${Buffer.from(`<svg><text>${qrValue}</text></svg>`).toString('base64')}`, // Simplified - use actual QR library in production
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to generate MoMo QR',
    });
  }
}

const parseQRSchema = z.object({
  qr_data: z.string(), // QR code text or base64 image
});

export async function parseQR(
  args: z.infer<typeof parseQRSchema>,
  env: Env
): Promise<string> {
  const { qr_data } = args;
  
  try {
    // Simple text parsing for tel: URIs
    if (qr_data.startsWith('tel:')) {
      const code = decodeURIComponent(qr_data.replace('tel:', ''));
      return JSON.stringify({
        success: true,
        type: 'ussd',
        code,
        parsed: {
          type: code.includes('*182*6*1*') ? 'send' : code.includes('*182*6*2*') ? 'pay' : 'unknown',
          code,
        },
      });
    }
    
    // Could add image QR parsing here using a library
    return JSON.stringify({
      success: false,
      error: 'QR code format not supported. Expected tel: URI.',
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to parse QR code',
    });
  }
}

export const paymentTools = [
  {
    type: 'function' as const,
    function: {
      name: 'generate_momo_qr',
      description: 'Generate Mobile Money (MoMo) payment QR code and USSD code for Rwanda, Kenya, and other supported countries.',
      parameters: {
        type: 'object',
        properties: {
          country_id: { type: 'string', description: 'Country code (rw, ke, etc.)', default: 'rw' },
          tx_type: { type: 'string', enum: ['send', 'pay'], description: 'Transaction type', default: 'pay' },
          phone_number: { type: 'string', description: 'Recipient phone number' },
          amount: { type: 'string', description: 'Amount to send/pay' },
          merchant_code: { type: 'string', description: 'Merchant code (for payments)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'parse_qr',
      description: 'Parse QR code data (currently supports tel: URI format for USSD codes).',
      parameters: {
        type: 'object',
        properties: {
          qr_data: { type: 'string', description: 'QR code text or base64 image data' },
        },
        required: ['qr_data'],
      },
    },
  },
];

