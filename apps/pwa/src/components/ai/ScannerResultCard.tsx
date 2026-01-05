/**
 * ScannerResultCard - Card for displaying QR scan results
 */

import React, { useState } from 'react';
import ToolCard from './ToolCard';
import { ICONS } from '../../../constants';
import { toast } from 'sonner';

export interface ScannerResult {
  type: 'ussd' | 'json' | 'text';
  code?: string;
  parsed?: {
    tx_type?: 'send' | 'pay' | 'unknown';
    amount?: number;
    phone?: string;
    merchant?: string;
    currency?: string;
    raw?: string;
  };
}

interface ScannerResultCardProps {
  result: ScannerResult;
  onPay?: (result: ScannerResult) => void;
  onCopy?: (result: ScannerResult) => void;
}

const ScannerResultCard: React.FC<ScannerResultCardProps> = ({
  result,
  onPay,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = result.code || result.parsed?.raw || JSON.stringify(result.parsed);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
      if (onCopy) onCopy(result);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const actions = [];
  
  if (result.type === 'ussd' && result.parsed?.tx_type === 'pay' && onPay) {
    actions.push({
      label: 'Pay',
      onClick: () => onPay(result),
      variant: 'primary' as const,
      icon: ICONS.CreditCard,
    });
  }

  actions.push({
    label: copied ? 'Copied!' : 'Copy',
    onClick: handleCopy,
    variant: (result.type === 'ussd' ? 'secondary' : 'primary') as const,
    icon: copied ? ICONS.Check : ICONS.Copy,
  });

  return (
    <ToolCard
      title="QR Code Scanned"
      icon={ICONS.QrCode}
      actions={actions}
    >
      <div className="space-y-3">
        {/* Type Badge */}
        <div className="flex items-center gap-2">
          <span className="
            px-3 py-1 rounded-full
            text-xs font-bold
            bg-blue-500/10 text-blue-600 dark:text-blue-400
          ">
            {result.type.toUpperCase()}
          </span>
        </div>

        {/* USSD Code */}
        {result.code && (
          <div className="
            bg-slate-100 dark:bg-slate-900
            rounded-xl p-4
            border border-slate-200 dark:border-slate-700
          ">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-semibold">
              Code
            </div>
            <div className="
              font-mono text-sm
              text-slate-900 dark:text-white
              break-all
            ">
              {result.code}
            </div>
          </div>
        )}

        {/* Parsed Data */}
        {result.parsed && (
          <div className="space-y-2">
            {result.parsed.tx_type && (
              <div className="flex items-center gap-2">
                <ICONS.ArrowRight className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Type: {result.parsed.tx_type}
                </span>
              </div>
            )}

            {result.parsed.amount && (
              <div className="flex items-center gap-2">
                <ICONS.DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Amount: {result.parsed.amount.toLocaleString()} {result.parsed.currency || 'RWF'}
                </span>
              </div>
            )}

            {result.parsed.phone && (
              <div className="flex items-center gap-2">
                <ICONS.Phone className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Phone: {result.parsed.phone}
                </span>
              </div>
            )}

            {result.parsed.merchant && (
              <div className="flex items-center gap-2">
                <ICONS.Store className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Merchant: {result.parsed.merchant}
                </span>
              </div>
            )}

            {result.parsed.raw && (
              <div className="
                bg-slate-100 dark:bg-slate-900
                rounded-xl p-3
                border border-slate-200 dark:border-slate-700
              ">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                  Raw Data
                </div>
                <div className="
                  font-mono text-xs
                  text-slate-900 dark:text-white
                  break-all
                ">
                  {result.parsed.raw}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolCard>
  );
};

export default ScannerResultCard;

