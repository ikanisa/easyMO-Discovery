/**
 * Example: How to use RealtimeWidget in MessageBubble or ChatShell
 * 
 * This shows how to integrate RealtimeWidget with existing message rendering
 */

import React from 'react';
import { useRealtimeWidget } from './RealtimeWidget';
import type { Widgets } from '@easymo/chatkit-widget-pack/types';

interface ExampleProps {
  message: {
    id: string;
    widget?: Widgets.Card;
    text?: string;
  };
}

/**
 * Example 1: Using the hook
 */
export function MessageWithRealtimeWidget({ message }: ExampleProps) {
  const updatedWidget = useRealtimeWidget(
    message.widget,
    (newWidget) => {
      // Optional: Update message in state/store
      console.log('Widget updated:', newWidget);
    }
  );

  // Render widget if it exists
  if (updatedWidget) {
    return (
      <div className="widget-container">
        {/* Render your widget here */}
        {/* For now, just show that widget exists */}
        <div className="p-4 bg-slate-100 rounded-lg">
          <p className="text-sm text-slate-600">
            Realtime Widget Active
            {updatedWidget.metadata?.realtime_channel && (
              <span className="ml-2 text-xs">
                (Subscribed to {updatedWidget.metadata.realtime_channel})
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Fallback to text message
  return <div>{message.text}</div>;
}

/**
 * Example 2: Using the component (when full widget rendering is implemented)
 */
export function MessageWithRealtimeWidgetComponent({ message }: ExampleProps) {
  const handleWidgetUpdate = (updatedWidget: Widgets.Card) => {
    // Update message in your state management
    // e.g., updateMessage(message.id, { widget: updatedWidget });
    console.log('Widget updated via component:', updatedWidget);
  };

  if (message.widget) {
    return (
      <div>
        {/* Render widget */}
        <RealtimeWidget
          widget={message.widget}
          onUpdate={handleWidgetUpdate}
          messageId={message.id}
        />
        {/* Actual widget rendering would go here */}
      </div>
    );
  }

  return <div>{message.text}</div>;
}

/**
 * Example 3: Integration with broadcast progress widget
 */
export function BroadcastProgressExample({ campaignId, initialStats }: any) {
  // Import the widget from chatkit-widget-pack
  // import { BroadcastProgressCardRealtime } from '@easymo/chatkit-widget-pack';
  
  // const widget = BroadcastProgressCardRealtime(campaignId, initialStats, targets);
  // const updatedWidget = useRealtimeWidget(widget);
  
  // Render updatedWidget...
  
  return null;
}

