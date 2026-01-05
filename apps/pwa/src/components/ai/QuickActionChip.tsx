/**
 * QuickActionChip - Reusable chip component for quick actions
 * Low-literacy friendly: big touch target, clear icon + label
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '../../../constants';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

interface QuickActionChipProps {
  action: QuickAction;
  index?: number;
}

const colorClasses = {
  blue: 'bg-blue-500 hover:bg-blue-600 text-white',
  green: 'bg-green-500 hover:bg-green-600 text-white',
  purple: 'bg-purple-500 hover:bg-purple-600 text-white',
  orange: 'bg-orange-500 hover:bg-orange-600 text-white',
  red: 'bg-red-500 hover:bg-red-600 text-white',
};

const QuickActionChip: React.FC<QuickActionChipProps> = ({ action, index = 0 }) => {
  const Icon = action.icon;
  const colorClass = colorClasses[action.color || 'blue'];

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={action.onClick}
      className={`
        flex items-center gap-3 px-5 py-4 rounded-2xl
        ${colorClass}
        shadow-lg shadow-black/10
        font-bold text-base
        min-h-[56px] min-w-[140px]
        transition-all duration-200
        active:scale-95
      `}
      aria-label={action.label}
    >
      <Icon className="w-6 h-6 shrink-0" />
      <span className="whitespace-nowrap">{action.label}</span>
    </motion.button>
  );
};

export default QuickActionChip;

