import { create } from 'zustand';

interface UIState {
  isScheduleSheetOpen: boolean;
  openScheduleSheet: () => void;
  closeScheduleSheet: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isScheduleSheetOpen: false,
  openScheduleSheet: () => set({ isScheduleSheetOpen: true }),
  closeScheduleSheet: () => set({ isScheduleSheetOpen: false }),
}));
