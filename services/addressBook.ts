
import { SavedAddress, AddressLabel } from '../types';

const STORAGE_KEY = 'easyMO_saved_addresses';

export const AddressBookService = {
  getAll: (): SavedAddress[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      
      // Default mock data if empty
      const defaults: SavedAddress[] = [
        { id: '1', label: 'Home', address: 'Kigali Heights, Kimihurura', location: { lat: -1.954, lng: 30.093 } },
        { id: '2', label: 'Work', address: 'Norrsken House, Kigali', location: { lat: -1.944, lng: 30.062 } }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    } catch (e) {
      console.error("Failed to load addresses", e);
      return [];
    }
  },

  add: (address: string, label: AddressLabel, location?: {lat: number, lng: number}) => {
    const current = AddressBookService.getAll();
    const newEntry: SavedAddress = {
      id: Date.now().toString(),
      label,
      address,
      location
    };
    const updated = [...current, newEntry];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  remove: (id: string) => {
    const current = AddressBookService.getAll();
    const updated = current.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
};
