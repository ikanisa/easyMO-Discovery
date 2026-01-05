/**
 * ChatGPT UI Bundle
 * Minimal embedded UI for ChatGPT Apps SDK (iframe-safe)
 * Uses window.openai APIs for tool rendering
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MobilityMatchCard } from './components/MobilityMatchCard';
import { ListingResultsCard } from './components/ListingResultsCard';
import { PaymentQRCard } from './components/PaymentQRCard';
import { ScannerResultCard } from './components/ScannerResultCard';
import { ToolCard } from './components/ToolCard';
import ChatKitWidgetRenderer from './components/ChatKitWidgetRenderer';

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

interface ToolResult {
  tool_name: string;
  success: boolean;
  [key: string]: any;
}

/**
 * Main App Component
 */
function App() {
  const [toolResult, setToolResult] = useState<ToolResult | null>(null);
  const [widgetState, setWidgetState] = useState<any>({});
  const [chatKitWidget, setChatKitWidget] = useState<any>(null);
  const [streamingWidgets, setStreamingWidgets] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    // Listen for tool calls and widgets from ChatGPT
    const handleMessage = (event: MessageEvent) => {
      // Handle tool results (legacy support)
      if (event.data?.type === 'tool_result') {
        setToolResult(event.data.result);
        
        // Check if tool result includes a widget
        if (event.data.result?.widget) {
          setChatKitWidget(event.data.result.widget);
        }
        
        // Send tool output back to ChatGPT
        if (window.openai?.toolOutput) {
          window.openai.toolOutput(event.data.result);
        }
      }
      
      // Handle ChatKit widget updates
      if (event.data?.type === 'widget' && event.data.widget) {
        const widget = event.data.widget;
        if (widget.id) {
          setStreamingWidgets(prev => {
            const updated = new Map(prev);
            updated.set(widget.id, widget);
            return updated;
          });
        } else {
          setChatKitWidget(widget);
        }
      }
      
      // Handle widget state
      if (event.data?.type === 'widget_state') {
        setWidgetState(event.data.state || {});
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Load initial widget state
    if (window.openai?.getWidgetState) {
      const state = window.openai.getWidgetState();
      if (state) {
        setWidgetState(state);
        if (state.widget) {
          setChatKitWidget(state.widget);
        }
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Update widget state when it changes
  useEffect(() => {
    if (window.openai?.setWidgetState) {
      window.openai.setWidgetState({
        ...widgetState,
        widget: chatKitWidget,
      });
    }
  }, [widgetState, chatKitWidget]);

  // Handle action from widgets
  const handleAction = async (action: any) => {
    // Call tool via ChatGPT Apps SDK
    if (window.openai?.callTool) {
      try {
        const result = await window.openai.callTool(action.type, action);
        // Handle result (may include updated widget)
        if (result?.widget) {
          setChatKitWidget(result.widget);
        }
      } catch (error: any) {
        console.error('Action failed:', error);
      }
    }
  };

  const renderToolCard = () => {
    if (!toolResult) return null;

    const { tool_name, success, ...data } = toolResult;

    switch (tool_name) {
      case 'set_presence':
      case 'find_driver_matches':
      case 'find_passenger_requests':
        return (
          <MobilityMatchCard
            data={data}
            onAction={(action, payload) => {
              if (window.openai?.callTool) {
                window.openai.callTool(action, payload);
              }
            }}
          />
        );

      case 'search_listings':
      case 'create_listing':
        return (
          <ListingResultsCard
            data={data}
            onAction={(action, payload) => {
              if (window.openai?.callTool) {
                window.openai.callTool(action, payload);
              }
            }}
          />
        );

      case 'generate_momo_qr':
      case 'parse_qr':
        if (tool_name === 'generate_momo_qr') {
          return <PaymentQRCard data={data} />;
        }
        return <ScannerResultCard data={data} />;

      default:
        // Check if tool result includes a widget
        if (data.widget) {
          return (
            <ChatKitWidgetRenderer
              widget={data.widget}
              onAction={handleAction}
              streaming={false}
            />
          );
        }
        
        return (
          <ToolCard
            title={tool_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            icon={null}
          >
            <div className="space-y-2">
              {success ? (
                <pre className="text-sm text-slate-600 dark:text-slate-400 overflow-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              ) : (
                <div className="text-red-600 dark:text-red-400">
                  Error: {data.error || 'Unknown error'}
                </div>
              )}
            </div>
          </ToolCard>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Render ChatKit widgets (priority) */}
        {chatKitWidget && (
          <ChatKitWidgetRenderer
            widget={chatKitWidget}
            onAction={handleAction}
            streaming={false}
          />
        )}

        {/* Render streaming widgets */}
        {Array.from(streamingWidgets.values()).map((widget) => (
          <ChatKitWidgetRenderer
            key={widget.id}
            widget={widget}
            onAction={handleAction}
            streaming={widget.streaming !== false}
          />
        ))}

        {/* Legacy tool cards (fallback) */}
        {!chatKitWidget && streamingWidgets.size === 0 && toolResult && (
          renderToolCard()
        )}

        {/* Empty state */}
        {!chatKitWidget && streamingWidgets.size === 0 && !toolResult && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p>Waiting for tool results or widgets...</p>
            <p className="text-sm mt-2">This UI will render widgets and tool cards when tools are executed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Entry point for iframe embedding
if (typeof window !== 'undefined') {
  const root = document.getElementById('root');
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

export { App };
