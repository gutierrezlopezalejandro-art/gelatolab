import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../lib/i18n';
import { getBusinessFields, COUNTRIES } from '../lib/countryRegulations';
import { useCountryStore } from '../store/countryStore';
import { useBusinessStore } from '../store/businessStore';
import { useAppStore } from '../store/appStore';
import { getBatchFreezers, getPasteurizers } from '../data/machines';
import { useEntitlement, FEATURES, FREE_LIMITS } from '../lib/entitlement';
import { ProBadge, ProGate } from './ProGate';
import { UpgradeModal } from './UpgradeModal';
import { exportBackup, importBackup, getBackupStatus } from '../lib/backup';
import { exportUserDataAsZip } from '../lib/userDataExport';
import { setPin as savePin, isPinSet, lock as pinLock } from '../lib/pinLock';
import { track } from '../lib/analytics';
import { useDirtyClose } from '../lib/hooks';

/**
 * Edit-after-onboarding modal. Reuses the same fields the wizard captured but
 * without the language / country steps (those have their own selectors in the
 * nav). Lets the user fix the heladería profile any time.
 */
export function BusinessSettingsModal({ onClose }) {
  const t = useT();
  const business = useBusinessStore();
  const country = useCountryStore(s => s.country);
  const setCountry = useCountryStore(s => s.setCountry);
  const { showToast, confirm } = useAppStore();
  const fileInputRef = useRef(null);
  const [backupStatus, setBackupStatus] = useState(getBackupStatus());
  const [pinDraft, setPinDraft] = useState('');
  const [pinHasSaved, setPinHasSaved] = useState(isPinSet());
  // Account deletion (requisito Apple App Store)
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  // Exportacion de datos personales (derecho de acceso + portabilidad,
  // Ley 21.719 chilena). Genera un ZIP con 1 JSON por store + README.
  // Agregado 2026-05-11 tras auditoria legal Sandra Fernandez (gap G11).
  async function handleExportMyData() {
    setExporting(true);
    try {
      const { filename, sizeBytes } = await exportUserDataAsZip();
      showToast(t('account_export_ok', { filename, size: (sizeBytes / 1024).toFixed(1) }));
      track('user_data_exported');
    } catch (err) {
      showToast(err.message || t('account_export_failed'), 'error');
    } finally {
      setExporting(false);
    }
  }

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
    machine_ids:     Array.isArray(business.machine_ids)     ? business.machine_ids     : [],
    pasteurizer_ids: Array.isArray(business.pasteurizer_ids) ? business.pasteurizer_ids : [],
  });

  const ent = useEntitlement();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Dirty cuando cualquier campo del form difiere del valor persistido en
  // el store. Comparamos los 7 campos string + length de los arrays de
  // equipos. PIN draft y delete confirm se ignoran (no son edits del perfil).
  const dirty = (
    form.fantasy_name !== business.fantasy_name ||
    form.legal_name !== business.legal_name ||
    form.tax_id !== business.tax_id ||
    form.sanitary_reg !== business.sanitary_reg ||
    form.address !== business.address ||
    form.contact_phone !== business.contact_phone ||
    form.contact_email !== business.contact_email ||
    JSON.stringify(form.machine_ids) !== JSON.stringify(business.machine_ids || []) ||
    JSON.stringify(form.pasteurizer_ids) !== JSON.stringify(business.pasteurizer_ids || [])
  );
  const requestClose = useDirtyClose(onClose, dirty);

  function addMachine(id) {
    if (!id || form.machine_ids.includes(id)) return;
    // Free plan: limit to 1 batch freezer.
    if (!ent.can(FEATURES.MULTI_EQUIPMENT) && form.machine_ids.length >= FREE_LIMITS.equipment) {
      setShowUpgrade(true);
      return;
    }
    setForm({ ...form, machine_ids: [...form.machine_ids, id] });
  }
  function removeMachine(id) {
    setForm({ ...form, machine_ids: form.machine_ids.filter(x => x !== id) });
  }
  function addPasteurizer(id) {
    if (!id || form.pasteurizer_ids.includes(id)) return;
    // Free plan: limit to 1 pasteurizer.
    if (!ent.can(FEATURES.MULTI_EQUIPMENT) && form.pasteurizer_ids.length >= FREE_LIMITS.equipment) {
      setShowUpgrade(true);
      return;
    }
    setForm({ ...form, pasteurizer_ids: [...form.pasteurizer_ids, id] });
  }
  function removePasteurizer(id) {
    setForm({ ...form, pasteurizer_ids: form.pasteurizer_ids.filter(x => x !== id) });
  }
  function machineLabel(id) {
    const m = getBatchFreezers().find(x => x.id === id) || getPasteurizers().find(x => x.id === id);
    if (!m) return id;
    return `${m.name} (${m.optimal} L)${m.kind === 'combo' ? ` · ${t('business_combo_tag')}` : ''}`;
  }

  const fields = getBusinessFields(country);

  function save() {
    business.update(form);
    showToast(t('business_saved'));
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm p-4"
      onClick={requestClose}
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
          <button onClick={requestClose} aria-label={t('close')}
                  className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('country_label')} *</label>
            <select className="input" value={country}
                    onChange={e => setCountry(e.target.value)}>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('onb_fantasy_name')} *</label>
            <input className="input" value={form.fantasy_name}
                   onChange={e => setForm({ ...form, fantasy_name: e.target.value })} />
            <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_fantasy_name')}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('onb_legal_name')}</label>
            <input className="input" value={form.legal_name}
                   onChange={e => setForm({ ...form, legal_name: e.target.value })} />
            <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_legal_name')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{fields.tax_id_label}</label>
              <input className="input" value={form.tax_id}
                     onChange={e => setForm({ ...form, tax_id: e.target.value })} />
              <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_tax_id')}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{fields.sanitary_label}</label>
              <input className="input" value={form.sanitary_reg}
                     onChange={e => setForm({ ...form, sanitary_reg: e.target.value })} />
              <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_sanitary_reg')}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('onb_address')}</label>
            <input className="input" value={form.address}
                   onChange={e => setForm({ ...form, address: e.target.value })} />
            <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_address')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('business_phone')}</label>
              <input className="input" type="tel" value={form.contact_phone}
                     onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
              <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_phone')}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('business_email')}</label>
              <input className="input" type="email" value={form.contact_email}
                     onChange={e => setForm({ ...form, contact_email: e.target.value })} />
              <p className="text-[10px] text-[var(--ink3)] mt-1">{t('field_hint_email')}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('business_machine_label')}</label>
            {form.machine_ids.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.machine_ids.map(id => (
                  <span key={id} className="inline-flex items-center gap-1 text-[11px] bg-[var(--cream2)] text-[var(--ink)] rounded-full px-2.5 py-1">
                    {machineLabel(id)}
                    <button type="button"
                            onClick={() => removeMachine(id)}
                            className="text-[var(--coral)] hover:text-red-700 cursor-pointer bg-transparent border-none px-1 leading-none"
                            aria-label={t('remove')}>×</button>
                  </span>
                ))}
              </div>
            )}
            <select className="select w-full" value=""
                    onChange={e => { addMachine(e.target.value); e.target.value = ''; }}>
              <option value="">{form.machine_ids.length === 0 ? t('business_machine_none') : t('business_machine_add_more')}</option>
              <optgroup label={t('business_machine_home')}>
                {getBatchFreezers().filter(m => m.type === 'home' && !form.machine_ids.includes(m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.optimal} L)</option>
                ))}
              </optgroup>
              <optgroup label={t('business_machine_commercial')}>
                {getBatchFreezers().filter(m => m.type === 'commercial' && !form.machine_ids.includes(m.id)).map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.optimal} L){m.kind === 'combo' ? ` · ${t('business_combo_tag')}` : ''}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="text-[10px] text-[var(--ink3)] mt-1">{t('business_machine_help')}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--ink2)] block mb-1">{t('business_pasteurizer_label')}</label>
            {form.pasteurizer_ids.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.pasteurizer_ids.map(id => (
                  <span key={id} className="inline-flex items-center gap-1 text-[11px] bg-[var(--cream2)] text-[var(--ink)] rounded-full px-2.5 py-1">
                    {machineLabel(id)}
                    <button type="button"
                            onClick={() => removePasteurizer(id)}
                            className="text-[var(--coral)] hover:text-red-700 cursor-pointer bg-transparent border-none px-1 leading-none"
                            aria-label={t('remove')}>×</button>
                  </span>
                ))}
              </div>
            )}
            <select className="select w-full" value=""
                    onChange={e => { addPasteurizer(e.target.value); e.target.value = ''; }}>
              <option value="">{form.pasteurizer_ids.length === 0 ? t('business_pasteurizer_none') : t('business_pasteurizer_add_more')}</option>
              {getPasteurizers().filter(m => !form.pasteurizer_ids.includes(m.id)).map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.optimal} L){m.kind === 'combo' ? ` · ${t('business_combo_tag')}` : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--ink3)] mt-1">{t('business_pasteurizer_help')}</p>
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

          {/* === COPIA DE SEGURIDAD ===
              Reemplaza a las dos secciones anteriores: el respaldo a una
              carpeta del PC (que dependia de la File System Access API o de
              Tauri y en un telefono no existe) y el ZIP "avanzado" que
              estaba colapsado.

              Al no haber nube propia, el dispositivo es la UNICA copia del
              recetario, asi que esto deja de ser una opcion secundaria y
              pasa a ser una seccion principal.

              El archivo se entrega por la hoja nativa de compartir y el
              usuario elige su iCloud Drive, su Google Drive o lo que quiera.
              Nosotros no guardamos nada.

              NO se gatea por plan: no se le cobra a nadie por no perder sus
              datos. */}
          <div className="border-t border-black/10 pt-4 mt-2">
            <h3 className="text-sm font-semibold text-[var(--ink)] mb-1 flex items-center gap-1.5">
              ☁️ {t('backup_section_title')}
            </h3>
            <p className="text-[11px] text-[var(--ink3)] mb-3">{t('backup_section_sub')}</p>

            <p className="text-[11px] text-[var(--ink2)] mb-3">
              {backupStatus === null
                ? t('backup_never')
                : backupStatus.daysSinceBackup === 0
                  ? t('backup_status_today')
                  : t('backup_last', { days: backupStatus.daysSinceBackup })}
            </p>

            <div className="flex gap-2 flex-wrap">
              <button type="button" className="btn-primary text-xs" onClick={handleExport}>
                ☁️ {t('backup_now')}
              </button>
              <button type="button"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--coral)] text-[var(--coral)] hover:bg-[var(--coral)] hover:text-white transition-colors cursor-pointer bg-transparent"
                      onClick={handleImportClick}>
                ⬆ {t('backup_restore')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>

            {/* Si el usuario cerro el recordatorio con x en el panel, queda
                descartado por toda la sesion. Esto lo vuelve a habilitar. */}
            <button type="button"
                    className="text-[11px] text-[var(--mint)] hover:underline cursor-pointer bg-transparent border-none mt-3"
                    onClick={() => {
                      try { sessionStorage.removeItem('__gelatolab_backup_reminder_dismissed'); } catch { /* tolerable */ }
                      showToast(t('backup_reminder_restored'));
                    }}>
              ↻ {t('backup_reminder_restore')}
            </button>
          </div>

          {/* === EXPORTAR MIS DATOS ===
              Cumple derecho de acceso + portabilidad de Ley 21.719 chilena
              (auditoria legal Sandra Fernandez 2026-05-11, gap G11). El
              usuario puede descargar un ZIP con TODOS sus datos en formato
              JSON estandar para llevarse a otro sistema o tener un respaldo
              independiente. Disponible para todos (Free y Pro).
              Sin cuentas ya no se gatea por sesion: es el respaldo del
              usuario y el dispositivo es la unica copia. */}
          {(
            <details className="border-t border-black/10 pt-3 mt-2">
              <summary className="text-xs font-semibold text-[var(--ink2)] cursor-pointer hover:opacity-80 select-none">
                {t('account_export_section')}
              </summary>
              <div className="mt-3 p-4 rounded-lg bg-[var(--cream2)]/40 border border-black/10">
                <h3 className="font-semibold text-sm text-[var(--ink)] mb-1">
                  {t('account_export_title')}
                </h3>
                <p className="text-xs text-[var(--ink2)] leading-relaxed mb-3">
                  {t('account_export_body')}
                </p>
                <button
                  type="button"
                  onClick={handleExportMyData}
                  disabled={exporting}
                  className="w-full text-sm font-semibold px-4 py-2 rounded-lg
                             bg-[var(--ink)] text-[var(--cream)] border-none cursor-pointer
                             disabled:opacity-40 disabled:cursor-not-allowed
                             hover:opacity-90 transition-opacity"
                >
                  {exporting ? t('saving') : `↓ ${t('account_export_btn')}`}
                </button>
              </div>
            </details>
          )}

          <div className="pt-4 mt-2 border-t border-black/5 text-center text-[10px] text-[var(--ink3)]">
            GelatoLab v{__APP_VERSION__} · desarrollado y soportado por <span className="font-semibold text-[var(--ink2)]">Llanquihue Tech SpA</span>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-black/10 flex justify-end gap-2">
          <button className="btn-secondary" onClick={requestClose}>{t('cancel')}</button>
          <button className="btn-primary" onClick={save} disabled={!form.fantasy_name.trim()}>
            {t('save')}
          </button>
        </div>
      </div>
      <UpgradeModal open={showUpgrade} featureKey={FEATURES.MULTI_EQUIPMENT}
                    onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
