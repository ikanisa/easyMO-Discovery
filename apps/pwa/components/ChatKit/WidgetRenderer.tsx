
/**
 * ChatKit Widget Renderer
 * 
 * Renders ChatKit widgets (Card, ListView, Forms) from widget definitions
 * Supports streaming updates and action-driven interactions
 */

import React from 'react';
import { ICONS } from '../../constants';
import Button from '../Button';
import CardWidget from './CardWidget';
import ListViewWidget from './ListViewWidget';

// Widget types from ChatKit
export interface Widget {
  type: string;
  id?: string;
  [key: string]: any;
}

export interface ActionConfig {
  type: string;
  [key: string]: any;
}

interface WidgetRendererProps {
  widget: Widget;
  onAction?: (action: ActionConfig) => void;
  streaming?: boolean;
}

/**
 * Render a ChatKit widget
 */
export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  onAction,
  streaming = false,
}) => {
  if (!widget || !widget.type) {
    return null;
  }

  switch (widget.type) {
    case 'Card':
      return <CardWidget widget={widget} onAction={onAction} streaming={streaming} />;
    case 'ListView':
      return <ListViewWidget widget={widget} onAction={onAction} streaming={streaming} />;
    case 'Form':
      return <FormWidget widget={widget} onAction={onAction} streaming={streaming} />;
    case 'Text':
    case 'Markdown':
      return <TextWidget widget={widget} streaming={streaming} />;
    case 'Title':
      return <TitleWidget widget={widget} />;
    case 'Spacer':
      return <div style={{ height: typeof widget.size === 'number' ? `${widget.size}px` : widget.size || '8px' }} />;
    case 'Divider':
      return <div className="border-t border-slate-200 dark:border-slate-700 my-2" />;
    default:
      console.warn(`Unknown widget type: ${widget.type}`);
      return null;
  }
};

/**
 * Title Widget Component
 */
const TitleWidget: React.FC<{ widget: Widget }> = ({ widget }) => {
  return (
    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
      {widget.value}
    </h3>
  );
};

/**
 * Form Widget Component
 */
const FormWidget: React.FC<{ widget: Widget; onAction?: (action: ActionConfig) => void; streaming?: boolean }> = ({
  widget,
  onAction,
  streaming,
}) => {
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const children = widget.children || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (widget.onSubmitAction) {
      onAction?.({
        ...widget.onSubmitAction,
        formData,
      });
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 my-2">
      {children.map((child: Widget, index: number) => {
        if (child.type === 'Input') {
          return (
            <div key={index} className="space-y-1">
              {child.label && (
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {child.label}
                </label>
              )}
              <input
                type={child.inputType || 'text'}
                name={child.name}
                placeholder={child.placeholder}
                value={formData[child.name] || child.defaultValue || ''}
                onChange={(e) => handleInputChange(child.name, e.target.value)}
                required={child.required}
                disabled={streaming}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          );
        }
        if (child.type === 'Textarea') {
          return (
            <div key={index} className="space-y-1">
              {child.label && (
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {child.label}
                </label>
              )}
              <textarea
                name={child.name}
                placeholder={child.placeholder}
                value={formData[child.name] || child.defaultValue || ''}
                onChange={(e) => handleInputChange(child.name, e.target.value)}
                required={child.required}
                disabled={streaming}
                rows={child.rows || 4}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          );
        }
        if (child.type === 'Select') {
          return (
            <div key={index} className="space-y-1">
              {child.label && (
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {child.label}
                </label>
              )}
              <select
                name={child.name}
                value={formData[child.name] || child.defaultValue || ''}
                onChange={(e) => handleInputChange(child.name, e.target.value)}
                required={child.required}
                disabled={streaming}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {child.placeholder && (
                  <option value="">{child.placeholder}</option>
                )}
                {child.options?.map((option: any) => (
                  <option key={option.value || option} value={option.value || option}>
                    {option.label || option}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        if (child.type === 'Button') {
          return (
            <Button
              key={index}
              type="submit"
              variant="primary"
              fullWidth
              disabled={streaming}
            >
              {child.label || 'Submit'}
            </Button>
          );
        }
        return (
          <WidgetRenderer
            key={index}
            widget={child}
            onAction={onAction}
            streaming={streaming}
          />
        );
      })}
    </form>
  );
};

/**
 * Text/Markdown Widget Component
 */
const TextWidget: React.FC<{ widget: Widget; streaming?: boolean }> = ({
  widget,
  streaming,
}) => {
  const value = widget.value || '';
  const id = widget.id;

  return (
    <div
      id={id}
      className={`text-sm text-slate-600 dark:text-slate-400 ${streaming ? 'opacity-70' : ''}`}
    >
      {widget.type === 'Markdown' ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {value}
        </div>
      ) : (
        <p className="whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
};

export default WidgetRenderer;

