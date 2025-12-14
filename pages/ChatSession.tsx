
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
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Broadcast Polling State
  const activeBroadcastRef = useRef<{ id: string, startTime: number, businesses: BusinessContact[], item: string } | null>(null);
  const knownVerifiedIdsRef = useRef<Set<string>>(new Set());

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generic File Upload State
  const [selectedGenericFile, setSelectedGenericFile] = useState<File | null>(null);
  const genericFileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, previewUrl, selectedGenericFile]);

  // --- Voice Recognition Setup ---
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US'; // Default to English, could be dynamic

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(prev => (prev ? prev + ' ' : '') + transcript);
            setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
    }
  }, []);

  const toggleListening = () => {
      if (!recognitionRef.current) {
          alert("Voice input is not supported in this browser.");
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
            console.error("Mic start error", e);
            setIsListening(false);
          }
      }
  };

  // --- Broadcast Polling Effect ---
  useEffect(() => {
    let timer: any;

    const checkUpdates = async () => {
      if (!activeBroadcastRef.current) return;

      const { id, startTime, businesses, item } = activeBroadcastRef.current;
      const elapsed = (Date.now() - startTime) / 1000;

      // Stop polling after 90 seconds
      if (elapsed > 90) {
        activeBroadcastRef.current = null;
        return; // End polling
      }

      // Poll Backend
      const confirmedMatches = await pollBroadcastResponses(id, businesses, elapsed);
      
      // Filter out matches we've already shown
      const newMatches = confirmedMatches.filter(m => !knownVerifiedIdsRef.current.has(m.id));

      if (newMatches.length > 0) {
         // Mark as seen
         newMatches.forEach(m => knownVerifiedIdsRef.current.add(m.id));

         // TRIGGER TOAST
         const toastMsg = newMatches.length === 1 
            ? `${newMatches[0].name} has confirmed availability!`
            : `${newMatches.length} businesses confirmed availability!`;
            
         const toast = document.createElement('div');
         toast.className = "fixed bottom-32 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl z-[100] animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500 flex items-center gap-2 border border-emerald-400/30 backdrop-blur-md";
         toast.innerHTML = `<span>✅</span> <span>${toastMsg}</span>`;
         document.body.appendChild(toast);
         
         // Remove toast after 4s
         setTimeout(() => {
            toast.classList.add('fade-out', 'zoom-out');
            setTimeout(() => { if(document.body.contains(toast)) toast.remove(); }, 300);
         }, 4000);

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

      // Recursive timeout for better network behavior than setInterval
      timer = setTimeout(checkUpdates, 5000); 
    };

    if (activeBroadcastRef.current) {
        timer = setTimeout(checkUpdates, 2000);
    }

    return () => clearTimeout(timer);
  }, [activeBroadcastRef.current]);

  // Callback to start polling when user clicks "Ask All"
  const handleBroadcastInitiated = (requestId: string, businesses: BusinessContact[], item: string) => {
      console.log("Starting Polling for:", requestId);
      activeBroadcastRef.current = {
          id: requestId,
          startTime: Date.now(),
          businesses,
          item
      };
      // Reset seen set for new request
      knownVerifiedIdsRef.current.clear();
      setMessages(prev => [...prev]); 
  };

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

  const handleGenericFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedGenericFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearGenericFile = () => {
    setSelectedGenericFile(null);
    if (genericFileInputRef.current) genericFileInputRef.current.value = '';
  };
  
  // Helper to handle AI response generation
  const handleAIResponse = async (history: Message[], userText: string, attachment?: { mimeType: string, data: string }) => {
    try {
      let loc = { lat: -1.9441, lng: 30.0619 }; // Default Kigali
      try { loc = await getCurrentPosition(); } catch (e) { console.warn("Using default loc"); }

      if (initialSession.type === 'support') {
        const responseText = await GeminiService.chatSupport(history, userText, attachment);
        const aiMsg: Message = { id: Date.now().toString(), sender: 'ai', text: responseText, timestamp: Date.now() };
        setMessages(prev => [...prev, aiMsg]);

      } else if (initialSession.type === 'business') {
        const result = await GeminiService.chatBob(history, userText, loc, initialSession.isDemoMode, attachment);
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
        const result = await GeminiService.chatKeza(history, userText, loc, initialSession.isDemoMode, attachment);
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
        const result = await GeminiService.chatGatera(history, userText, loc, initialSession.isDemoMode, attachment);
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Utility to read file as base64 string (without prefix)
  const fileToPart = (file: File): Promise<{ mimeType: string; data: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // remove data:application/pdf;base64, prefix
            const data = base64String.split(',')[1]; 
            resolve({ mimeType: file.type, data });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue.trim();
    if (!textToSend && !selectedFile && !selectedGenericFile) return;

    let attachment = undefined;
    let localPreviewUrl = undefined;

    // Prioritize Generic File if selected (e.g. PDF)
    if (selectedGenericFile) {
        try {
            attachment = await fileToPart(selectedGenericFile);
        } catch (e) {
            console.error("File read error", e);
        }
    } 
    // Handle Image
    else if (selectedFile) {
        try {
            attachment = await fileToPart(selectedFile);
            localPreviewUrl = previewUrl || URL.createObjectURL(selectedFile);
        } catch (e) {
            console.error("Image read error", e);
        }
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
      image: localPreviewUrl ? { previewUrl: localPreviewUrl } : undefined,
      file: selectedGenericFile ? {
        fileName: selectedGenericFile.name,
        fileSize: formatFileSize(selectedGenericFile.size),
        fileType: selectedGenericFile.type
      } : undefined
    };

    setMessages(prev => [...prev, newUserMsg]);
    if (!textOverride) {
      setInputValue('');
      clearFile();
      clearGenericFile();
    }
    setIsTyping(true);
    await handleAIResponse([...messages, newUserMsg], textToSend, attachment);
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f172a] absolute inset-0 z-50 transition-colors duration-300">
      <div className="h-16 glass-panel flex items-center px-4 justify-between shrink-0 border-b border-slate-200 dark:border-white/5 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl z-20">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
           <ICONS.ChevronDown className="w-6 h-6 rotate-90" />
        </button>
        <div className="flex flex-col items-center">
          <div className="font-semibold text-sm text-slate-900 dark:text-white">{getTitle()}</div>
          {(initialSession.type === 'business' || initialSession.type === 'real_estate' || initialSession.type === 'legal') && (
             <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
               {initialSession.isDemoMode ? 'Demo Mode' : 'Grounded AI'}
             </span>
          )}
        </div>
        
        {/* Right Actions Area */}
        <div className="w-8 flex justify-end">
           {initialSession.type === 'legal' && (
              <button 
                onClick={() => window.open('https://wa.me/250795588248?text=Hello,%20I%20need%20legal%20assistance.', '_blank')}
                className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors"
                title="Chat with Human Lawyer"
              >
                 <ICONS.WhatsApp className="w-5 h-5" />
              </button>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-4 space-y-6">
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            onReply={(text) => handleSend(text)} 
            onBroadcastInitiated={handleBroadcastInitiated}
          />
        ))}
        {isTyping && (
           <div className="flex justify-start animate-pulse">
               <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-300 dark:border-white/5 flex gap-2 items-center">
                 <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms'}} />
                 <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms'}} />
                 <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms'}} />
               </div>
           </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="glass-panel shrink-0 border-t border-slate-200 dark:border-white/5 pb-8 relative bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl">
        {previewUrl && (
          <div className="absolute bottom-full left-0 w-full p-4 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-white/10 flex items-center gap-4">
            <img src={previewUrl} alt="Preview" className="h-16 w-16 rounded-lg object-cover shadow-sm" />
            <button onClick={clearFile} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400"><ICONS.XMark className="w-5 h-5" /></button>
          </div>
        )}

        {selectedGenericFile && (
          <div className="absolute bottom-full left-0 w-full p-3 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-white/10 flex items-center gap-3 animate-in slide-in-from-bottom-2">
            <div className="p-2 bg-blue-50 dark:bg-slate-800 rounded-lg text-blue-500 dark:text-blue-400">
               <ICONS.File className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedGenericFile.name}</div>
               <div className="text-[10px] text-slate-500 dark:text-slate-400">{formatFileSize(selectedGenericFile.size)}</div>
            </div>
            <button onClick={clearGenericFile} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors">
               <ICONS.XMark className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-4 flex gap-2 items-end">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
          <input type="file" ref={genericFileInputRef} className="hidden" accept="*/*" onChange={handleGenericFileSelect} />
          
          {/* Attach Button (Paperclip) - Restored */}
          <button onClick={() => genericFileInputRef.current?.click()} className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ICONS.PaperClip className="w-5 h-5" />
          </button>

          {/* Attach Button (Camera) */}
          <button onClick={() => fileInputRef.current?.click()} className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:text-slate-900 dark:hover:text-white transition-colors hidden sm:block">
            <ICONS.Camera className="w-5 h-5" />
          </button>
          
          {/* Voice Input Button */}
          <button 
            onClick={toggleListening}
            className={`p-3.5 rounded-2xl border transition-all ${isListening ? 'bg-red-500 text-white border-red-500 animate-pulse shadow-red-500/30 shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <ICONS.Microphone className="w-5 h-5" />
          </button>

          <input
            type="text"
            className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-primary/50 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 transition-colors"
            placeholder={isListening ? "Listening..." : "Message..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            autoFocus
          />
          <button onClick={() => handleSend()} disabled={(!inputValue.trim() && !selectedFile && !selectedGenericFile) || isTyping} className="bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none">
            <ICONS.Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSession;
