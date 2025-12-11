
import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { Message } from '../types';
import MessageBubble from '../components/Chat/MessageBubble';
import { GeminiService } from '../services/gemini';
import OrderSummaryBubble from '../components/Waiter/OrderSummaryBubble';

interface WaiterGuestProps {
  onBack: () => void;
}

const WaiterGuest: React.FC<WaiterGuestProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system-1',
      sender: 'system',
      text: 'Welcome! I am your AI Waiter. I can help you order drinks and food.',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Hardcoded business ID for mock
      const result = await GeminiService.chatWaiterAgent(messages, userMsg.text, 'biz-1');
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: result.text,
        orderSummary: result.orderSummary,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] absolute inset-0 z-50">
      {/* Header */}
      <div className="h-16 glass-panel flex items-center px-4 justify-between shrink-0 border-b border-white/5 bg-[#0f172a]/90 backdrop-blur-xl z-20">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
           <ICONS.ChevronDown className="w-6 h-6 rotate-90" />
        </button>
        <div className="flex flex-col items-center">
          <div className="font-semibold text-sm">Table 4</div>
          <span className="text-[10px] text-emerald-400 font-medium">Ordering Active</span>
        </div>
        <div className="w-8" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pt-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id}>
            <MessageBubble message={msg} />
            {/* Inject Order Summary directly after message if present */}
            {msg.orderSummary && (
               <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                 <OrderSummaryBubble order={msg.orderSummary} />
               </div>
            )}
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start animate-pulse">
               <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5 flex gap-2 items-center">
                 <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms'}} />
                 <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms'}} />
                 <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms'}} />
               </div>
           </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="p-4 glass-panel shrink-0 pb-8 border-t border-white/5">
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm focus:outline-none focus:border-emerald-500/50 text-white placeholder-slate-500 transition-all focus:bg-white/10"
            placeholder="I'll have a beer and fries..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            autoFocus
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <ICONS.Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaiterGuest;
