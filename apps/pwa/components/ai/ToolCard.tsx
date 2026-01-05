/**
 * ToolCard - Base card component for tool results
 * Provides common styling and structure for all tool cards
 */

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@easymo/shared/constants';

export interface ToolCardProps {
  title: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  children: ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  }>;
  expandable?: boolean;
  defaultExpanded?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({
  title,
  icon: Icon,
  children,
  actions = [],
  expandable = false,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4"
    >
      <div className="
        bg-white dark:bg-slate-800
        rounded-2xl
        border border-slate-200 dark:border-slate-700
        shadow-lg shadow-black/5
        overflow-hidden
      ">
        {/* Header */}
        <div className="
          flex items-center gap-3
          px-5 py-4
          border-b border-slate-200 dark:border-slate-700
          bg-slate-50 dark:bg-slate-900/50
        ">
          {Icon && (
            <div className="
              w-10 h-10 rounded-xl
              bg-blue-500/10 dark:bg-blue-500/20
              flex items-center justify-center
              shrink-0
            ">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <h3 className="flex-1 font-bold text-lg text-slate-900 dark:text-white">
            {title}
          </h3>
          {expandable && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="
                p-2 rounded-lg
                hover:bg-slate-200 dark:hover:bg-slate-700
                transition-colors
              "
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <ICONS.ChevronDown
                className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={`px-5 py-4 ${expandable && !isExpanded ? 'hidden' : ''}`}>
          {children}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="
            px-5 py-4
            border-t border-slate-200 dark:border-slate-700
            bg-slate-50 dark:bg-slate-900/50
            flex gap-3
          ">
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              const isPrimary = action.variant === 'primary' || index === 0;

              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`
                    flex-1 flex items-center justify-center gap-2
                    px-4 py-3 rounded-xl
                    font-bold text-base
                    min-h-[48px]
                    transition-all duration-200
                    active:scale-95
                    ${
                      isPrimary
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  {ActionIcon && <ActionIcon className="w-5 h-5" />}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ToolCard;

