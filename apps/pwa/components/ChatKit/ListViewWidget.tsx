
/**
 * ListView Widget Component
 * 
 * Renders ChatKit ListView widgets for displaying lists of items
 */

import React from 'react';
import WidgetRenderer from './WidgetRenderer';
import { ActionConfig } from './WidgetRenderer';

interface ListViewWidgetProps {
  widget: {
    type: 'ListView';
    id?: string;
    items?: any[];
    [key: string]: any;
  };
  onAction?: (action: ActionConfig) => void;
  streaming?: boolean;
}

export const ListViewWidget: React.FC<ListViewWidgetProps> = ({
  widget,
  onAction,
  streaming = false,
}) => {
  const items = widget.items || [];

  if (items.length === 0) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
        No items to display
      </div>
    );
  }

  return (
    <div
      id={widget.id}
      className="space-y-2 my-2"
    >
      {items.map((item: any, index: number) => (
        <div
          key={item.id || index}
          className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow animate-in fade-in slide-in-from-left-2 duration-200"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {item.children?.map((child: any, childIndex: number) => (
            <WidgetRenderer
              key={childIndex}
              widget={child}
              onAction={onAction}
              streaming={streaming}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default ListViewWidget;

