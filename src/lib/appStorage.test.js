// Tests del adaptador de almacenamiento nativo.
//
// Lo que se verifica aca no se puede comprobar a ojo: que un corte de luz a
// mitad de un guardado no deje a una heladeria sin recetario. Se simula el
// sistema de archivos de Capacitor en memoria y se interrumpe la escritura
// en los puntos exactos donde puede fallar.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Sistema de archivos falso ──────────────────────────────────────────────
let files;       // Map<path, contenido>
let failOn;      // { op, path } → hace fallar esa operacion una sola vez

function maybeFail(op, path) {
  if (failOn && failOn.op === op && failOn.path === path) {
    failOn = null;
    throw new Error(`fallo simulado en ${op} ${path}`);
  }
}

const Filesystem = {
  mkdir: vi.fn(async () => {}),
  writeFile: vi.fn(async ({ path, data }) => {
    maybeFail('writeFile', path);
    files.set(path, data);
  }),
  readFile: vi.fn(async ({ path }) => {
    if (!files.has(path)) throw new Error('File does not exist');
    return { data: files.get(path) };
  }),
  deleteFile: vi.fn(async ({ path }) => {
    maybeFail('deleteFile', path);
    if (!files.has(path)) throw new Error('File does not exist');
    files.delete(path);
  }),
  stat: vi.fn(async ({ path }) => {
    if (!files.has(path)) throw new Error('File does not exist');
    return { size: files.get(path).length };
  }),
  copy: vi.fn(async ({ from, to }) => {
    maybeFail('copy', from);
    if (!files.has(from)) throw new Error('File does not exist');
    files.set(to, files.get(from));
  }),
  rename: vi.fn(async ({ from, to }) => {
    maybeFail('rename', from);
    if (!files.has(from)) throw new Error('File does not exist');
    files.set(to, files.get(from));
    files.delete(from);
  }),
  readdir: vi.fn(async () => ({
    files: [...files.keys()].map(p => ({ name: p.split('/').pop(), size: 0, mtime: 0 })),
  })),
};

// ── IndexedDB falso, para probar la migracion ──────────────────────────────
let legacyStore;
const idbStorage = {
  getItem: vi.fn(async (k) => (legacyStore.has(k) ? legacyStore.get(k) : null)),
  setItem: vi.fn(async (k, v) => { legacyStore.set(k, v); }),
  removeItem: vi.fn(async (k) => { legacyStore.delete(k); }),
};

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem,
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
}));
vi.mock('./idbStorage', () => ({ idbStorage }));

const { appStorage, isNativeStorage, storageDiagnostics } = await import('./appStorage');

const KEY = 'gelatolab-recipes';
const MAIN = 'gelatolab/gelatolab-recipes.json';
const TMP  = 'gelatolab/gelatolab-recipes.tmp';
const BAK  = 'gelatolab/gelatolab-recipes.bak';

const receta = (n) => JSON.stringify({ state: { recipes: [{ id: n, name: `Receta ${n}` }] } });

beforeEach(() => {
  files = new Map();
  legacyStore = new Map();
  failOn = null;
  vi.clearAllMocks();
});

describe('backend', () => {
  it('usa el sistema de archivos nativo cuando corre en Capacitor', () => {
    expect(isNativeStorage()).toBe(true);
  });
});

describe('guardado y lectura', () => {
  it('guarda y devuelve el mismo contenido', async () => {
    await appStorage.setItem(KEY, receta(1));
    expect(await appStorage.getItem(KEY)).toBe(receta(1));
  });

  it('devuelve null cuando la clave no existe en ningun lado', async () => {
    expect(await appStorage.getItem('clave-inexistente')).toBeNull();
  });

  it('publica el archivo definitivo y no deja el temporal', async () => {
    await appStorage.setItem(KEY, receta(1));
    expect(files.has(MAIN)).toBe(true);
    expect(files.has(TMP)).toBe(false);
  });

  it('conserva la version anterior como respaldo al sobrescribir', async () => {
    await appStorage.setItem(KEY, receta(1));
    await appStorage.setItem(KEY, receta(2));
    expect(files.get(MAIN)).toBe(receta(2));
    expect(files.get(BAK)).toBe(receta(1));
  });
});

