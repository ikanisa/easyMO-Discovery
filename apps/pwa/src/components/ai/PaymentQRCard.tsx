/**
 * PaymentQRCard - Card for displaying MoMo QR codes
 */

import React, { useState } from 'react';
import ToolCard from './ToolCard';
import { ICONS } from '../../../constants';
import { toast } from 'sonner';

export interface PaymentQRData {
  ussd_code?: string;
  qr_value?: string;
  qr_data_url?: string;
  amount?: number;
  currency?: string;
  reference?: string;
  country?: string;
}

interface PaymentQRCardProps {
  qrData: PaymentQRData;
  onShare?: (qrData: PaymentQRData) => void;
}

const PaymentQRCard: React.FC<PaymentQRCardProps> = ({ qrData, onShare }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUSSD = async () => {
    if (qrData.ussd_code) {
      try {
        await navigator.clipboard.writeText(qrData.ussd_code);
        setCopied(true);
        toast.success('USSD code copied!');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy code');
      }
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(qrData);
    } else if (qrData.qr_data_url && navigator.share) {
      // Convert data URL to blob for sharing
      fetch(qrData.qr_data_url)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], 'momo-qr.png', { type: 'image/png' });
          navigator.share({
            title: 'MoMo Payment QR',
            text: `Pay ${qrData.amount ? `${qrData.amount} ${qrData.currency || 'RWF'}` : 'any amount'}`,
            files: [file],
          });
        })
        .catch(() => {
          toast.error('Sharing not available');
        });
    } else {
      toast.info('Sharing not supported on this device');
    }
  };

  const actions = [
    {
      label: 'Share QR',
      onClick: handleShare,
      variant: 'primary' as const,
      icon: ICONS.Share,
    },
  ];

  if (qrData.ussd_code) {
    actions.push({
      label: copied ? 'Copied!' : 'Copy USSD',
      onClick: handleCopyUSSD,
      variant: 'secondary' as const,
      icon: copied ? ICONS.Check : ICONS.Copy,
    });
  }

  return (
    <ToolCard
      title="MoMo Payment QR"
      icon={ICONS.QrCode}
      actions={actions}
    >
      <div className="space-y-4">
        {/* QR Code */}
        {qrData.qr_data_url && (
          <div className="flex justify-center">
            <div className="
              w-64 h-64
              bg-white rounded-xl
              p-4
              shadow-lg
              flex items-center justify-center
            ">
              <img
                src={qrData.qr_data_url}
                alt="MoMo QR Code"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Amount */}
        {qrData.amount && (
          <div className="text-center">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Amount
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {qrData.amount.toLocaleString()} {qrData.currency || 'RWF'}
            </div>
          </div>
        )}

        {/* USSD Code */}
        {qrData.ussd_code && (
          <div className="
            bg-slate-100 dark:bg-slate-900
            rounded-xl p-4
            border border-slate-200 dark:border-slate-700
          ">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-semibold">
              USSD Code
            </div>
            <div className="
              font-mono text-sm
              text-slate-900 dark:text-white
              break-all
            ">
              {qrData.ussd_code}
            </div>
          </div>
        )}

        {/* Reference */}
        {qrData.reference && (
          <div className="text-center text-xs text-slate-500 dark:text-slate-400">
            Reference: {qrData.reference}
          </div>
        )}
      </div>
    </ToolCard>
  );
};

export default PaymentQRCard;

