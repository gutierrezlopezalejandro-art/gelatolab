// Backup/restore local: serializa los stores principales a un ZIP descargable
// y permite restaurar desde el mismo ZIP. NO incluye la clave de OpenAI por
// seguridad (queda solo en localStorage del usuario).
// JSZip se carga perezosamente para no inflar el bundle principal.
import { useRecipeStore } from '../store/recipeStore';
import { useIngredientStore } from '../store/ingredientStore';
import { useProductionStore } from '../store/productionStore';
import { usePlanStore } from '../store/planStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useBusinessStore } from '../store/businessStore';
import { useSupplierStore } from '../store/supplierStore';
import { useHaccpStore } from '../store/haccpStore';

const STORE_KEYS = {
  recipes:     useRecipeStore,
  ingredients: useIngredientStore,
  productions: useProductionStore,
  plans:       usePlanStore,
  inventory:   useInventoryStore,
  business:    useBusinessStore,
  suppliers:   useSupplierStore,
  haccp:       useHaccpStore,
};

const BACKUP_VERSION = 1;
const BACKUP_DATE_KEY = 'gelatolab-last-backup';

export async function exportBackup() {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const meta = {
    version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    app: 'GelatoLab',
    ua: navigator.userAgent,
  };
  zip.file('meta.json', JSON.stringify(meta, null, 2));

  for (const [name, useStore] of Object.entries(STORE_KEYS)) {
    const state = useStore.getState();
    // Filtra metodos del store para serializar solo los datos.
    const data = Object.fromEntries(
      Object.entries(state).filter(([_, v]) => typeof v !== 'function')
    );
    zip.file(`${name}.json`, JSON.stringify(data, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gelatolab-backup-${today}.zip`;
  a.click();
  URL.revokeObjectURL(url);

  // Marca timestamp del ultimo backup para mostrar avisos en el dashboard.
  localStorage.setItem(BACKUP_DATE_KEY, new Date().toISOString());
  return { ok: true };
}

export async function importBackup(file) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(file);
  const metaFile = zip.file('meta.json');
  if (!metaFile) throw new Error('BACKUP_INVALID');
  const meta = JSON.parse(await metaFile.async('string'));
  if (!meta.app || meta.app !== 'GelatoLab') throw new Error('BACKUP_NOT_GELATOLAB');

  const restored = [];
  for (const name of Object.keys(STORE_KEYS)) {
    const f = zip.file(`${name}.json`);
    if (!f) continue;
    const data = JSON.parse(await f.async('string'));
    // Reemplaza el state del store. El persist middleware se encarga de
    // escribir a localStorage automaticamente al hacer setState.
    const useStore = STORE_KEYS[name];
    useStore.setState(data);
    restored.push(name);
  }

  return { ok: true, meta, restored };
}

// Devuelve { daysSinceBackup, lastBackupDate } o null si nunca se hizo uno.
export function getBackupStatus() {
  const last = localStorage.getItem(BACKUP_DATE_KEY);
  if (!last) return null;
  const date = new Date(last);
  if (isNaN(date.getTime())) return null;
  const daysSinceBackup = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  return { daysSinceBackup, lastBackupDate: date };
}