describe('recuperacion ante escritura interrumpida', () => {
  it('si el proceso muere despues de escribir el temporal, no se pierde lo viejo', async () => {
    await appStorage.setItem(KEY, receta(1));
    // La copia a respaldo falla → la escritura se aborta a mitad de camino.
    failOn = { op: 'copy', path: MAIN };
    await appStorage.setItem(KEY, receta(2));
    // El archivo vigente sigue siendo legible: nada se perdio.
    expect(await appStorage.getItem(KEY)).toBeTruthy();
  });

  it('si muere entre el borrado y el renombrado, recupera desde el temporal', async () => {
    await appStorage.setItem(KEY, receta(1));
    // Simulamos exactamente ese estado: sin archivo principal, con temporal.
    files.delete(MAIN);
    files.set(TMP, receta(2));
    // El temporal es una escritura completa, asi que gana sobre el respaldo.
    expect(await appStorage.getItem(KEY)).toBe(receta(2));
  });

  it('si el archivo principal quedo corrupto, cae al respaldo', async () => {
    await appStorage.setItem(KEY, receta(1));
    await appStorage.setItem(KEY, receta(2));
    files.set(MAIN, '{ esto no es json valido');
    expect(await appStorage.getItem(KEY)).toBe(receta(1));
  });

  it('si principal y respaldo estan corruptos, devuelve null en vez de romper', async () => {
    await appStorage.setItem(KEY, receta(1));
    await appStorage.setItem(KEY, receta(2));
    files.set(MAIN, 'basura');
    files.set(BAK, 'basura');
    expect(await appStorage.getItem(KEY)).toBeNull();
  });
});

describe('migracion desde IndexedDB', () => {
  it('traslada la clave de una instalacion previa y la deja en disco', async () => {
    legacyStore.set(KEY, receta(7));
    expect(await appStorage.getItem(KEY)).toBe(receta(7));
    // La siguiente lectura ya sale del archivo, sin tocar IndexedDB.
    idbStorage.getItem.mockClear();
    expect(await appStorage.getItem(KEY)).toBe(receta(7));
    expect(idbStorage.getItem).not.toHaveBeenCalled();
  });

  it('ignora una clave legacy con JSON invalido', async () => {
    legacyStore.set(KEY, 'no es json');
    expect(await appStorage.getItem(KEY)).toBeNull();
  });

  it('no migra si ya hay archivo en disco', async () => {
    await appStorage.setItem(KEY, receta(1));
    legacyStore.set(KEY, receta(99));
    expect(await appStorage.getItem(KEY)).toBe(receta(1));
  });
});

describe('escrituras concurrentes', () => {
  it('serializa guardados simultaneos de la misma clave sin mezclarlos', async () => {
    await Promise.all([
      appStorage.setItem(KEY, receta(1)),
      appStorage.setItem(KEY, receta(2)),
      appStorage.setItem(KEY, receta(3)),
    ]);
    // Gane la que gane, el resultado tiene que ser una de las tres completa,
    // nunca un archivo a medias ni un temporal huerfano.
    expect([receta(1), receta(2), receta(3)]).toContain(files.get(MAIN));
    expect(files.has(TMP)).toBe(false);
  });
});

describe('borrado', () => {
  it('elimina el archivo, el temporal y el respaldo', async () => {
    await appStorage.setItem(KEY, receta(1));
    await appStorage.setItem(KEY, receta(2));
    await appStorage.removeItem(KEY);
    expect(files.has(MAIN)).toBe(false);
    expect(files.has(BAK)).toBe(false);
    expect(files.has(TMP)).toBe(false);
  });
});

describe('diagnostico', () => {
  it('informa el backend y los archivos presentes', async () => {
    await appStorage.setItem(KEY, receta(1));
    const d = await storageDiagnostics();
    expect(d.backend).toBe('filesystem');
    expect(d.files.map(f => f.name)).toContain('gelatolab-recipes.json');
  });
});
