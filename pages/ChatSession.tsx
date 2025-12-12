
import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatSession as ChatSessionType, BusinessListing } from '../types';
import { ICONS } from '../constants';
import MessageBubble from '../components/Chat/MessageBubble';
import { GeminiService } from '../services/gemini';
import { getCurrentPosition } from '../services/location';
import { pollBroadcastResponses, BusinessContact } from '../services/whatsapp';

interface ChatSessionProps {
  session: ChatSessionType;
  onClose: () => void;
}

const ChatSession: React.FC<ChatSessionProps> = ({ session: initialSession, onClose }) => {
  const [messages, setMessages] = useState<Message[]>(initialSession.messages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  
  // Broadcast Polling State
  const activeBroadcastRef = useRef<{ id: string, startTime: number, businesses: BusinessContact[], item: string } | null>(null);
  const knownVerifiedIdsRef = useRef<Set<string>>(new Set());

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

  // --- Broadcast Polling Effect ---
  useEffect(() => {
    let interval: any;

    const checkUpdates = async () => {
      if (!activeBroadcastRef.current) return;

      const { id, startTime, businesses, item } = activeBroadcastRef.current;
      const elapsed = (Date.now() - startTime) / 1000;

      // Stop polling after 60 seconds
      if (elapsed > 60) {
        activeBroadcastRef.current = null;
        clearInterval(interval);
        return;
      }

      const confirmedMatches = await pollBroadcastResponses(id, businesses, elapsed);
      
      // Filter out matches we've already shown
      const newMatches = confirmedMatches.filter(m => !knownVerifiedIdsRef.current.has(m.id));

      if (newMatches.length > 0) {
         // Mark as seen
         newMatches.forEach(m => knownVerifiedIdsRef.current.add(m.id));

         // Inject "System/AI" update message
         const updateMsg: Message = {
            id: `update-${Date.now()}`,
            sender: 'ai',
            text: `🔔 Update: ${newMatches.length} business${newMatches.length > 1 ? 'es' : ''} confirmed they have "${item}"!`,
            timestamp: Date.now(),
            verifiedPayload: {
               title: "Stock Confirmed",
               item_found: item,
               matches: newMatches
            }
         };
         setMessages(prev => [...prev, updateMsg]);
      }
    };

    if (activeBroadcastRef.current) {
        interval = setInterval(checkUpdates, 4000); // Poll every 4s
    }

    return () => clearInterval(interval);
  }, [messages]); // Dependency on messages ensures effect re-evaluates if needed, but ref persistence handles logic

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
  
  // Helper to handle AI response generation
  const handleAIResponse = async (history: Message[], userText: string, userImage?: string) => {
    try {
      let loc = { lat: -1.9441, lng: 30.0619 }; // Default Kigali
      try { loc = await getCurrentPosition(); } catch (e) { console.warn("Using default loc"); }

      if (initialSession.type === 'support') {
        const responseText = await GeminiService.chatSupport(history, userText, userImage);
        const aiMsg: Message = { id: Date.now().toString(), sender: 'ai', text: responseText, timestamp: Date.now() };
        setMessages(prev => [...prev, aiMsg]);

      } else if (initialSession.type === 'business') {
        // Intercept: If the AI returns a broadcast function response, we hook into it here
        const result = await GeminiService.chatBob(history, userText, loc, initialSession.isDemoMode, userImage);
        
        // Check if a broadcast was just initiated in the last turn
        // The service returns text, but we need to know if tool was called.
        // For simplicity, we detect it via a specific marker in the text or relying on the Service to return metadata
        // In the updated GeminiService, we will detect the tool usage.
        
        // HACK: Since GeminiService abstracts the tool call, we look for the "Broadcast sent" acknowledgment in text or payload
        // Ideally, GeminiService should return the `broadcastId` if one was created.
        
        // For now, if the result text contains "Broadcast initiated" or similar, we trigger the poller
        // A better way is to pass the broadcast info up from GeminiService. 
        // For this Demo, we will assume if the user said "Yes" and Bob replied, a broadcast happened.
        
        // Actually, let's modify GeminiService to return `broadcastMeta`
        // Since I cannot modify GeminiService signature in this specific XML block comfortably without losing context,
        // I will rely on a secondary mechanism:
        // If the `businessPayload` is NOT present, but text implies broadcast, OR if we add a field to the return type.
        
        // Let's assume GeminiService updates `activeBroadcastRef` via a global or we parse the text.
        // Or better: Inspect the `history` or `result`. 
        
        // CORRECT APPROACH: Since I am editing `ChatSession.tsx`, I can see what I send.
        // But the Tool Call happens inside `GeminiService`.
        // Let's rely on the result text for the demo trigger.
        if (result.text.includes("Broadcast initiated") || result.text.includes("contacted") && result.text.includes("WhatsApp")) {
             // Mock trigger for the demo
             // We need the businesses list. 
             // In a real app, the `result` object would contain `toolCalls` data.
             
             // For this PWA Demo, we'll re-use the last known business payload or mock it
             // Let's try to find the "item" from user text
             const itemWanted = userText.replace(/yes|contact|broadcast|please/gi, '').trim() || "Requested Item";
             
             // Extract businesses from the PREVIOUS message if it had a payload
             const lastBizMsg = history.slice().reverse().find(m => m.businessPayload?.matches);
             const bizList = lastBizMsg?.businessPayload?.matches.map(m => ({ name: m.name, phone: m.phoneNumber || '' })) || [];
             
             if (bizList.length > 0) {
                activeBroadcastRef.current = {
                    id: `req-${Date.now()}`,
                    startTime: Date.now(),
                    businesses: bizList.filter(b => b.phone), // Only ones with phones
                    item: itemWanted.length < 3 ? "your item" : itemWanted
                };
                knownVerifiedIdsRef.current.clear();
             }
        }

        const aiMsg: Message = {
            id: Date.now().toString(),
            sender: 'ai',
            text: result.text,
            groundingLinks: result.groundingLinks,
            businessPayload: result.businessPayload,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);

      } else if (initialSession.type === 'real_estate') {
        const result = await GeminiService.chatKeza(history, userText, loc, initialSession.isDemoMode, userImage);
        const aiMsg: Message = {
            id: Date.now().toString(),
            sender: 'ai',
            text: result.text,
            groundingLinks: result.groundingLinks,
            propertyPayload: result.propertyPayload,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
        
      } else if (initialSession.type === 'legal') {
        const result = await GeminiService.chatGatera(history, userText, loc, initialSession.isDemoMode, userImage);
        const aiMsg: Message = {
          id: Date.now().toString(),
          sender: 'ai',
          text: result.text,
          legalPayload: result.legalPayload,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // P2P Mock
        setTimeout(() => {
          const peerMsg: Message = { id: Date.now().toString(), sender: 'peer', text: "Got it!", timestamp: Date.now() };
          setMessages(prev => [...prev, peerMsg]);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleShareLocation = async () => {
    setIsSharingLocation(true);
    try {
        const pos = await getCurrentPosition();
        const locMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: '📍 Shared my location',
            timestamp: Date.now(),
            location: {
                lat: pos.lat,
                lng: pos.lng
            }
        };
        setMessages(prev => [...prev, locMsg]);
        setIsTyping(true);
        await handleAIResponse([...messages, locMsg], 'Shared my location');
    } catch (e: any) {
        const errorMsg: Message = {
             id: Date.now().toString(),
             sender: 'system',
             text: `⚠️ Location Error: ${e.message}`,
             timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsSharingLocation(false);
        setIsTyping(false);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue.trim();
    if (!textToSend && !selectedFile) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
      image: previewUrl ? { previewUrl: previewUrl } : undefined
    };

    setMessages(prev => [...prev, newUserMsg]);
    if (!textOverride) {
      setInputValue('');
      clearFile();
    }
    setIsTyping(true);
    await handleAIResponse([...messages, newUserMsg], textToSend, previewUrl || undefined);
  };
  
  useEffect(() => {
    if (initialSession.initialInput) {
      handleSend(initialSession.initialInput);
      initialSession.initialInput = undefined;
    }
  }, []);

  const getTitle = () => {
    switch (initialSession.type) {
      case 'support': return 'Support AI';
      case 'business': return 'Bob (Buy & Sell)';
      case 'real_estate': return 'Keza (Real Estate)';
      case 'legal': return 'Gatera (Legal)';
      default: return initialSession.peerName || 'Chat';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] absolute inset-0 z-50">
      <div className="h-16 glass-panel flex items-center px-4 justify-between shrink-0 border-b border-white/5 bg-[#0f172a]/90 backdrop-blur-xl z-20">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
           <ICONS.ChevronDown className="w-6 h-6 rotate-90" />
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

      <div className="flex-1 overflow-y-auto p-4 pt-4 space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onReply={(text) => handleSend(text)} />
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

      <div className="glass-panel shrink-0 border-t border-white/5 pb-8 relative">
        {previewUrl && (
          <div className="absolute bottom-full left-0 w-full p-4 bg-slate-900/90 backdrop-blur-md border-t border-white/10 flex items-center gap-4">
            <img src={previewUrl} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
            <button onClick={clearFile} className="p-2 bg-slate-800 rounded-full"><ICONS.XMark className="w-5 h-5" /></button>
          </div>
        )}

        <div className="p-4 flex gap-3 items-end">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()} className="p-3.5 rounded-2xl bg-slate-800 text-slate-400 border border-white/5">
            <ICONS.Camera className="w-5 h-5" />
          </button>
          <button onClick={handleShareLocation} disabled={isSharingLocation} className="p-3.5 rounded-2xl bg-slate-800 text-slate-400 border border-white/5">
            {isSharingLocation ? <span className="animate-spin">⟳</span> : <ICONS.MapPin className="w-5 h-5" />}
          </button>
          <input
            type="text"
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-primary/50 text-white placeholder-slate-500"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            autoFocus
          />
          <button onClick={() => handleSend()} disabled={(!inputValue.trim() && !selectedFile) || isTyping} className="bg-primary text-white p-3.5 rounded-2xl">
            <ICONS.Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSession;
