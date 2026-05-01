import { create } from 'zustand';

/**
 * Store global para resaltar un elemento de la UI tras una navegacion.
 *
 * Flujo tipico:
 *   1. El asistente le dice al usuario "te llevo a X" y guarda en este store
 *      el selector del elemento clave (ej. "+ Nueva receta") junto con un
 *      mensaje corto.
 *   2. Tras la navegacion, <UIHighlightOverlay /> (montado a nivel App) lee
 *      el store, busca el elemento, lo resalta con un ring dorado y muestra
 *      un tooltip al lado.
 *   3. El usuario lee y clickea "Entendido" — el store se limpia y el flujo
 *      vuelve a la normalidad.
 */
export const useHighlightStore = create((set) => ({
  pending: null, // { selector, message, ts }
  setHighlight: (selector, message) =>
    set({ pending: { selector, message, ts: Date.now() } }),
  clear: () => set({ pending: null }),
}));
