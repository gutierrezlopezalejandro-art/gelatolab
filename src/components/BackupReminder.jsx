import { useState, useEffect } from 'react';
import { useT } from '../lib/i18n';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { exportBackup } from '../lib/backup';
import {
  isFolderBackupSupported, getStoredFolderHandle, ensureFolderPermission,
  pickBackupFolder, writeAllStoresToFolder, startFolderAutoSync,
} from '../lib/folderBackup';
import { track } from '../lib/analytics';

/**
 * Banner suave que aparece en el dashboard cuando NO hay backup automatico
 * configurado. Empuja al usuario a conectar una carpeta (preferido) o a
 * exportar un ZIP manual como fallback en navegadores sin File System API.
 *
 * Si ya hay carpeta conectada y con permiso, el banner desaparece.
 */
const REMIND_AFTER_DAYS = 14;
const SESSION_DISMISS_KEY = '__gelatolab_backup_reminder_dismissed';

export function BackupReminder() {
  const t = useT();
  const { showToast } = useAppStore();
  const user = useAuthStore(s => s.user);
  const [dismissed, setDismissed] = useState(
    sessionStorage.getItem(SESSION_DISMISS_KEY) === '1'
  );
  const [folderConnected, setFolderConnected] = useState(true); // optimist: hide hasta saber
  const [busy, setBusy] = useState(false);
  const folderSupported = isFolderBackupSupported();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const handle = await getStoredFolderHandle();
      if (cancelled) return;
      if (!handle) { setFolderConnected(false); return; }
      const ok = await ensureFolderPermission(handle, { interactive: false });
      setFolderConnected(ok);
    })();
    return () => { cancelled = true; };
  }, []);

  // Sin recordatorio: usuario no logueado (no hay datos reales que respaldar
  // aún), ya hay carpeta conectada con permiso, o el usuario descartó el
  // banner en esta sesion.
  if (!user || dismissed || folderConnected) return null;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem(SESSION_DISMISS_KEY, '1'); } catch {}
  }

  async function handleConnectFolder() {
    setBusy(true);
    try {
      const h = await pickBackupFolder();
      await writeAllStoresToFolder(h);
      startFolderAutoSync();
      showToast(t('folder_backup_connected'));
      setFolderConnected(true);
      track('backup_reminder_folder_connected');
    } catch (e) {
      if (e.name !== 'AbortError') showToast(e.message || 'Error', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleExportZip() {
    setBusy(true);
    try {
      await exportBackup();
      showToast(t('backup_exported_ok'));
      track('backup_reminder_zip_exported');
      dismiss();
    } catch (e) {
      showToast(e.message || 'Error', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border-l-4 p-3 mb-6 flex items-start gap-3 flex-wrap"
         style={{ background: '#fff8e1', borderColor: '#f5c842' }}>
      <span className="text-lg leading-none">📁</span>
      <div className="flex-1 min-w-[240px] text-xs">
        <div className="font-semibold text-[var(--ink)] mb-0.5">
          {folderSupported ? t('backup_reminder_folder_title') : t('backup_reminder_zip_title')}
        </div>
        <div className="text-[var(--ink2)]">
          {folderSupported ? t('backup_reminder_folder_sub') : t('backup_reminder_zip_sub')}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {folderSupported ? (
          <button
            onClick={handleConnectFolder}
            disabled={busy}
            className="btn-primary text-xs"
          >
            {busy ? '…' : '📁 ' + t('folder_backup_connect')}
          </button>
        ) : (
          <button
            onClick={handleExportZip}
            disabled={busy}
            className="btn-primary text-xs"
          >
            {busy ? '…' : '⬇ ' + t('backup_reminder_btn')}
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none px-1 text-base"
          aria-label={t('backup_reminder_dismiss')}
          title={t('backup_reminder_dismiss')}
        >×</button>
      </div>
    </div>
  );
}
