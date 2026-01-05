/**
 * ScannerResultCard - Renders QR scan results
 */

import React from 'react';
import { ToolCard } from './ToolCard';

interface ScannerResultCardProps {
  data: any;
}

export const ScannerResultCard: React.FC<ScannerResultCardProps> = ({ data }) => {
  const parsed = data.parsed || {};
  const type = parsed.type || data.type;

  return (
    <ToolCard title="QR Code Scanned">
      <div className="space-y-3">
        {type === 'momo' && (
          <>
            <div className="font-medium text-slate-900 dark:text-white">
              Mobile Money Payment
            </div>
            {parsed.amount && (
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {parsed.amount} {parsed.currency || 'RWF'}
              </div>
            )}
            {parsed.phone_number && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                To: {parsed.phone_number}
              </div>
            )}
            {parsed.merchant_code && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Merchant: {parsed.merchant_code}
              </div>
            )}
          </>
        )}

        {type === 'url' && (
          <div className="text-slate-900 dark:text-white">
            <div className="font-medium mb-1">URL</div>
            <div className="text-sm text-blue-600 dark:text-blue-400 break-all">
              {parsed.url || data.url}
            </div>
          </div>
        )}

        {!type && (
          <div className="text-slate-600 dark:text-slate-400">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </ToolCard>
  );
};

