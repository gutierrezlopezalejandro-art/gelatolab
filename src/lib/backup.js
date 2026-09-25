// Respaldo y restauracion: serializa los stores principales a un ZIP y
// permite restaurar desde el mismo ZIP. NO incluye la clave de OpenAI por
// seguridad (queda solo en localStorage del usuario).
// JSZip se carga perezosamente para no inflar el bundle principal.
//
// COMO SE ENTREGA EL ARCHIVO
// --------------------------
// En app nativa NO se puede usar el truco del navegador de crear un enlace
// con `download` y hacerle click: dentro de un WebView eso no descarga nada.
// El archivo se escribe en el directorio de cache y se entrega por la hoja
// nativa de compartir, desde donde el usuario elige iCloud Drive, Google
// Drive, correo o lo que quiera.
//
// Esa es la decision de respaldo del proyecto: la copia vive en la nube que
// el usuario ya tiene y ya paga. Nosotros no guardamos nada.
//
// En navegador se conserva la descarga de siempre.
import { Capacitor } from '@capacitor/core';
import { flushPendingWrites } from './appStorage';
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

  const today = new Date().toISOString().slice(0, 10);
  const filename = `gelatolab-respaldo-${today}.zip`;

  const entregado = Capacitor.isNativePlatform()
    ? await compartirEnNativo(zip, filename)
    : await descargarEnNavegador(zip, filename);

  // Si el usuario cancelo la hoja de compartir, no se marca como respaldado:
  // decir que hay copia cuando no la hay es peor que no avisar.
  if (!entregado) return { ok: false, cancelled: true };

  marcarRespaldado();
  return { ok: true, filename };
}

/** Marca la fecha del ultimo respaldo, para el recordatorio del panel. */
export function marcarRespaldado() {
  // Se usa localStorage y no appStorage a proposito: si el sistema lo borra,
  // el peor caso es que la app recuerde respaldar antes de tiempo, que es
  // el lado seguro del error.
  try { localStorage.setItem(BACKUP_DATE_KEY, new Date().toISOString()); } catch { /* tolerable */ }
}

async function descargarEnNavegador(zip, filename) {
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

async function compartirEnNativo(zip, filename) {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);

  // base64 porque el ZIP es binario y Filesystem escribe texto o base64.
  const data = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });

  // Cache y no Data: es un archivo de paso. Una vez que el usuario lo guardo
  // en su Drive, que el sistema lo borre cuando quiera.
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data,
    directory: Directory.Cache,
  });

  try {
    await Share.share({
      title: filename,
      files: [uri],
      dialogTitle: filename,
    });
    return true;
  } catch (e) {
    // Cancelar la hoja de compartir lanza. No es un error que mostrar.
    if (/cancel/i.test(String(e?.message || e))) return false;
    throw e;
  }
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

  // CRITICO: zustand/persist escribe a disco de forma asincronica despues de
  // cada setState. Quien llama a esto recarga la app para que todas las
  // pantallas lean el estado nuevo, y si la recarga llega antes de que
  // terminen las escrituras, la restauracion se pierde en silencio: el
  // usuario cree que recupero sus datos y no.
  await flushPendingWrites();

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
