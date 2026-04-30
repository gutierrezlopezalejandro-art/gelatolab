import { useState } from 'react';
import { useSupplierStore } from '../store/supplierStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useAppStore } from '../store/appStore';
import { useT } from '../lib/i18n';
import { track } from '../lib/analytics';
import { useEscapeKey } from '../lib/hooks';

/**
 * Catalogo global de proveedores. CRUD inline mas conteo de cuantos
 * movimientos 'in' del inventario los referencian (para evitar borrar
 * uno que tiene historico).
 */
export function SuppliersModal({ onClose }) {
  const t = useT();
  useEscapeKey(onClose);
  const { showToast, confirm } = useAppStore();
  const suppliers = useSupplierStore(s => s.list());
  const create = useSupplierStore(s => s.create);
  const update = useSupplierStore(s => s.update);
  const remove = useSupplierStore(s => s.remove);
  const movements = useInventoryStore(s => s.movements);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', lead_time_days: '', notes: '' });
  const [showNew, setShowNew] = useState(false);

  function usageCount(supplierId) {
    return movements.filter(m => m.supplier_id === supplierId).length;
  }

  function startEdit(s) {
    setEditingId(s.id);
    setForm({
      name: s.name || '',
      contact: s.contact || '',
      phone: s.phone || '',
      email: s.email || '',
      lead_time_days: s.lead_time_days != null ? String(s.lead_time_days) : '',
      notes: s.notes || '',
    });
    setShowNew(false);
  }

  function startNew() {
    setEditingId(null);
    setForm({ name: '', contact: '', phone: '', email: '', lead_time_days: '', notes: '' });
    setShowNew(true);
  }

  function cancel() {
    setEditingId(null);
    setShowNew(false);
  }

  function save(e) {
    e.preventDefault();
    if (!form.name.trim()) return showToast(t('supplier_name_required'), 'error');
    const patch = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
      notes: form.notes.trim(),
    };
    if (editingId != null) {
      update(editingId, patch);
      showToast(t('supplier_updated'));
    } else {
      const created = create(patch);
      if (!created) return showToast(t('supplier_name_required'), 'error');
      track('supplier_created');
      showToast(t('supplier_created'));
    }
    cancel();
  }

  async function handleDelete(s) {
    const used = usageCount(s.id);
    const msg = used > 0
      ? t('supplier_delete_warn_with_usage', { name: s.name, count: used })
      : t('supplier_delete_confirm', { name: s.name });
    const ok = await confirm(msg);
    if (!ok) return;
    remove(s.id);
    showToast(t('supplier_deleted'));
  }

  const editing = editingId != null || showNew;

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm"
         onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="suppliers-modal-title"
           className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between">
          <div>
            <h2 id="suppliers-modal-title" className="font-display text-lg text-[var(--ink)]">🚚 {t('suppliers_title')}</h2>
            <p className="text-xs text-[var(--ink3)]">{t('suppliers_subtitle')}</p>
          </div>
          <button onClick={onClose} aria-label={t('close')} className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Lista */}
          <div className="px-6 py-4">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-xs uppercase tracking-widest text-[var(--ink3)]">
                {t('suppliers_list')} <span className="opacity-60 normal-case">({suppliers.length})</span>
              </h3>
              {!editing && (
                <button onClick={startNew} className="btn-primary text-xs">
                  + {t('suppliers_new')}
                </button>
              )}
            </div>

            {suppliers.length === 0 && !editing ? (
              <p className="text-xs text-[var(--ink3)] text-center py-8">{t('suppliers_empty')}</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left py-1.5 font-semibold">{t('supplier_name')}</th>
                    <th className="text-left py-1.5 font-semibold">{t('supplier_contact')}</th>
                    <th className="text-left py-1.5 font-semibold">{t('supplier_phone')}</th>
                    <th className="text-right py-1.5 font-semibold">{t('supplier_lead_time')}</th>
                    <th className="text-right py-1.5 font-semibold">{t('supplier_usage')}</th>
                    <th className="py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id} className="border-b border-black/5 hover:bg-[var(--cream2)]/40">
                      <td className="py-1.5 font-semibold text-[var(--ink)]">{s.name}</td>
                      <td className="py-1.5 text-[var(--ink3)]">{s.contact || '—'}</td>
                      <td className="py-1.5 text-[var(--ink3)]">{s.phone || '—'}</td>
                      <td className="py-1.5 text-right tabular-nums text-[var(--ink3)]">
                        {s.lead_time_days != null ? `${s.lead_time_days} ${t('days_short')}` : '—'}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-[var(--ink3)]">{usageCount(s.id)}</td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <button onClick={() => startEdit(s)} className="text-[var(--mint)] hover:underline cursor-pointer bg-transparent border-none text-xs">
                          {t('edit')}
                        </button>
                        <button onClick={() => handleDelete(s)} className="text-[var(--coral)] hover:underline cursor-pointer bg-transparent border-none text-xs ml-2">
                          {t('delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Form */}
          {editing && (
            <form onSubmit={save} className="px-6 py-4 border-t border-black/10 bg-[var(--cream2)]/40">
              <h4 className="text-[10px] uppercase tracking-widest text-[var(--ink3)] mb-3">
                {editingId != null ? t('suppliers_edit_title') : t('suppliers_new_title')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label htmlFor="supplier-name" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('supplier_name')} *</label>
                  <input id="supplier-name" type="text" className="input" required value={form.name}
                         onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="supplier-contact" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('supplier_contact')}</label>
                  <input id="supplier-contact" type="text" className="input" value={form.contact}
                         onChange={e => setForm({ ...form, contact: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="supplier-phone" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('supplier_phone')}</label>
                  <input id="supplier-phone" type="tel" className="input" value={form.phone}
                         onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="supplier-email" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('supplier_email')}</label>
                  <input id="supplier-email" type="email" className="input" value={form.email}
                         onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="supplier-lead-time" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('supplier_lead_time')}</label>
                  <input id="supplier-lead-time" type="number" min="0" className="input text-right" value={form.lead_time_days}
                         onChange={e => setForm({ ...form, lead_time_days: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="supplier-notes" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('supplier_notes')}</label>
                  <input id="supplier-notes" type="text" className="input" value={form.notes}
                         onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={cancel}
                        className="px-4 py-2 rounded-lg text-sm bg-white border border-black/10 hover:bg-black/5 cursor-pointer">
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('save')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
