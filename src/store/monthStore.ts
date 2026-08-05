import { create } from 'zustand';
import { addMonths, subMonths } from 'date-fns';

interface MonthState {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

export const useMonthStore = create<MonthState>((set) => ({
  currentDate: new Date(),
  setCurrentDate: (date) => set({ currentDate: date }),
  goToPreviousMonth: () => set((state) => ({
    currentDate: subMonths(state.currentDate, 1),
  })),
  goToNextMonth: () => set((state) => ({
    currentDate: addMonths(state.currentDate, 1),
  })),
}));
