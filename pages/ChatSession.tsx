
import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatSession as ChatSessionType } from '../types';
import { ICONS } from '../constants';
import MessageBubble from '../components/Chat/MessageBubble';
import { GeminiService } from '../services/gemini';
import { getCurrentPosition } from '../services/location';

interface ChatSessionProps {
  session: ChatSessionType;
  onClose: () => void;
}

const ChatSession: React.FC<ChatSessionProps> = ({ session: initialSession, onClose }) => {
  const [messages, setMessages] = useState<Message[]>(initialSession.messages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Unified send handler for Input box OR UI actions (like Load More buttons)
  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue.trim();
    const imageToSend = previewUrl; // Capture current image before clearing
    
    // Allow sending if there's text OR an image
    if (!textToSend && !selectedFile) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
      image: imageToSend ? { previewUrl: imageToSend } : undefined
    };

    setMessages(prev => [...prev, newUserMsg]);
    
    // Reset Inputs
    if (!textOverride) {
      setInputValue('');
      clearFile();
    }
    setIsTyping(true);

    // --- AI Handler Logic ---
    try {
      if (initialSession.type === 'support') {
        const responseText = await GeminiService.chatSupport(messages, textToSend, imageToSend || undefined);
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: responseText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);

      } else if (initialSession.type === 'business') {
        // --- Buy & Sell Agent ---
        let loc = { lat: -1.9441, lng: 30.0619 }; // Default Kigali
        try {
            loc = await getCurrentPosition();
        } catch (e) {
            console.warn("Using default location for agent");
        }

        const result = await GeminiService.chatBuySellAgent(
          messages, 
          textToSend, 
          loc, 
          initialSession.isDemoMode,
          imageToSend || undefined
        );

        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: result.text,
            groundingLinks: result.groundingLinks,
            businessPayload: result.businessPayload,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);

      } else if (initialSession.type === 'real_estate') {
        // --- Real Estate Agent ---
        let loc = { lat: -1.9441, lng: 30.0619 }; // Default Kigali
        try {
            loc = await getCurrentPosition();
        } catch (e) {
            console.warn("Using default location for agent");
        }

        const result = await GeminiService.chatRealEstateAgent(
          messages, 
          textToSend, 
          loc, 
          initialSession.isDemoMode,
          imageToSend || undefined
        );

        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: result.text,
            groundingLinks: result.groundingLinks,
            propertyPayload: result.propertyPayload,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
        
      } else if (initialSession.type === 'legal') {
        // --- Legal Agent (OCR + Search) ---
        let loc = { lat: -1.9441, lng: 30.0619 };
        try { loc = await getCurrentPosition(); } catch (e) {}

        const result = await GeminiService.chatLegalAgent(
          messages, 
          textToSend, 
          loc, 
          initialSession.isDemoMode, 
          imageToSend || undefined
        );
        
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: result.text,
          legalPayload: result.legalPayload,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // --- P2P Chat Mock ---
        setTimeout(() => {
          const peerMsg: Message = {
            id: (Date.now() + 1).toString(),
            sender: 'peer',
            text: "I'm on my way!",
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, peerMsg]);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };
  
  // Auto-send initial input if present
  useEffect(() => {
    if (initialSession.initialInput) {
      handleSend(initialSession.initialInput);
      initialSession.initialInput = undefined;
    }
  }, []);

  const getTitle = () => {
    switch (initialSession.type) {
      case 'support': return 'Support Assistant';
      case 'business': return 'Buy & Sell Agent';
      case 'real_estate': return 'Real Estate Agent';
      case 'legal': return 'Notary AI Assistant';
      default: return initialSession.peerName || 'Chat';
    }
  };

  const getPlaceholder = () => {
    if (initialSession.type === 'legal') {
      return "Find notary, or draft contract...";
    }
    if (initialSession.type === 'business') {
      return "Looking for products or services?";
    }
    if (initialSession.type === 'real_estate') {
      return "Describe the property you want...";
    }
    return "Type a message...";
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] absolute inset-0 z-50">
      {/* Header */}
      <div className="h-16 glass-panel flex items-center px-4 justify-between shrink-0 border-b border-white/5 bg-[#0f172a]/90 backdrop-blur-xl z-20">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex flex-col items-center">
          <div className="font-semibold text-sm">{getTitle()}</div>
          {(initialSession.type === 'business' || initialSession.type === 'real_estate' || initialSession.type === 'legal') && (
             <span className="text-[10px] text-emerald-400 font-medium">
               {initialSession.isDemoMode ? 'Demo Mode' : 'Grounded AI'}
             </span>
          )}
        </div>
        <div className="w-8" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 pt-4 space-y-6">
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            onReply={(text) => handleSend(text)}
          />
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

      {/* Input Area */}
      <div className="glass-panel shrink-0 border-t border-white/5 pb-8 relative">
        {/* Image Preview Overlay */}
        {previewUrl && (
          <div className="absolute bottom-full left-0 w-full p-4 bg-slate-900/90 backdrop-blur-md border-t border-white/10 flex items-center gap-4 animate-in slide-in-from-bottom-2">
            <div className="h-16 w-16 rounded-lg overflow-hidden border border-white/20 shrink-0 relative group">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ICONS.XMark className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-xs text-slate-400 truncate font-mono">{selectedFile?.name}</p>
               <p className="text-xs text-blue-400 font-bold mt-0.5">Ready to send</p>
            </div>
            <button 
              onClick={clearFile}
              className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white border border-white/5"
            >
              <ICONS.XMark className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-4 flex gap-3 items-end">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileSelect} 
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-white/5"
            title="Upload photo"
          >
            <ICONS.Camera className="w-5 h-5" />
          </button>

          <input
            type="text"
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-primary/50 text-white placeholder-slate-500 transition-all focus:bg-white/10"
            placeholder={getPlaceholder()}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            autoFocus
          />
          
          <button 
            onClick={() => handleSend()}
            disabled={(!inputValue.trim() && !selectedFile) || isTyping}
            className="bg-primary hover:bg-blue-500 disabled:opacity-50 disabled:grayscale text-white p-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <ICONS.Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSession;
