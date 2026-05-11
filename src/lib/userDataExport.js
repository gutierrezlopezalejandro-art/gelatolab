// Exporta TODOS los datos del usuario (8 stores Zustand) como ZIP descargable.
// Cumple el "derecho de acceso" + "portabilidad" de la Ley 21.719 chilena
// (auditoria legal Sandra Fernandez 2026-05-11, gap G11).
//
// El ZIP contiene 1 archivo JSON por store + un archivo README.txt explicando
// la estructura. Nombre del ZIP: gelatolab-export-YYYY-MM-DD.zip
//
// NOTA: este export usa el state CURRENT del store en memoria (que es lo que
// el usuario ve en pantalla). No hace pull del cloud explicitamente — si el
// usuario quiere la version mas reciente del cloud, debe primero recargar
// la app para que CloudSyncProvider haga pullFromCloud al login.

import JSZip from 'jszip';
import { useRecipeStore } from '../store/recipeStore';
import { useIngredientStore } from '../store/ingredientStore';
import { useProductionStore } from '../store/productionStore';
import { usePlanStore } from '../store/planStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useBusinessStore } from '../store/businessStore';
import { useSupplierStore } from '../store/supplierStore';
import { useHaccpStore } from '../store/haccpStore';

const STORES = [
  { name: 'recipes',     store: useRecipeStore },
  { name: 'ingredients', store: useIngredientStore },
  { name: 'productions', store: useProductionStore },
  { name: 'plans',       store: usePlanStore },
  { name: 'inventory',   store: useInventoryStore },
  { name: 'business',    store: useBusinessStore },
  { name: 'suppliers',   store: useSupplierStore },
  { name: 'haccp',       store: useHaccpStore },
];

const README = `GelatoLab — Exportación de tus datos personales
================================================

Este archivo ZIP contiene una copia completa de los datos almacenados
en tu cuenta de GelatoLab al momento de la exportación.

Cumple el derecho de acceso y portabilidad reconocido por:
  - Ley N° 21.719 de Protección de Datos Personales (Chile)
  - Reglamento (UE) 2016/679 (RGPD, Unión Europea)
  - Equivalentes en otras jurisdicciones

Contenido del ZIP (1 archivo JSON por módulo):
  - recipes.json     — Tus recetas (fórmulas, ingredientes, costos)
  - ingredients.json — Tu base de datos de ingredientes
  - productions.json — Tu historial de producciones (lotes confirmados)
  - plans.json       — Tus planes de producción
  - inventory.json   — Tu inventario (movimientos de stock)
  - business.json    — Datos de tu negocio (nombre, dirección, RUT, etc.)
  - suppliers.json   — Tus proveedores
  - haccp.json       — Tu bitácora HACCP

Cada archivo es un objeto JSON con la estructura exacta del store interno
de la app. Puedes abrirlos con cualquier editor de texto o procesador de
JSON (jq, Python, Node, etc.).

Si necesitas re-importar estos datos en otra cuenta de GelatoLab, contactá
a contacto@gelatolab.app — actualmente la importación no es self-service
pero podemos asistirte con el merge.

Generado por GelatoLab v\${__APP_VERSION__} el \${new Date().toLocaleString()}.
`;

export async function exportUserDataAsZip() {
  const zip = new JSZip();

  // Capturar el state actual de cada store + serializar a JSON pretty-printed
  for (const { name, store } of STORES) {
    try {
      const state = store.getState();
      // Filtrar funciones (Zustand actions) — solo queremos los datos
      const data = Object.fromEntries(
        Object.entries(state).filter(([_k, v]) => typeof v !== 'function')
      );
      zip.file(`${name}.json`, JSON.stringify(data, null, 2));
    } catch (err) {
      // Si un store falla, dejamos un placeholder que indique el error
      // pero no abortamos el export entero.
      zip.file(`${name}.error.txt`, `Failed to export ${name}: ${err.message}`);
    }
  }

  // README con la explicación
  const readmeText = README
    .replace('${__APP_VERSION__}', typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown')
    .replace('${new Date().toLocaleString()}', new Date().toLocaleString());
  zip.file('README.txt', readmeText);

  // Generar el blob ZIP
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

  // Trigger download via blob URL
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `gelatolab-export-${date}.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberar la URL despues de 1s (algunos browsers necesitan que persista
  // mientras procesan el click).
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { filename, sizeBytes: blob.size };
}
