import { useState, useRef, useEffect } from 'react';
import { useT } from '../lib/i18n';
import { getBusinessFields } from '../lib/countryRegulations';
import { useCountryStore } from '../store/countryStore';
import { useBusinessStore } from '../store/businessStore';
import { useAppStore } from '../store/appStore';
import { MACHINES } from '../data/machines';
import { exportBackup, importBackup, getBackupStatus } from '../lib/backup';
import { setPin as savePin, isPinSet, lock as pinLock } from '../lib/pinLock';
import {
  isFolderBackupSupported, isTauri, pickBackupFolder, getStoredFolderHandle,
  ensureFolderPermission, disconnectFolder, writeAllStoresToFolder,
  getLastSyncDate, startFolderAutoSync,
} from '../lib/folderBackup';
import { track } from '../lib/analytics';
import { useEscapeKey } from '../lib/hooks';

/**
 * Edit-after-onboarding modal. Reuses the same fields the wizard captured but
 * without the language / country steps (those have their own selectors in the
 * nav). Lets the user fix the heladería profile any time.
 */
export function BusinessSettingsModal({ onClose }) {
  const t = useT();
  useEscapeKey(onClose);
  const business = useBusinessStore();
  const country = useCountryStore(s => s.country);
  const { showToast, confirm } = useAppStore();
  const fileInputRef = useRef(null);
  const [backupStatus, setBackupStatus] = useState(getBackupStatus());
  const folderSupported = isFolderBackupSupported();
  const [folderHandle, setFolderHandle] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [lastFolderSync, setLastFolderSync] = useState(getLastSyncDate());
  const [folderBusy, setFolderBusy] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [pinHasSaved, setPinHasSaved] = useState(isPinSet());

  function handleSetPin() {
    if (!pinDraft || pinDraft.length < 3) {
      showToast(t('pin_min_length'), 'error');
      return;
    }
    savePin(pinDraft);
    setPinDraft('');
    setPinHasSaved(true);
    showToast(t('pin_set_ok'));
  }
  async function handleClearPin() {
    const ok = await confirm(t('pin_clear_confirm'));
    if (!ok) return;
    savePin('');
    pinLock();
    setPinHasSaved(false);
    showToast(t('pin_cleared'));
  }

  // Carga el handle guardado al montar. Para Tauri, mostramos el path completo
  // ("Documents/GelatoLab"); para web mostramos solo el nombre de la carpeta.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const h = await getStoredFolderHandle();
      if (!cancelled && h) {
        setFolderHandle(h);
        setFolderName(h.__tauri ? h.path : (h.name || ''));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handlePickFolder() {
    setFolderBusy(true);
    try {
      const h = await pickBackupFolder();
      setFolderHandle(h);
      setFolderName(h.__tauri ? h.path : (h.name || ''));
      // Escritura inicial inmediata para confirmar que funciona.
      await writeAllStoresToFolder(h);
      setLastFolderSync(getLastSyncDate());
      startFolderAutoSync();
      showToast(t('folder_backup_connected'));
      track('folder_backup_connected', { runtime: h.__tauri ? 'tauri' : 'web' });
    } catch (e) {
      if (e.name !== 'AbortError') showToast(e.message || 'Error', 'error');
    } finally {
      setFolderBusy(false);
    }
  }

  async function handleSyncNow() {
    if (!folderHandle) return;
    setFolderBusy(true);
    try {
      const ok = await ensureFolderPermission(folderHandle, { interactive: true });
      if (!ok) { showToast(t('folder_backup_no_permission'), 'error'); return; }
      const r = await writeAllStoresToFolder(folderHandle);
      if (r.ok) {
        setLastFolderSync(getLastSyncDate());
        showToast(t('folder_backup_synced'));
      } else {
        showToast(t('folder_backup_failed') + ': ' + r.error, 'error');
      }
    } finally {
      setFolderBusy(false);
    }
  }

  async function handleDisconnectFolder() {
    const ok = await confirm(t('folder_backup_disconnect_confirm'));
    if (!ok) return;
    await disconnectFolder();
    setFolderHandle(null);
    setFolderName('');
    showToast(t('folder_backup_disconnected'));
  }

  async function handleExport() {
    try {
      await exportBackup();
      setBackupStatus(getBackupStatus());
      showToast(t('backup_exported_ok'));
      track('backup_exported');
    } catch (e) {
      showToast(t('backup_export_failed') + ': ' + e.message, 'error');
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const ok = await confirm(t('backup_import_confirm'));
    if (!ok) return;
    try {
      const result = await importBackup(file);
      track('backup_imported', { stores: result.restored.length });
      showToast(t('backup_imported_ok'));
      // Forzar reload para que todos los componentes consuman el nuevo state limpio.
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      const msg = e.message === 'BACKUP_NOT_GELATOLAB' ? t('backup_not_gelatolab')
        : e.message === 'BACKUP_INVALID' ? t('backup_invalid')
        : (t('backup_import_failed') + ': ' + e.message);
      showToast(msg, 'error');
    }
  }

  const [form, setForm] = useState({
    fantasy_name: business.fantasy_name,
    legal_name:   business.legal_name,
    tax_id:       business.tax_id,
    sanitary_reg: business.sanitary_reg,
    address:      business.address,
    contact_phone: business.contact_phone,
    contact_email: business.contact_email,
    machine_id:    business.machine_id || '',
  });

  const fields = getBusinessFields(country);

  function save() {
    business.update(form);
    showToast(t('business_saved'));
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="business-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between">
          <div>
            <h2 id="business-modal-title" className="font-display text-lg text-[var(--ink)]">{t('business_settings_title')}</h2>
            <p className="text-xs text-[var(--ink3)]">{t('business_settings_sub')}</p>
          </div>
          <button onClick={onClose}
                  className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('onb_fantasy_name')} *</label>
            <input className="input" value={form.fantasy_name}
                   onChange={e => setForm({ ...form, fantasy_name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('onb_legal_name')}</label>
            <input className="input" value={form.legal_name}
                   onChange={e => setForm({ ...form, legal_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{fields.tax_id_label}</label>
              <input className="input" value={form.tax_id}
                     onChange={e => setForm({ ...form, tax_id: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{fields.sanitary_label}</label>
              <input className="input" value={form.sanitary_reg}
                     onChange={e => setForm({ ...form, sanitary_reg: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('onb_address')}</label>
            <input className="input" value={form.address}
                   onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('business_phone')}</label>
              <input className="input" type="tel" value={form.contact_phone}
                     onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('business_email')}</label>
              <input className="input" type="email" value={form.contact_email}
                     onChange={e => setForm({ ...form, contact_email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('business_machine_label')}</label>
            <select className="select w-full" value={form.machine_id}
                    onChange={e => setForm({ ...form, machine_id: e.target.value })}>
              <option value="">{t('business_machine_none')}</option>
              <optgroup label={t('business_machine_home')}>
                {MACHINES.filter(m => m.type === 'home').map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.optimal} L)</option>
                ))}
              </optgroup>
              <optgroup label={t('business_machine_commercial')}>
                {MACHINES.filter(m => m.type === 'commercial').map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.optimal} L)</option>
                ))}
              </optgroup>
            </select>
            <p className="text-[10px] text-[var(--ink3)] mt-1">{t('business_machine_help')}</p>
          </div>

          {/* === PIN para proteger el guardado de recetas === */}
          <div className="border-t border-black/10 pt-3">
            <h3 className="text-xs font-semibold text-[var(--ink2)] mb-1">🔒 {t('pin_section_title')}</h3>
            <p className="text-[11px] text-[var(--ink3)] mb-2">{t('pin_section_sub')}</p>
            {pinHasSaved ? (
              <div className="space-y-2">
                <div className="text-xs rounded-lg p-2 bg-[#e8f5ed] text-[#0d3d22] border border-[#b3d8c0]">
                  ✓ {t('pin_currently_set')}
                </div>
                <button type="button"
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--coral)] text-[var(--coral)] hover:bg-[var(--coral)] hover:text-white transition-colors cursor-pointer bg-transparent"
                        onClick={handleClearPin}>
                  {t('pin_clear_btn')}
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="password"
                  inputMode="numeric"
                  className="input w-32 text-center font-mono tracking-widest"
                  placeholder="••••"
                  value={pinDraft}
                  onChange={e => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 8))}
                />
                <button type="button"
                        className="btn-primary text-xs"
                        onClick={handleSetPin} disabled={pinDraft.length < 3}>
                  {t('pin_set_btn')}
                </button>
              </div>
            )}
          </div>

          {/* === Backup automatico via carpeta del PC (PRIMARIO) === */}
          <div className="border-t border-black/10 pt-4 mt-2">
            <h3 className="text-sm font-semibold text-[var(--ink)] mb-1 flex items-center gap-1.5">
              📁 {t('folder_backup_title_short')}
            </h3>
            <p className="text-[11px] text-[var(--ink3)] mb-3">{t('folder_backup_sub')}</p>

            {!folderSupported ? (
              <div className="text-[11px] rounded-lg p-3 bg-[#fff8e1] text-[#8a6d00] border border-[#ffe082]">
                ⚠ {t('folder_backup_unsupported')}
              </div>
            ) : folderHandle ? (
              <div className="space-y-2">
                <div className="text-xs rounded-lg p-3 bg-[#e8f5ed] text-[#0d3d22] border border-[#b3d8c0] font-medium">
                  ✓ {t('folder_backup_connected_to', { name: folderName })}
                  {lastFolderSync && (
                    <span className="block text-[10px] opacity-80 mt-1 font-normal">
                      {t('folder_backup_last_sync', { time: lastFolderSync.toLocaleString() })}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button type="button"
                          className="btn-primary text-xs"
                          onClick={handleSyncNow} disabled={folderBusy}>
                    {folderBusy ? '…' : '🔄 ' + t('folder_backup_sync_now')}
                  </button>
                  <button type="button"
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--coral)] text-[var(--coral)] hover:bg-[var(--coral)] hover:text-white transition-colors cursor-pointer bg-transparent"
                          onClick={handleDisconnectFolder}>
                    ✕ {t('folder_backup_disconnect')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs rounded-lg p-3 bg-[#fff8e1] text-[#8a6d00] border border-[#ffe082]">
                  ⚠ {t('folder_backup_not_connected')}
                </div>
                <button type="button"
                        className="btn-primary text-xs"
                        onClick={handlePickFolder} disabled={folderBusy}>
                  {folderBusy ? '…' : '📁 ' + t('folder_backup_connect')}
                </button>
              </div>
            )}
          </div>

          {/* === ZIP manual (SECUNDARIO/colapsado) === */}
          <details className="border-t border-black/10 pt-3">
            <summary className="text-xs text-[var(--ink3)] cursor-pointer hover:text-[var(--ink)] select-none">
              {t('backup_zip_advanced')}
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-[var(--ink3)]">{t('backup_zip_advanced_sub')}</p>
              {backupStatus && (
                <p className="text-[11px] text-[var(--ink2)]">
                  {backupStatus.daysSinceBackup === 0
                    ? t('backup_status_today')
                    : t('backup_status_days', { days: backupStatus.daysSinceBackup })}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <button type="button"
                        className="btn-soft text-xs"
                        onClick={handleExport}>
                  ⬇ {t('backup_export_btn')}
                </button>
                <button type="button"
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--coral)] text-[var(--coral)] hover:bg-[var(--coral)] hover:text-white transition-colors cursor-pointer bg-transparent"
                        onClick={handleImportClick}>
                  ⬆ {t('backup_import_btn')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
            </div>
          </details>
        </div>

        <div className="px-6 py-3 border-t border-black/10 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>{t('cancel')}</button>
          <button className="btn-primary" onClick={save} disabled={!form.fantasy_name.trim()}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
