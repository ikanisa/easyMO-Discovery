/**
 * PaymentQRCard - Renders MoMo QR code
 */

import React from 'react';
import { ToolCard } from './ToolCard';

interface PaymentQRCardProps {
  data: any;
}

export const PaymentQRCard: React.FC<PaymentQRCardProps> = ({ data }) => {
  const qrDataUrl = data.qr_data_url;
  const ussdCode = data.ussd_code;
  const amount = data.amount;
  const currency = data.currency || 'RWF';

  return (
    <ToolCard title="MoMo Payment QR Code">
      <div className="space-y-4">
        {qrDataUrl && (
          <div className="flex justify-center">
            <img
              src={qrDataUrl}
              alt="MoMo QR Code"
              className="w-48 h-48 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
        )}
        
        {ussdCode && (
          <div className="
            p-3 rounded-lg
            bg-slate-100 dark:bg-slate-800
            font-mono text-sm
            text-center
            text-slate-900 dark:text-white
          ">
            {ussdCode}
          </div>
        )}

        {amount && (
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {amount} {currency}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Scan QR code or dial USSD code
            </div>
          </div>
        )}

        {data.reference && (
          <div className="text-xs text-slate-500 dark:text-slate-500 text-center">
            Reference: {data.reference}
          </div>
        )}
      </div>
    </ToolCard>
  );
};

