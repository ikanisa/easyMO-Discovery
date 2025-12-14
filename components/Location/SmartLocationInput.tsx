
import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../../constants';
import { GeminiService } from '../../services/gemini';
import { getCurrentPosition } from '../../services/location';
import { AddressBookService } from '../../services/addressBook';
import { SavedAddress, AddressLabel } from '../../types';

// Declare Google Maps types for TS
declare global {
  interface Window {
    google: any;
    gm_authFailure: () => void;
  }
}

interface SmartLocationInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onLocationResolved?: (loc: { lat: number; lng: number; address: string }) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const SmartLocationInput: React.FC<SmartLocationInputProps> = ({ 
  label, 
  value, 
  onChange, 
  onLocationResolved,
  placeholder,
  autoFocus
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedCoords, setResolvedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geminiInsight, setGeminiInsight] = useState<string | null>(null);
  
  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const googleMap = useRef<any>(null);
  const marker = useRef<any>(null);
  const autocomplete = useRef<any>(null);

  useEffect(() => {
    setSavedAddresses(AddressBookService.getAll());
  }, []);

  // --- 1. ROBUST MAPS LOADER ---
  const loadGoogleMaps = (): Promise<void> => {
    if (window.google && window.google.maps) return Promise.resolve();

    return new Promise((resolve, reject) => {
      if (document.querySelector('#google-maps-script')) {
         const interval = setInterval(() => {
             if (window.google && window.google.maps) {
                 clearInterval(interval);
                 resolve();
             }
         }, 100);
         return;
      }

      window.gm_authFailure = () => {
         console.error("Google Maps Authentication Failure");
         setMapError("Invalid API Key or Billing Issue. Switching to Text Mode.");
      };

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.API_KEY}&libraries=places,marker,geometry&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error("Network Error loading Maps SDK"));
      document.head.appendChild(script);
    });
  };

  // --- 2. INITIALIZE AUTOCOMPLETE ---
  useEffect(() => {
    if (inputRef.current && !autocomplete.current) {
        loadGoogleMaps().then(async () => {
             try {
                const { Autocomplete } = await window.google.maps.importLibrary("places");
                
                const ac = new Autocomplete(inputRef.current, {
                    fields: ["formatted_address", "geometry", "name"],
                    componentRestrictions: { country: "rw" },
                });

                ac.addListener("place_changed", () => {
                    const place = ac.getPlace();
                    if (place.geometry && place.geometry.location) {
                        const addr = place.formatted_address || place.name;
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        
                        setResolvedAddress(addr);
                        setResolvedCoords({ lat, lng });
                        onChange(addr);
                        if (onLocationResolved) {
                            onLocationResolved({ lat, lng, address: addr });
                        }
                        setShowSavedList(false);
                    }
                });

                autocomplete.current = ac;
             } catch (e) {
                 console.warn("Autocomplete Init Failed", e);
             }
        }).catch(err => {
            console.warn("Maps SDK not ready, falling back.");
        });
    }
  }, []);

  // --- 3. GEMINI ADDRESS RESOLUTION ---
  const handleVerifyGemini = async () => {
    if (!value || value.length < 3) return;
    setIsVerifying(true);
    try {
      let userLoc;
      try { userLoc = await getCurrentPosition(); } catch (e) {}

      const result = await GeminiService.resolveLocation(value, userLoc?.lat, userLoc?.lng);
      
      if (result.address) {
        setResolvedAddress(result.address);
        if (result.lat && result.lng) setResolvedCoords({ lat: result.lat, lng: result.lng });
        onChange(result.address);
        if (result.lat && result.lng && onLocationResolved) {
            onLocationResolved({ lat: result.lat, lng: result.lng, address: result.address });
        }
      }
    } catch (e) {
      console.error("Gemini Geo Error:", e);
    } finally {
      setIsVerifying(false);
    }
  };

  // --- 4. MAP INITIALIZATION ---
  useEffect(() => {
    if (showMap && mapRef.current && !googleMap.current) {
      loadGoogleMaps().then(async () => {
        let lat = -1.9441;
        let lng = 30.0619;
        
        try {
            const pos = await getCurrentPosition();
            lat = pos.lat;
            lng = pos.lng;
        } catch(e) {}

        const { Map } = await window.google.maps.importLibrary("maps");
        const { Marker } = await window.google.maps.importLibrary("marker");
        
        const map = new Map(mapRef.current, {
          center: { lat, lng },
          zoom: 16,
          mapId: "EASYMO_MAP_ID",
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false
        });

        const mk = new Marker({
          position: { lat, lng },
          map: map,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
          title: "Drag to refine"
        });

        mk.addListener("dragend", handleMarkerDragEnd);
        map.addListener("click", (e: any) => {
             mk.setPosition(e.latLng);
             handleMarkerDragEnd();
        });

        googleMap.current = map;
        marker.current = mk;

        updateGeminiInsight(lat, lng);

      }).catch(err => {
        console.error("Failed to load Google Maps SDK for Map View", err);
        setMapError("Maps Service Unavailable.");
      });
    }
  }, [showMap]);

  const handleMarkerDragEnd = async () => {
     if (!marker.current || !googleMap.current) return;
     const pos = marker.current.getPosition();
     const lat = pos.lat();
     const lng = pos.lng();
     
     googleMap.current.panTo(pos);

     const geocoder = new window.google.maps.Geocoder();
     geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
         if (status === "OK" && results[0]) {
             setResolvedAddress(results[0].formatted_address);
             setResolvedCoords({ lat, lng });
         }
     });

     updateGeminiInsight(lat, lng);
  };

  const updateGeminiInsight = async (lat: number, lng: number) => {
      setGeminiInsight("Analyzing area...");
      try {
          const insight = await GeminiService.getLocationInsight(lat, lng);
          setGeminiInsight(insight);
      } catch (e) {
          setGeminiInsight(null);
      }
  };

  const handleConfirmPin = () => {
      if (resolvedAddress) {
          onChange(resolvedAddress);
          if (marker.current && onLocationResolved) {
              const pos = marker.current.getPosition();
              onLocationResolved({ lat: pos.lat(), lng: pos.lng(), address: resolvedAddress });
          }
      }
      setShowMap(false);
  };

  const handleSaveLocation = (label: AddressLabel) => {
      if (resolvedAddress && resolvedCoords) {
          const updated = AddressBookService.add(resolvedAddress, label, resolvedCoords);
          setSavedAddresses(updated);
          setShowSavePrompt(false);
      }
  };

  const getSavedIcon = (label: AddressLabel) => {
      switch(label) {
          case 'Home': return <ICONS.Home className="w-4 h-4" />;
          case 'Work': return <ICONS.Briefcase className="w-4 h-4" />;
          case 'School': return <ICONS.School className="w-4 h-4" />;
          default: return <ICONS.MapPin className="w-4 h-4" />;
      }
  };

  return (
    <div className="space-y-1 w-full relative">
      {label && (
        <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{label}</label>
            {isVerifying && <span className="text-[9px] text-blue-500 animate-pulse font-bold">✨ Resolving...</span>}
            {resolvedAddress && !isVerifying && (
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1"><ICONS.Check className="w-3 h-3"/> Verified</span>
                    <button onClick={() => setShowSavePrompt(!showSavePrompt)} className="text-slate-400 hover:text-yellow-500 transition-colors">
                        <ICONS.Star className={`w-3.5 h-3.5 ${showSavePrompt ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </button>
                </div>
            )}
        </div>
      )}
      
      {/* Save Prompt Popover */}
      {showSavePrompt && (
          <div className="absolute top-8 right-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-3 animate-in zoom-in w-48">
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wide mb-2">Save as:</p>
              <div className="grid grid-cols-2 gap-2">
                  {(['Home', 'Work', 'School', 'Other'] as AddressLabel[]).map(lbl => (
                      <button 
                        key={lbl} 
                        onClick={() => handleSaveLocation(lbl)}
                        className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-medium transition-colors"
                      >
                          {getSavedIcon(lbl)}
                          {lbl}
                      </button>
                  ))}
              </div>
          </div>
      )}

      <div className="relative group">
        <div className="absolute left-3 top-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
            {label?.includes('Dest') ? <div className="w-2 h-2 bg-emerald-500 rounded-full ring-4 ring-emerald-500/20"/> : <div className="w-2 h-2 bg-blue-500 rounded-full ring-4 ring-blue-500/20"/>}
        </div>
        
        <input 
            ref={inputRef}
            type="text" 
            value={value}
            onChange={(e) => {
                onChange(e.target.value);
                setResolvedAddress(null);
                setShowSavedList(true);
            }}
            onFocus={() => setShowSavedList(true)}
            onBlur={() => setTimeout(() => setShowSavedList(false), 200)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyGemini()}
            placeholder={placeholder || "Search places (e.g. 'Kigali Heights')"}
            autoFocus={autoFocus}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-20 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-500 dark:placeholder-slate-500 shadow-sm"
        />

        <div className="absolute right-2 top-2 flex gap-1">
            <button 
                onClick={handleVerifyGemini}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                title="Auto-Resolve with Gemini"
            >
                <ICONS.Sparkles className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setShowMap(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                title="Pin on Map"
            >
                <ICONS.MapPin className="w-4 h-4" />
            </button>
        </div>

        {/* Saved Addresses Dropdown */}
        {showSavedList && savedAddresses.length > 0 && !resolvedAddress && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-40 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saved Places</div>
                    {savedAddresses.map(addr => (
                        <button
                            key={addr.id}
                            onMouseDown={() => { // MouseDown fires before Blur
                                onChange(addr.address);
                                setResolvedAddress(addr.address);
                                if (addr.location) setResolvedCoords(addr.location);
                                if (onLocationResolved && addr.location) {
                                    onLocationResolved({ lat: addr.location.lat, lng: addr.location.lng, address: addr.address });
                                }
                                setShowSavedList(false);
                            }}
                            className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-left transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-blue-500 transition-colors">
                                {getSavedIcon(addr.label)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    {addr.label}
                                    {addr.location && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Pinned"></span>}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">{addr.address}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Google Maps Modal */}
      {showMap && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh]">
                  
                  <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <ICONS.MapPin className="w-5 h-5 text-red-500" />
                            Refine Location
                        </h3>
                        {resolvedAddress && <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{resolvedAddress}</p>}
                      </div>
                      <button onClick={() => setShowMap(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
                          <ICONS.XMark className="w-5 h-5 text-slate-500" />
                      </button>
                  </div>
                  
                  <div className="flex-1 relative bg-slate-100 dark:bg-slate-800">
                      {mapError ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                              <ICONS.Map className="w-12 h-12 text-slate-300 mb-4" />
                              <p className="text-slate-500 font-bold mb-2">{mapError}</p>
                              <button onClick={() => setShowMap(false)} className="text-blue-500 text-sm font-bold">Close & Use Text</button>
                          </div>
                      ) : (
                          <>
                             <div ref={mapRef} className="absolute inset-0 z-10" />
                             
                             <div className="absolute top-4 left-4 right-14 z-20 pointer-events-none">
                                <div className="glass-panel p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 shadow-xl border border-emerald-500/20 backdrop-blur-md animate-in slide-in-from-top-2">
                                   <div className="flex items-start gap-2">
                                      <ICONS.Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                      <div>
                                         <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">Gemini Insight</span>
                                         <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                                            {geminiInsight || "Thinking..."}
                                         </p>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </>
                      )}
                      
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-[200px]">
                          <button 
                            onClick={handleConfirmPin}
                            disabled={!!mapError}
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-3.5 rounded-full font-bold shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 border-2 border-white/20 disabled:opacity-50 disabled:scale-100"
                          >
                              <ICONS.Check className="w-4 h-4" /> Confirm Location
                          </button>
                      </div>
                  </div>
                  
                  <div className="p-2 text-center text-[9px] text-slate-400 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10">
                      Map data ©2024 Google • AI Context by Gemini
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SmartLocationInput;
