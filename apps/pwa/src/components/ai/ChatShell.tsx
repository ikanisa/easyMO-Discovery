/**
 * ChatShell - Main AI-first chat interface (default route)
 * Combines chat composer, quick actions, and tool card rendering
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, ChatSession as ChatSessionType } from '@easymo/shared/types';
import { ICONS } from '../../../constants';
import MessageBubble from '../Chat/MessageBubble';
import QuickActionChip, { QuickAction } from './QuickActionChip';
import MobilityMatchCard from './MobilityMatchCard';
import ListingResultsCard from './ListingResultsCard';
import PaymentQRCard from './PaymentQRCard';
import ScannerResultCard from './ScannerResultCard';
import LocationStatusBar from './LocationStatusBar';
import { AgentService, type StreamingChunk } from '../../services/agent';
import { getCurrentPosition } from '../../services/location';
import { supabase } from '../../services/supabase';
import { hapticFeedback } from '../../utils/ui';
import { toast } from 'sonner';
import WidgetRenderer, { ActionConfig } from '../ChatKit/WidgetRenderer';

interface ChatShellProps {
  conversationId?: string;
  userId?: string;
  onNavigate?: (view: string) => void;
  onClose?: () => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'nearby-drivers',
    label: 'Nearby Drivers',
    icon: ICONS.Car || (() => <span>🚗</span>),
    onClick: () => {},
    color: 'blue',
  },
  {
    id: 'nearby-passengers',
    label: 'Nearby Passengers',
    icon: ICONS.User || (() => <span>👥</span>),
    onClick: () => {},
    color: 'green',
  },
  {
    id: 'buy-sell',
    label: 'Buy/Sell',
    icon: ICONS.Store || (() => <span>🛒</span>),
    onClick: () => {},
    color: 'purple',
  },
  {
    id: 'generate-momo',
    label: 'Generate MoMo QR',
    icon: ICONS.QrCode || (() => <span>💳</span>),
    onClick: () => {},
    color: 'orange',
  },
  {
    id: 'scan-qr',
    label: 'Scan QR',
    icon: ICONS.Scan || (() => <span>📷</span>),
    onClick: () => {},
    color: 'red',
  },
  {
    id: 'onboard-business',
    label: 'Onboard Business',
    icon: ICONS.Store || (() => <span>🏢</span>),
    onClick: () => {},
    color: 'blue',
  },
];

const ChatShell: React.FC<ChatShellProps> = ({
  conversationId,
  userId,
  onNavigate,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const [streamingWidgets, setStreamingWidgets] = useState<Map<string, any>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => (prev ? prev + ' ' : '') + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Load conversation history
  useEffect(() => {
    if (conversationId && userId) {
      // Load messages from Supabase
      // This would be implemented with the persistence layer
    }
  }, [conversationId, userId]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        sender: 'ai',
        text: 'Hi! How can I help you today? I can help you find rides, businesses, generate payment QR codes, and more.',
        timestamp: Date.now(),
      }]);
    }
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Get user location
  const updateLocation = async () => {
    try {
      const pos = await getCurrentPosition();
      setUserLocation({ lat: pos.lat, lng: pos.lng });
      setLastLocationUpdate(new Date());
      setIsOnline(true);
    } catch (error) {
      console.error('Location error:', error);
      setIsOnline(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    hapticFeedback('medium');

    try {
      // Update location if available
      if (!userLocation) {
        await updateLocation();
      }

      // Stream response from agent
      const chunks: StreamingChunk[] = [];
      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: '',
        timestamp: Date.now(),
      };

      // Use async generator for streaming
      const stream = AgentService.chatStream(
        [...messages, userMessage],
        'router',
        userId,
        userLocation || undefined,
        conversationId
      );

      for await (const chunk of stream) {
        chunks.push(chunk);

        // Handle text streaming with stable ID
        if (chunk.type === 'token' && chunk.content) {
          assistantMessage.text += chunk.content;
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.sender === 'ai' && lastMsg.id === assistantMessage.id) {
              updated[updated.length - 1] = { ...assistantMessage };
            } else {
              updated.push({ ...assistantMessage });
            }
            return updated;
          });
        }

        // Handle widget streaming updates
        if (chunk.type === 'widget' && chunk.widget) {
          const widget = chunk.widget;
          if (widget.id) {
            setStreamingWidgets(prev => {
              const updated = new Map(prev);
              updated.set(widget.id, widget);
              return updated;
            });
          }
        }

        // Handle tool results (legacy support)
        if (chunk.type === 'tool_result' && chunk.tool_result) {
          try {
            const result = JSON.parse(chunk.tool_result);
            // Handle structured output for tool cards
            if (result.matches) {
              assistantMessage.mobilityPayload = result;
            } else if (result.listings) {
              assistantMessage.businessPayload = result;
            } else if (result.qr_data_url) {
              assistantMessage.paymentPayload = result;
            } else if (result.parsed) {
              assistantMessage.scannerPayload = result;
            }
          } catch (e) {
            console.warn('Failed to parse tool result:', e);
          }
        }

        if (chunk.type === 'done') {
          // Finalize streaming widgets
          setStreamingWidgets(prev => {
            const updated = new Map(prev);
            updated.forEach((widget, id) => {
              updated.set(id, { ...widget, streaming: false });
            });
            return updated;
          });

          if (chunk.structured_output) {
            const output = chunk.structured_output;
            if (output.matches) {
              assistantMessage.mobilityPayload = output;
            } else if (output.listings) {
              assistantMessage.businessPayload = output;
            } else if (output.qr_data_url) {
              assistantMessage.paymentPayload = output;
            }
          }
          setIsTyping(false);
        }

        if (chunk.type === 'error') {
          toast.error(chunk.error || 'An error occurred');
          setIsTyping(false);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    hapticFeedback('light');
    setInputValue(action.label);
    // Trigger send after a brief delay to show the input
    setTimeout(() => {
      setInputValue('');
      // Actually send the message
      const quickActionMessages: Record<string, string> = {
        'nearby-drivers': 'Find nearby drivers',
        'nearby-passengers': 'Find nearby passengers',
        'buy-sell': 'Find businesses nearby',
        'generate-momo': 'Generate MoMo QR code',
        'scan-qr': 'Scan QR code',
        'onboard-business': 'I want to onboard my business',
      };
      const query = quickActionMessages[action.id] || action.label;
      setInputValue(query);
      setTimeout(() => handleSend(), 100);
    }, 100);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Mic error:', e);
        setIsListening(false);
      }
    }
  };

  const handleToggleOffline = async (currentlyOnline: boolean) => {
    if (currentlyOnline) {
      // Go offline
      setIsOnline(false);
      toast.info('You are now offline');
    } else {
      // Go online
      await updateLocation();
      toast.success('You are now online');
    }
  };

  // Handle action from widgets
  const handleAction = async (action: ActionConfig) => {
    hapticFeedback('medium');
    
    try {
      // Send action to agent
      const actionMessage: Message = {
        id: Date.now().toString(),
        sender: 'user',
        text: `[Action: ${action.type}]`,
        timestamp: Date.now(),
        actionPayload: action,
      };

      setMessages(prev => [...prev, actionMessage]);
      setIsTyping(true);

      // Stream response for action
      const stream = AgentService.chatStream(
        [...messages, actionMessage],
        'router',
        userId,
        userLocation || undefined,
        conversationId
      );

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: '',
        timestamp: Date.now(),
      };

      for await (const chunk of stream) {
        if (chunk.type === 'token' && chunk.content) {
          assistantMessage.text += chunk.content;
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.sender === 'ai' && lastMsg.id === assistantMessage.id) {
              updated[updated.length - 1] = { ...assistantMessage };
            } else {
              updated.push({ ...assistantMessage });
            }
            return updated;
          });
        }

        if (chunk.type === 'widget' && chunk.widget) {
          const widget = chunk.widget;
          if (widget.id) {
            setStreamingWidgets(prev => {
              const updated = new Map(prev);
              updated.set(widget.id, widget);
              return updated;
            });
          }
        }

        if (chunk.type === 'done') {
          setIsTyping(false);
        }

        if (chunk.type === 'error') {
          toast.error(chunk.error || 'Action failed');
          setIsTyping(false);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process action');
      setIsTyping(false);
    }
  };

  // Render tool cards from message payloads (legacy support)
  const renderToolCards = (message: Message) => {
    const cards = [];

    // Mobility matches
    if (message.mobilityPayload?.matches) {
      message.mobilityPayload.matches.forEach((match: any, index: number) => {
        cards.push(
          <MobilityMatchCard
            key={`mobility-${index}`}
            match={match}
            onRequestRide={(id) => {
              handleAction({ type: 'request_ride', matchId: id });
            }}
            onAccept={(id) => {
              handleAction({ type: 'accept_ride', requestId: id });
            }}
            onViewDetails={(id) => {
              onNavigate?.('discovery');
            }}
          />
        );
      });
    }

    // Marketplace listings
    if (message.businessPayload?.listings) {
      message.businessPayload.listings.forEach((listing: any, index: number) => {
        cards.push(
          <ListingResultsCard
            key={`listing-${index}`}
            listing={listing}
            onViewDetails={(id) => {
              onNavigate?.('business');
            }}
            onContact={(id) => {
              handleAction({ type: 'contact_business', businessId: id });
            }}
          />
        );
      });
    }

    // Payment QR
    if (message.paymentPayload?.qr_data_url) {
      cards.push(
        <PaymentQRCard
          key="payment-qr"
          qrData={message.paymentPayload}
          onShare={(data) => {
            toast.info('Sharing QR code...');
          }}
        />
      );
    }

    // Scanner result
    if (message.scannerPayload?.parsed) {
      cards.push(
        <ScannerResultCard
          key="scanner-result"
          result={message.scannerPayload}
          onPay={(result) => {
            handleAction({ type: 'process_payment', qrData: result });
          }}
          onCopy={(result) => {
            toast.success('Copied!');
          }}
        />
      );
    }

    return cards;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f172a]">
      {/* Header */}
      <div className="
        shrink-0
        px-4 py-3
        bg-white dark:bg-slate-900
        border-b border-slate-200 dark:border-slate-700
        flex items-center justify-between
      ">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ICONS.ChevronDown className="w-5 h-5 rotate-90 text-slate-600 dark:text-slate-400" />
            </button>
          )}
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            easyMO
          </h1>
        </div>

        {/* Location Status */}
        {lastLocationUpdate && (
          <LocationStatusBar
            isOnline={isOnline}
            lastUpdated={lastLocationUpdate}
            onToggleOffline={handleToggleOffline}
          />
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* Quick Actions (shown when no messages or at top) */}
        {messages.length <= 1 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Quick Actions
            </h2>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action, index) => (
                <QuickActionChip
                  key={action.id}
                  action={{
                    ...action,
                    onClick: () => handleQuickAction(action),
                  }}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence>
          {messages.map((message) => (
            <React.Fragment key={message.id}>
              <MessageBubble message={message} />
              {/* Render ChatKit widgets */}
              {message.widget && (
                <WidgetRenderer
                  widget={message.widget}
                  onAction={handleAction}
                  streaming={isTyping && message.id === messages[messages.length - 1]?.id}
                />
              )}
              {/* Legacy tool cards */}
              {renderToolCards(message)}
            </React.Fragment>
          ))}
        </AnimatePresence>

        {/* Streaming widgets (standalone) */}
        {Array.from(streamingWidgets.values()).map((widget) => (
          <WidgetRenderer
            key={widget.id}
            widget={widget}
            onAction={handleAction}
            streaming={widget.streaming !== false}
          />
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">AI is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="
        shrink-0
        px-4 py-3
        bg-white dark:bg-slate-900
        border-t border-slate-200 dark:border-slate-700
      ">
        <div className="flex items-end gap-2">
          {/* Voice Input */}
          <button
            onClick={toggleListening}
            className={`
              p-3 rounded-xl
              transition-all
              ${isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }
            `}
            aria-label="Voice input"
          >
            <ICONS.Microphone className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              inputMode="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              className="
                w-full
                px-4 py-3
                rounded-xl
                bg-slate-100 dark:bg-slate-800
                border border-slate-200 dark:border-slate-700
                text-slate-900 dark:text-white
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="
              p-3 rounded-xl
              bg-blue-600 text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:bg-blue-700
              transition-colors
            "
            aria-label="Send message"
          >
            <ICONS.Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatShell;

