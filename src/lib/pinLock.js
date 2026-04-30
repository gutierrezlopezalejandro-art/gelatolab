// PIN lock simple para gatear el guardado de recetas. La hash es base64
// (ofuscacion, NO es seguridad criptografica — solo previene cambios casuales
// de personal que no debe modificar formulas en una tablet compartida).
import { useBusinessStore } from '../store/businessStore';

const SESSION_KEY = 'gelatolab-pin-unlocked';

export function hashPin(pin) {
  return btoa(String(pin || '').trim());
}

export function isPinSet() {
  return !!useBusinessStore.getState().pin_hash;
}

export function isUnlocked() {
  if (!isPinSet()) return true;
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}

export function unlock(pin) {
  const expected = useBusinessStore.getState().pin_hash;
  if (!expected) return true; // no hay PIN configurado
  if (hashPin(pin) === expected) {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
    return true;
  }
  return false;
}

export function lock() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

export function setPin(pin) {
  useBusinessStore.getState().update({ pin_hash: pin ? hashPin(pin) : '' });
  // Resetea la sesion para forzar nuevo unlock con la nueva clave
  lock();
}
