
import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { ICONS } from '../../constants';
import Button from '../Button';
import { RecurrenceType } from '../../types';
import SmartLocationInput from '../Location/SmartLocationInput';

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (details: any) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ open, onClose, onSchedule }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<{origin?: {lat: number, lng: number}, dest?: {lat: number, lng: number}}>({});

  const handleSubmit = () => {
    if (!date || !time || !origin || !destination) {
        alert("Please fill in all fields.");
        return;
    }
    onSchedule({ date, time, recurrence, origin, destination, coords, notes });
    onClose();
  };

  return (
    <Drawer.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[61]">
          <div className="mx-auto w-full max-w-lg px-4 pb-6">
            <div className="mx-auto bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex justify-center py-3">
                <div className="h-1.5 w-14 rounded-full bg-slate-300 dark:bg-white/10" />
              </div>
              {/* Header */}
              <div className="px-5 pb-4 flex items-center justify-between bg-white dark:bg-[#0f172a] sticky top-0 z-20">
                  <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                         <ICONS.Calendar className="w-5 h-5" />
                      </div>
                      Schedule Ride
                  </h3>
                  <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors border border-transparent dark:border-white/5">
                      <ICONS.XMark className="w-5 h-5" />
                  </button>
              </div>

              <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[75vh] bg-slate-50 dark:bg-[#0f172a]">
                  
                  {/* Date & Time Row */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Date</label>
                          <div className="relative group">
                              <input 
                                  type="date" 
                                  value={date}
                                  onChange={e => setDate(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm group-hover:border-blue-500/30"
                              />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Time</label>
                          <div className="relative group">
                              <input 
                                  type="time" 
                                  value={time}
                                  onChange={e => setTime(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm group-hover:border-blue-500/30"
                              />
                          </div>
                      </div>
                  </div>

                  {/* Recurrence - Segmented Control */}
                  <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                          <ICONS.Repeat className="w-3 h-3" /> Recurring Trip
                      </label>
                      <div className="bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1 shadow-inner border border-transparent dark:border-white/5">
                          {(['none', 'daily', 'weekdays', 'weekly'] as RecurrenceType[]).map(type => (
                              <button 
                                  key={type}
                                  onClick={() => setRecurrence(type)}
                                  className={`
                                      flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold capitalize transition-all duration-300
                                      ${recurrence === type 
                                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 transform scale-[1.02]' 
                                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'}
                                  `}
                              >
                                  {type}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Location Inputs with Visual Connector */}
                  <div className="space-y-4 pt-2 relative">
                      {/* Connecting Line Visual */}
                      <div className="absolute left-[23px] top-[40px] bottom-[40px] w-0.5 bg-gradient-to-b from-blue-500/20 to-emerald-500/20 dark:from-blue-500/30 dark:to-emerald-500/30 z-0 rounded-full"></div>

                      <div className="relative z-10">
                          <SmartLocationInput 
                              label="Pickup Location"
                              value={origin}
                              onChange={setOrigin}
                              onLocationResolved={(loc) => setCoords(prev => ({ ...prev, origin: { lat: loc.lat, lng: loc.lng } }))}
                              placeholder="Where from?"
                          />
                      </div>
                      
                      <div className="relative z-10">
                          <SmartLocationInput 
                              label="Destination"
                              value={destination}
                              onChange={setDestination}
                              onLocationResolved={(loc) => setCoords(prev => ({ ...prev, dest: { lat: loc.lat, lng: loc.lng } }))}
                              placeholder="Where to?"
                          />
                      </div>
                  </div>

                  {/* Optional Notes */}
                  <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                          Trip Details (Optional)
                      </label>
                      <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="e.g. 2 passengers, luggage, specific pickup spot..."
                          className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm resize-none h-24 placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed"
                      />
                  </div>

                  <div className="pt-2 pb-4">
                      <Button 
                          variant="primary" 
                          fullWidth 
                          onClick={handleSubmit} 
                          className="h-14 text-sm font-bold shadow-xl shadow-blue-500/20 bg-blue-600 hover:bg-blue-500"
                      >
                          Confirm Schedule
                      </Button>
                  </div>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default ScheduleModal;
