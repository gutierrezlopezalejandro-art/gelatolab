import { useState } from 'react';
import { useT } from '../lib/i18n';
import { useAppStore } from '../store/appStore';
import { useRecipeStore } from '../store/recipeStore';
import { isSeedRecipe } from '../lib/entitlement';
import { exportBackup, getBackupStatus } from '../lib/backup';

/**
 * Recordatorio de respaldo.
 *
 * POR QUE IMPORTA MAS QUE ANTES
 * -----------------------------
 * Al desconectar Supabase, el dispositivo quedo como UNICA copia del
 * recetario. El sistema operativo respalda los datos en iCloud o en Google
 * de forma automatica, pero eso solo se recupera al configurar un telefono
 * nuevo con la misma cuenta. No cubre al usuario que quiere su copia a mano,
 * ni al que cambia de plataforma.
 *
 * QUE REEMPLAZA
 * -------------
 * Antes este banner ofrecia "conectar una carpeta de tu PC", que dependia de
 * la File System Access API o de Tauri. En un telefono eso no existe. Ahora
 * genera el respaldo y lo entrega por la hoja nativa de compartir, desde
 * donde el usuario lo guarda en su propio Drive.
 */
const RECORDAR_DESPUES_DE_DIAS = 14;
const CLAVE_DESCARTADO = '__gelatolab_backup_reminder_dismissed';

export function BackupReminder() {
  const t = useT();
  const { showToast } = useAppStore();
  const recetas = useRecipeStore(s => s.recipes);
  const [descartado, setDescartado] = useState(() => {
    try { return sessionStorage.getItem(CLAVE_DESCARTADO) === '1'; } catch { return false; }
  });
  const [ocupado, setOcupado] = useState(false);
  const [estado, setEstado] = useState(() => getBackupStatus());

  const nuncaRespaldo = estado === null;
  const vencido = estado !== null && estado.daysSinceBackup >= RECORDAR_DESPUES_DE_DIAS;

  // No molestar a quien todavia no tiene nada propio que perder. Las recetas
  // de fabrica no cuentan: vienen con la app y se reinstalan solas.
  const hayAlgoQuePerder = recetas.some(r => !isSeedRecipe(r));

  if (descartado || !hayAlgoQuePerder || (!nuncaRespaldo && !vencido)) return null;

  function descartar() {
    setDescartado(true);
    try { sessionStorage.setItem(CLAVE_DESCARTADO, '1'); } catch { /* tolerable */ }
  }

  async function respaldar() {
    setOcupado(true);
    try {
      const r = await exportBackup();
      if (r.cancelled) return;            // el usuario cerro la hoja de compartir
      setEstado(getBackupStatus());
      showToast(t('backup_exported_ok'));
      descartar();
    } catch (e) {
      showToast(e.message || t('error_generic'), 'error');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="rounded-xl border-l-4 p-3 mb-6 flex items-start gap-3 flex-wrap"
         style={{ background: '#fff8e1', borderColor: '#f5c842' }}>
      <span className="text-lg leading-none" aria-hidden="true">☁️</span>
      <div className="flex-1 min-w-[240px] text-xs">
        <div className="font-semibold text-[var(--ink)] mb-0.5">
          {nuncaRespaldo
            ? t('backup_reminder_never_title')
            : t('backup_reminder_stale_title', { days: estado.daysSinceBackup })}
        </div>
        <div className="text-[var(--ink2)]">{t('backup_reminder_cloud_sub')}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={respaldar} disabled={ocupado} className="btn-primary text-xs">
          {ocupado ? t('backup_reminder_busy') : '☁️ ' + t('backup_now')}
        </button>
        <button
          onClick={descartar}
          className="text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none px-1 text-base"
          aria-label={t('backup_reminder_dismiss')}
          title={t('backup_reminder_dismiss')}
        >×</button>
      </div>
    </div>
  );
}
