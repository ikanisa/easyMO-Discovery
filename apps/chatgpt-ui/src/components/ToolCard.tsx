/**
 * ToolCard - Base card component for tool results (iframe-safe)
 */

import React, { ReactNode } from 'react';

export interface ToolCardProps {
  title: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  children: ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  icon: Icon,
  children,
  actions = [],
}) => {
  return (
    <div className="
      bg-white dark:bg-slate-800
      rounded-xl
      border border-slate-200 dark:border-slate-700
      shadow-md
      overflow-hidden
      mb-4
    ">
      {/* Header */}
      <div className="
        flex items-center gap-3
        px-4 py-3
        border-b border-slate-200 dark:border-slate-700
        bg-slate-50 dark:bg-slate-900/50
      ">
        {Icon && (
          <div className="
            w-8 h-8 rounded-lg
            bg-blue-500/10 dark:bg-blue-500/20
            flex items-center justify-center
            shrink-0
          ">
            <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        <h3 className="flex-1 font-semibold text-base text-slate-900 dark:text-white">
          {title}
        </h3>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {children}
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="
          px-4 py-3
          border-t border-slate-200 dark:border-slate-700
          bg-slate-50 dark:bg-slate-900/50
          flex gap-2
        ">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`
                px-4 py-2 rounded-lg
                font-medium text-sm
                transition-colors
                ${
                  action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'
                }
              `}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

