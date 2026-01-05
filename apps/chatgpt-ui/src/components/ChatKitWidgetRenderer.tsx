
/**
 * ChatKit Widget Renderer for ChatGPT Apps SDK
 * 
 * Renders ChatKit widgets in iframe context
 * Supports Card, ListView, Form widgets with action handling
 */

import React from 'react';

// Declare window.openai types
declare global {
  interface Window {
    openai?: {
      toolOutput: (output: any) => void;
      callTool: (toolName: string, args: any) => Promise<any>;
      setWidgetState: (state: any) => void;
      getWidgetState: () => any;
    };
  }
}

export interface Widget {
  type: string;
  id?: string;
  [key: string]: any;
}

export interface ActionConfig {
  type: string;
  [key: string]: any;
}

interface ChatKitWidgetRendererProps {
  widget: Widget;
  onAction?: (action: ActionConfig) => void;
  streaming?: boolean;
}

/**
 * Render a ChatKit widget in iframe context
 */
export const ChatKitWidgetRenderer: React.FC<ChatKitWidgetRendererProps> = ({
  widget,
  onAction,
  streaming = false,
}) => {
  if (!widget || !widget.type) {
    return null;
  }

  const handleAction = (action: ActionConfig) => {
    if (window.openai?.callTool) {
      // Call tool via ChatGPT Apps SDK
      window.openai.callTool(action.type, action);
    }
    onAction?.(action);
  };

  switch (widget.type) {
    case 'Card':
      return <CardWidget widget={widget} onAction={handleAction} streaming={streaming} />;
    case 'ListView':
      return <ListViewWidget widget={widget} onAction={handleAction} streaming={streaming} />;
    case 'Form':
      return <FormWidget widget={widget} onAction={handleAction} streaming={streaming} />;
    case 'Text':
    case 'Markdown':
      return <TextWidget widget={widget} streaming={streaming} />;
    default:
      console.warn(`Unknown widget type: ${widget.type}`);
      return null;
  }
};

/**
 * Card Widget Component
 */
const CardWidget: React.FC<{ widget: Widget; onAction?: (action: ActionConfig) => void; streaming?: boolean }> = ({
  widget,
  onAction,
  streaming,
}) => {
  const children = widget.children || [];
  const title = children.find((c: any) => c.type === 'Title')?.value;
  const text = children.find((c: any) => c.type === 'Text')?.value;
  const markdown = children.find((c: any) => c.type === 'Markdown')?.value;
  const buttons = children.filter((c: any) => c.type === 'Button');

  return (
    <div
      id={widget.id}
      className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border border-slate-200 dark:border-slate-700 my-2"
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
        .filter((c: any) => !['Title', 'Text', 'Markdown', 'Button'].includes(c.type))
        .map((child: any, index: number) => (
          <ChatKitWidgetRenderer
            key={index}
            widget={child}
            onAction={onAction}
            streaming={streaming}
          />
        ))}

      {/* Action buttons */}
      {buttons.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {buttons.map((button: any, index: number) => (
            <button
              key={index}
              onClick={() => button.onClickAction && onAction?.(button.onClickAction)}
              disabled={streaming}
              className="
                px-4 py-2 rounded-lg
                bg-blue-600 text-white text-sm font-medium
                hover:bg-blue-700
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {button.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * ListView Widget Component
 */
const ListViewWidget: React.FC<{ widget: Widget; onAction?: (action: ActionConfig) => void; streaming?: boolean }> = ({
  widget,
  onAction,
  streaming,
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
          className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700"
        >
          {item.children?.map((child: any, childIndex: number) => (
            <ChatKitWidgetRenderer
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
      {children.map((child: any, index: number) => {
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
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <button
              key={index}
              type="submit"
              disabled={streaming}
              className="
                w-full px-4 py-2 rounded-lg
                bg-blue-600 text-white text-sm font-medium
                hover:bg-blue-700
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {child.label || 'Submit'}
            </button>
          );
        }
        return (
          <ChatKitWidgetRenderer
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

export default ChatKitWidgetRenderer;

