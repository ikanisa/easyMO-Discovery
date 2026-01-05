
/**
 * Card Widget Component
 * 
 * Renders ChatKit Card widgets with support for actions
 */

import React from 'react';
import Button from '../Button';
import WidgetRenderer from './WidgetRenderer';
import { ActionConfig } from './WidgetRenderer';

interface CardWidgetProps {
  widget: {
    type: 'Card';
    id?: string;
    children?: any[];
    [key: string]: any;
  };
  onAction?: (action: ActionConfig) => void;
  streaming?: boolean;
}

export const CardWidget: React.FC<CardWidgetProps> = ({
  widget,
  onAction,
  streaming = false,
}) => {
  const children = widget.children || [];
  const title = children.find((c: any) => c.type === 'Title')?.value;
  const text = children.find((c: any) => c.type === 'Text' || c.type === 'Markdown')?.value;
  const markdown = children.find((c: any) => c.type === 'Markdown')?.value;
  const buttons = children.filter((c: any) => c.type === 'Button');
  const nestedCards = children.filter((c: any) => c.type === 'Card');
  const nestedForms = children.filter((c: any) => c.type === 'Form');

  return (
    <div
      id={widget.id}
      className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 my-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      {title && (
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          {title}
        </h3>
      )}
      {text && !markdown && (
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-4 whitespace-pre-wrap">
          {text}
        </div>
      )}
      {markdown && (
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-4 prose prose-sm dark:prose-invert max-w-none">
          {markdown}
        </div>
      )}
      
      {/* Render nested widgets */}
      {children
        .filter((c: any) => 
          !['Title', 'Text', 'Markdown', 'Button'].includes(c.type) &&
          c.type !== 'Card' &&
          c.type !== 'Form'
        )
        .map((child: any, index: number) => (
          <WidgetRenderer
            key={index}
            widget={child}
            onAction={onAction}
            streaming={streaming}
          />
        ))}

      {/* Nested cards */}
      {nestedCards.map((card: any, index: number) => (
        <CardWidget
          key={index}
          widget={card}
          onAction={onAction}
          streaming={streaming}
        />
      ))}

      {/* Nested forms */}
      {nestedForms.map((form: any, index: number) => (
        <WidgetRenderer
          key={index}
          widget={form}
          onAction={onAction}
          streaming={streaming}
        />
      ))}

      {/* Action buttons */}
      {buttons.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {buttons.map((button: any, index: number) => (
            <Button
              key={index}
              variant="primary"
              fullWidth
              onClick={() => button.onClickAction && onAction?.(button.onClickAction)}
              disabled={streaming}
              size="base"
            >
              {button.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CardWidget;

