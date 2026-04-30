import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';

// Configuracion de los asistentes IA. La clave de OpenAI se guarda en
// localStorage del navegador y nunca sale de la maquina del usuario.
export const useAiStore = create(
  persist(
    (set) => ({
      apiKey: '',
      model: 'gpt-4o-mini',
      setApiKey: (apiKey) => set({ apiKey: (apiKey || '').trim() }),
      setModel:  (model)  => set({ model }),
      clear:     ()       => set({ apiKey: '' }),
    }),
    { name: 'gelatolab-ai', storage: createJSONStorage(() => idbStorage) }
  )
);

export function hasAiKey() {
  return !!useAiStore.getState().apiKey;
}
