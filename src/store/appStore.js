import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  toast: null,
  modal: null,

  showToast(message, type = 'success') {
    const id = Date.now();
    set({ toast: { message, type, id } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 3000);
  },

  confirm(message) {
    return new Promise(resolve => {
      set({ modal: { message, resolve } });
    });
  },

  resolveModal(value) {
    const m = get().modal;
    if (m?.resolve) m.resolve(value);
    set({ modal: null });
  },
}));
