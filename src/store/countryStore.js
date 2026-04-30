import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';

/**
 * Globally selected country for front-of-package labeling.
 * Defaults to Chile (the original target market).
 */
export const useCountryStore = create(
  persist(
    (set) => ({
      country: 'CL',
      setCountry: (code) => set({ country: code }),
    }),
    { name: 'gelatolab-country', storage: createJSONStorage(() => idbStorage) }
  )
);
