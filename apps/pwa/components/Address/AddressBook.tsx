
import React, { useState, useEffect } from 'react';
import { ICONS } from '../../constants';
import { SavedAddress, AddressLabel } from '../../types';
import Button from '../Button';
import SmartLocationInput from '../Location/SmartLocationInput';
import { AddressBookService } from '../../services/addressBook';

interface AddressBookProps {
  onSelect?: (address: SavedAddress) => void;
  selectionMode?: boolean;
}

const AddressBook: React.FC<AddressBookProps> = ({ onSelect, selectionMode = false }) => {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState<AddressLabel>('Home');
  const [newAddressText, setNewAddressText] = useState('');
  const [newLocation, setNewLocation] = useState<{lat: number, lng: number} | undefined>(undefined);

  useEffect(() => {
    setAddresses(AddressBookService.getAll());
  }, []);

  const handleAdd = () => {
    if (!newAddressText.trim()) return;
    const updated = AddressBookService.add(newAddressText, newLabel, newLocation);
    setAddresses(updated);
    setNewAddressText('');
    setNewLocation(undefined);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if(confirm('Delete this address?')) {
        const updated = AddressBookService.remove(id);
        setAddresses(updated);
    }
  };

  const getIcon = (label: AddressLabel) => {
    switch(label) {
        case 'Home': return <ICONS.Home className="w-5 h-5" />;
        case 'Work': return <ICONS.Briefcase className="w-5 h-5" />;
        case 'School': return <ICONS.School className="w-5 h-5" />;
        default: return <ICONS.MapPin className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full space-y-4">
        {/* Header */}
        {!selectionMode && (
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Saved Addresses</h3>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-xs font-bold text-blue-500 hover:text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full transition-colors"
                >
                    {isAdding ? 'Cancel' : '+ Add New'}
                </button>
            </div>
        )}

        {/* Add Form */}
        {isAdding && (
            <div className="glass-panel p-4 rounded-2xl animate-in slide-in-from-top-2 border border-slate-200 dark:border-white/10">
                <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                    {(['Home', 'Work', 'School', 'Other'] as AddressLabel[]).map(lbl => (
                        <button
                            key={lbl}
                            onClick={() => setNewLabel(lbl)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${newLabel === lbl ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                        >
                            {lbl}
                        </button>
                    ))}
                </div>
                
                <div className="mb-4">
                    <SmartLocationInput 
                        label="Address"
                        value={newAddressText}
                        onChange={setNewAddressText}
                        onLocationResolved={(loc) => setNewLocation({ lat: loc.lat, lng: loc.lng })}
                        placeholder="Type location (e.g. 'Near Remera Hub')"
                        autoFocus
                    />
                </div>

                <Button variant="primary" fullWidth onClick={handleAdd} className="h-10 text-xs">
                    Save Address
                </Button>
            </div>
        )}

        {/* List */}
        <div className="space-y-2">
            {addresses.map(addr => (
                <div 
                    key={addr.id}
                    onClick={() => onSelect && onSelect(addr)}
                    className={`glass-panel p-3 rounded-xl flex items-center justify-between group border border-slate-200 dark:border-white/5 shadow-sm ${selectionMode ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/10' : ''}`}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${addr.label === 'Home' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : addr.label === 'Work' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                            {getIcon(addr.label)}
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                {addr.label}
                                {addr.location && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Pinned"></span>}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{addr.address}</div>
                        </div>
                    </div>
                    
                    {!selectionMode && (
                        <button 
                            onClick={() => handleDelete(addr.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <ICONS.Trash className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
            
            {addresses.length === 0 && !isAdding && (
                <div className="text-center py-6 text-slate-400 text-xs italic border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                    No saved addresses yet.
                </div>
            )}
        </div>
    </div>
  );
};

export default AddressBook;
