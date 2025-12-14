
import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import Button from '../components/Button';
import MessageBubble from '../components/Chat/MessageBubble';
import { supabase } from '../services/supabase';
import { Role, VehicleType, Message } from '../types';
import { GeminiService } from '../services/gemini';
import { getCurrentPosition } from '../services/location';

interface BusinessOnboardingProps {
  onComplete: (role: Role) => void;
  onCancel: () => void;
}

// Centralized Vehicle Types definition matching system standard
const DRIVER_VEHICLE_TYPES: VehicleType[] = ['moto', 'cab', 'liffan', 'truck', 'other'];

const BusinessOnboarding: React.FC<BusinessOnboardingProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- DRIVER FORM STATE ---
  const [driverName, setDriverName] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('moto');
  const [plateNumber, setPlateNumber] = useState('');

  // --- BUSINESS CHAT STATE ---
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I'm here to help you register your business. What is the name of your shop or service?",
      timestamp: Date.now()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // The "Live Draft" Profile
  const [bizDraft, setBizDraft] = useState({
    name: '',
    description: '',
    address: '',
    location: undefined as {lat: number, lng: number} | undefined
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setStep(2);
  };

  // --- LOGIC: Driver Submit ---
  // Mandatory fields: Name, Plate, Vehicle Type
  const isDriverValid = driverName.trim().length > 0 && plateNumber.trim().length > 0 && !!vehicleType;

  const handleDriverSubmit = async () => {
    if (!isDriverValid) return;
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const updates: any = {
        id: user.id,
        role: 'driver',
        display_name: driverName,
        vehicle_plate: plateNumber.toUpperCase(),
        bio: `${vehicleType.toUpperCase()} Driver`,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      setStep(3);
      setTimeout(() => onComplete('driver'), 2000);
    } catch (e: any) {
      alert(`Error saving profile: ${e.message}`);
      setIsLoading(false);
    }
  };

  // --- LOGIC: Business Chat ---
  const handleBusinessChatSend = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatInput,
      timestamp: Date.now()
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      let loc = { lat: -1.9441, lng: 30.0619 };
      try {
        loc = await getCurrentPosition();
      } catch (e) {
        /* ignore geolocation errors */
      }

      // Call dedicated Onboarding Agent
      const response = await GeminiService.onboardBusiness(chatMessages, userMsg.text, loc);
      
      // Update Draft if data extracted
      if (response.extractedData) {
         setBizDraft(prev => ({
            ...prev,
            name: response.extractedData?.name || prev.name,
            description: response.extractedData?.description || prev.description,
            address: response.extractedData?.address || prev.address,
            location: response.extractedData?.location || prev.location
         }));
      }

      const aiMsg: Message = {
        id: Date.now().toString() + 'ai',
        sender: 'ai',
        text: response.text,
        timestamp: Date.now()
      };
      
      setChatMessages(prev => [...prev, aiMsg]);

    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleBusinessSave = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const updates: any = {
        id: user.id,
        role: 'vendor',
        display_name: bizDraft.name || "Business",
        bio: `${bizDraft.description} - ${bizDraft.address}`,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      setStep(3);
      setTimeout(() => onComplete('vendor'), 2000);
    } catch (e: any) {
      alert(`Error saving profile: ${e.message}`);
      setIsLoading(false);
    }
  };

  // --- RENDER ---

  // 1. ROLE SELECTION
  if (step === 1) {
    return (
      <div className="flex flex-col h-full px-6 pt-20 pb-10 relative overflow-hidden">
        <div className="text-center mb-10 z-10 animate-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Partner with easyMO</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
            Turn your asset into income. Join the fastest growing network in Rwanda.
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-4 z-10 max-w-md mx-auto w-full">
          {/* Driver Card */}
          <button 
            onClick={() => handleRoleSelect('driver')}
            className="group relative h-40 w-full rounded-3xl overflow-hidden shadow-xl transition-transform active:scale-[0.98] border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute top-0 right-0 p-4 opacity-20">
               <ICONS.Car className="w-24 h-24 text-white" />
            </div>
            <div className="relative z-10 p-6 flex flex-col items-start h-full justify-end text-left">
               <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl text-white mb-2">
                 <ICONS.Bike className="w-6 h-6" />
               </div>
               <h3 className="text-2xl font-black text-white">I am a Driver</h3>
               <p className="text-blue-100 text-xs font-medium">Moto, Cab, Truck, Liffan & More</p>
            </div>
          </button>

          {/* Merchant Card */}
          <button 
            onClick={() => handleRoleSelect('vendor')}
            className="group relative h-40 w-full rounded-3xl overflow-hidden shadow-xl transition-transform active:scale-[0.98] border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute top-0 right-0 p-4 opacity-20">
               <ICONS.Store className="w-24 h-24 text-white" />
            </div>
            <div className="relative z-10 p-6 flex flex-col items-start h-full justify-end text-left">
               <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl text-white mb-2">
                 <ICONS.Store className="w-6 h-6" />
               </div>
               <h3 className="text-2xl font-black text-white">I am a Merchant</h3>
               <p className="text-emerald-100 text-xs font-medium">Shop, Pharmacy, Service</p>
            </div>
          </button>
        </div>

        <button onClick={onCancel} className="mt-8 text-sm font-bold text-slate-400 hover:text-slate-600 z-10">
          Cancel
        </button>
      </div>
    );
  }

  // 2. DRIVER FORM (Strict Mode as requested)
  if (step === 2 && selectedRole === 'driver') {
    return (
      <div className="flex flex-col h-full bg-[#0f172a] text-white">
         <div className="px-6 pt-10 pb-6 border-b border-white/5 bg-[#0f172a] z-10">
            <button onClick={() => setStep(1)} className="mb-4 text-slate-400 hover:text-white flex items-center gap-1 text-sm font-bold">
               <ICONS.ChevronDown className="w-4 h-4 rotate-90" /> Back
            </button>
            <h2 className="text-2xl font-black">Driver Details</h2>
            <p className="text-slate-400 text-xs">Step 2 of 2</p>
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Name */}
            <div className="space-y-3">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Name</label>
               <input 
                 type="text" 
                 value={driverName}
                 onChange={e => setDriverName(e.target.value)}
                 className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 font-bold text-white focus:border-blue-500 outline-none transition-colors"
                 placeholder="e.g. John Doe"
               />
            </div>

            {/* Vehicle Type - Centralized & Mandatory */}
            <div className="space-y-3">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vehicle Type</label>
               <div className="flex flex-wrap gap-3">
                  {DRIVER_VEHICLE_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setVehicleType(type)}
                      className={`
                        flex-1 min-w-[80px] py-4 rounded-xl text-sm font-bold capitalize transition-all border
                        ${vehicleType === type 
                          ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}
                      `}
                    >
                      {type}
                    </button>
                  ))}
               </div>
            </div>

            {/* Plate - Mandatory */}
            <div className="space-y-3">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plate Number</label>
               <input 
                 type="text" 
                 value={plateNumber}
                 onChange={e => setPlateNumber(e.target.value.toUpperCase())}
                 className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-5 text-center font-black text-2xl text-yellow-500 focus:border-yellow-500/50 outline-none placeholder-slate-700 uppercase tracking-[0.2em] font-mono shadow-inner"
                 placeholder="RAA 000 A"
               />
            </div>
         </div>

         <div className="p-6 border-t border-white/5 bg-[#0f172a]">
            <Button 
              variant="primary" 
              fullWidth 
              onClick={handleDriverSubmit}
              disabled={!isDriverValid || isLoading}
              className="h-14 font-bold text-sm bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
            >
              {isLoading ? 'Registering...' : 'Complete Registration'}
            </Button>
         </div>
      </div>
    );
  }

  // 3. BUSINESS CHAT (Robust Implementation)
  if (step === 2 && selectedRole === 'vendor') {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f172a] relative">
         {/* Live Draft Card (Overlay) */}
         <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between transition-all">
            <div className="flex-1 min-w-0 pr-4">
               <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Live Draft
               </div>
               <h3 className="font-black text-slate-900 dark:text-white truncate text-lg">
                  {bizDraft.name || "Business Name"}
               </h3>
               <p className="text-xs text-slate-500 truncate">
                  {bizDraft.description || "Description pending..."}
               </p>
            </div>
            {bizDraft.name && bizDraft.description && bizDraft.address && (
               <button 
                 onClick={handleBusinessSave}
                 className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 animate-in zoom-in"
               >
                 Save Profile
               </button>
            )}
         </div>

         {/* Chat Area */}
         <div className="flex-1 overflow-y-auto pt-24 pb-4 px-4 space-y-4">
            {chatMessages.map(msg => (
               <MessageBubble key={msg.id} message={msg} />
            ))}
            {isTyping && (
               <div className="flex justify-start">
                  <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                     <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"/>
                     <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"/>
                     <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"/>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
         </div>

         {/* Input Area */}
         <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5">
            <div className="flex gap-2">
               <input 
                 className="flex-1 bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-900 dark:text-white"
                 placeholder="Type here..."
                 value={chatInput}
                 onChange={e => setChatInput(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleBusinessChatSend()}
                 autoFocus
               />
               <button 
                 onClick={handleBusinessChatSend}
                 disabled={!chatInput.trim() || isTyping}
                 className="bg-blue-600 text-white p-3 rounded-xl disabled:opacity-50 disabled:bg-slate-700"
               >
                 <ICONS.Send className="w-5 h-5" />
               </button>
            </div>
         </div>
      </div>
    );
  }

  // SUCCESS STATE
  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 bg-slate-50 dark:bg-[#0f172a] animate-in zoom-in duration-500">
         <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 mb-6">
            <ICONS.Check className="w-12 h-12" />
         </div>
         <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Welcome Aboard!</h2>
         <p className="text-slate-500 text-center mb-8">
            Your profile is now live.
         </p>
      </div>
    );
  }

  return null;
};

export default BusinessOnboarding;
