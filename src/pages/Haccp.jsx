import { useState, useMemo, useEffect } from 'react';
import { useHaccpStore, getDefaultUnit, getDailySummary } from '../store/haccpStore';
import { useAppStore } from '../store/appStore';
import { useBusinessStore } from '../store/businessStore';
import { getMachine } from '../data/machines';
import { useT, useLocale } from '../lib/i18n';
import { track } from '../lib/analytics';
import { ProGate } from '../components/ProGate';
import { FEATURES } from '../lib/entitlement';

const TYPES = ['cold_storage', 'freezer', 'pasteurization', 'churning', 'reception', 'cleaning', 'other'];
const STATUS_COLOR = {
  ok:   { bg: 'var(--mint)',  fg: 'white' },
  warn: { bg: 'var(--gold)',  fg: 'white' },
  fail: { bg: 'var(--coral)', fg: 'white' },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Haccp() {
  const t = useT();
  const locale = useLocale();
  const { showToast, confirm } = useAppStore();
  const entries = useHaccpStore(s => s.list());
  const add = useHaccpStore(s => s.add);
  const remove = useHaccpStore(s => s.remove);

  // Filter UI
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Quick-add form
  const [type, setType] = useState('cold_storage');
  const [location, setLocation] = useState('');
  const [value, setValue] = useState('');
  const [operator, setOperator] = useState(() => {
    try { return localStorage.getItem('gelatolab-haccp-last-operator') || ''; } catch { return ''; }
  });
  const [notes, setNotes] = useState('');
  const [statusOverride, setStatusOverride] = useState(''); // '' = auto

  const today = todayISO();
  const summary = getDailySummary(today);

  // Configured equipment used to auto-fill / suggest the "location" field for
  // pasteurization and churning entries. Arrays porque hay multi-equipo.
  const machineIds     = useBusinessStore(s => s.machine_ids || []);
  const pasteurizerIds = useBusinessStore(s => s.pasteurizer_ids || []);
  const batchFreezers  = machineIds.map(getMachine).filter(Boolean);
  const pasteurizers   = pasteurizerIds.map(getMachine).filter(Boolean);
  // For churning: list every batch_freezer + combo. For pasteurization: list
  // every pasteurizer + combos that double as pasteurizers.
  const suggestedLocations = (() => {
    if (type === 'churning') {
      return batchFreezers.map(m => m.name);
    }
    if (type === 'pasteurization') {
      const seen = new Set();
      const list = [];
      for (const m of pasteurizers) { if (!seen.has(m.id)) { seen.add(m.id); list.push(m.name); } }
      for (const m of batchFreezers) {
        if (m.kind === 'combo' && !seen.has(m.id)) { seen.add(m.id); list.push(m.name); }
      }
      return list;
    }
    return [];
  })();
  // Auto-fill location when switching to a type with a single configured
  // equipment, but only if the field is empty (don't clobber operator input).
  useEffect(() => {
    if (suggestedLocations.length === 1 && !location.trim()) {
      setLocation(suggestedLocations[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterType && e.type !== filterType) return false;
      if (filterFrom && e.date < filterFrom) return false;
      if (filterTo && e.date > filterTo) return false;
      return true;
    });
  }, [entries, filterType, filterFrom, filterTo]);

  // Group by date for display.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const e of filtered) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  function handleAdd(e) {
    e.preventDefault();
    if (!type) return;
    // Para cleaning/reception/other: el valor es opcional. Para temps debe haber numero.
    const needsNumeric = ['cold_storage', 'freezer', 'pasteurization', 'churning'].includes(type);
    const v = parseFloat(value);
    if (needsNumeric && !Number.isFinite(v)) {
      return showToast(t('haccp_value_required'), 'error');
    }
    if (!operator.trim()) return showToast(t('haccp_operator_required'), 'error');
    const entry = add({
      type,
      location,
      value: needsNumeric ? v : (Number.isFinite(v) ? v : null),
      operator,
      notes,
      status: statusOverride || undefined,
    });
    track('haccp_check_recorded', { type, status: entry?.status });
    try { localStorage.setItem('gelatolab-haccp-last-operator', operator.trim()); } catch {}
    setValue('');
    setLocation('');
    setNotes('');
    setStatusOverride('');
    showToast(t('haccp_entry_recorded'));
  }

  async function handleRemove(entry) {
    const ok = await confirm(t('haccp_delete_confirm'));
    if (!ok) return;
    remove(entry.id);
    showToast(t('haccp_entry_removed'));
  }

  function exportCsv() {
    const rows = [
      ['date', 'time', 'type', 'location', 'value', 'unit', 'status', 'operator', 'notes'],
      ...filtered.map(e => [
        e.date, e.time, e.type, e.location || '',
        e.value != null ? e.value : '',
        e.unit || '',
        e.status, e.operator, (e.notes || '').replace(/[\r\n]+/g, ' '),
      ]),
    ];
    const csv = rows.map(r =>
      r.map(c => {
        const s = String(c ?? '');
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(';')
    ).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `haccp-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const needsNumeric = ['cold_storage', 'freezer', 'pasteurization', 'churning'].includes(type);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-[var(--ink)]">🧪 {t('haccp_title')}</h1>
          <p className="text-sm text-[var(--ink3)] mt-1">{t('haccp_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <ProGate feature={FEATURES.HACCP_EXPORT} mode="intercept">
            <button onClick={exportCsv} disabled={filtered.length === 0}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white border-none cursor-pointer disabled:opacity-50"
                    style={{ background: '#0d5c6e' }}>
              📥 {t('haccp_export_csv')}
            </button>
          </ProGate>
        </div>
      </div>

      {/* Today summary */}
      <div className="card p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink3)]">{t('haccp_today')}</div>
          <div className="font-display text-2xl text-[var(--ink)]">{summary.total}</div>
          <div className="text-[10px] text-[var(--ink3)]">{t('haccp_today_total')}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink3)]">{t('haccp_status_ok')}</div>
          <div className="font-display text-2xl" style={{ color: 'var(--mint)' }}>{summary.ok}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink3)]">{t('haccp_status_warn')}</div>
          <div className="font-display text-2xl" style={{ color: 'var(--gold)' }}>{summary.warn}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink3)]">{t('haccp_status_fail')}</div>
          <div className="font-display text-2xl" style={{ color: 'var(--coral)' }}>{summary.fail}</div>
        </div>
      </div>

      {/* Quick-add form */}
      <form data-tour="haccp-form" onSubmit={handleAdd} className="card p-4 mb-6">
        <h3 className="text-xs uppercase tracking-widest text-[var(--ink3)] mb-3">{t('haccp_new_entry')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_140px_140px] gap-3 items-end mb-3">
          <div>
            <label htmlFor="haccp-type" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('haccp_type')}</label>
            <select id="haccp-type" className="select" value={type} onChange={e => { setType(e.target.value); setStatusOverride(''); }}>
              {TYPES.map(tp => <option key={tp} value={tp}>{t('haccp_type_' + tp)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="haccp-location" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('haccp_location')}</label>
            <input id="haccp-location" type="text" className="input" placeholder={t('haccp_location_placeholder')}
                   list={suggestedLocations.length > 0 ? 'haccp-location-suggestions' : undefined}
                   value={location} onChange={e => setLocation(e.target.value)} />
            {suggestedLocations.length > 0 && (
              <datalist id="haccp-location-suggestions">
                {suggestedLocations.map(s => <option key={s} value={s} />)}
              </datalist>
            )}
          </div>
          <div>
            <label htmlFor="haccp-value" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">
              {t('haccp_value')} {getDefaultUnit(type) && <span className="opacity-60">({getDefaultUnit(type)})</span>}
            </label>
            <input id="haccp-value" type="number" step="any" className="input text-right"
                   placeholder={needsNumeric ? '' : t('haccp_optional')}
                   value={value} onChange={e => setValue(e.target.value)}
                   required={needsNumeric} />
          </div>
          <div>
            <label htmlFor="haccp-status" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('haccp_status_override')}</label>
            <select id="haccp-status" className="select" value={statusOverride} onChange={e => setStatusOverride(e.target.value)}>
              <option value="">{t('haccp_status_auto')}</option>
              <option value="ok">{t('haccp_status_ok')}</option>
              <option value="warn">{t('haccp_status_warn')}</option>
              <option value="fail">{t('haccp_status_fail')}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="haccp-operator" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('haccp_operator')}</label>
            <input id="haccp-operator" type="text" className="input" placeholder={t('haccp_operator_placeholder')}
                   value={operator} onChange={e => setOperator(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="haccp-notes" className="text-[10px] uppercase tracking-widest text-[var(--ink3)] block mb-1">{t('haccp_notes')}</label>
            <input id="haccp-notes" type="text" className="input" placeholder={t('haccp_notes_placeholder')}
                   value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">+ {t('haccp_record')}</button>
        </div>
        {needsNumeric && (
          <p className="text-[10px] text-[var(--ink3)] mt-2">
            💡 {t('haccp_threshold_hint_' + type)}
          </p>
        )}
      </form>

      {/* Filters */}
      <div className="card p-3 mb-4 flex flex-wrap gap-3 items-center">
        <span className="text-[10px] uppercase tracking-widest text-[var(--ink3)]">{t('haccp_filters')}</span>
        <select className="select max-w-[180px]" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">{t('haccp_filter_all_types')}</option>
          {TYPES.map(tp => <option key={tp} value={tp}>{t('haccp_type_' + tp)}</option>)}
        </select>
        <input type="date" className="input max-w-[160px]" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
        <span className="text-[var(--ink3)]">→</span>
        <input type="date" className="input max-w-[160px]" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        {(filterType || filterFrom || filterTo) && (
          <button onClick={() => { setFilterType(''); setFilterFrom(''); setFilterTo(''); }}
                  className="text-xs text-[var(--coral)] hover:underline cursor-pointer bg-transparent border-none">
            {t('haccp_clear_filters')}
          </button>
        )}
        <span className="ml-auto text-[10px] text-[var(--ink3)]">
          {filtered.length} {filtered.length === 1 ? t('haccp_entry_one') : t('haccp_entry_many')}
        </span>
      </div>

      {/* List grouped by date */}
      {grouped.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3" aria-hidden="true">🧪</div>
          <p className="text-sm text-[var(--ink2)] mb-4">{t('haccp_empty')}</p>
          <button
            onClick={() => {
              // Foco en el primer campo del form de Quick-add para que el
              // usuario sepa exactamente dónde registrar su primera medición.
              document.getElementById('haccp-type')?.focus();
              document.querySelector('[data-tour="haccp-form"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="btn-primary"
          >
            {t('haccp_record_first')}
          </button>
        </div>
      ) : (
        grouped.map(([date, items]) => (
          <div key={date} className="card mb-4 overflow-hidden">
            <div className="px-4 py-2 bg-[var(--cream2)]/40 border-b border-black/10 flex items-baseline justify-between">
              <span className="font-semibold text-sm">{date}</span>
              <span className="text-[10px] text-[var(--ink3)]">{items.length} {t('haccp_checks')}</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/10 bg-white">
                  <th className="text-left py-2 px-3 font-semibold w-16">{t('haccp_time')}</th>
                  <th className="text-left py-2 px-3 font-semibold">{t('haccp_type')}</th>
                  <th className="text-left py-2 px-3 font-semibold">{t('haccp_location')}</th>
                  <th className="text-right py-2 px-3 font-semibold">{t('haccp_value')}</th>
                  <th className="text-center py-2 px-3 font-semibold">{t('haccp_status')}</th>
                  <th className="text-left py-2 px-3 font-semibold">{t('haccp_operator')}</th>
                  <th className="text-left py-2 px-3 font-semibold">{t('haccp_notes')}</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(e => {
                  const c = STATUS_COLOR[e.status] || STATUS_COLOR.ok;
                  return (
                    <tr key={e.id} className="border-b border-black/5 hover:bg-[var(--cream2)]/40">
                      <td className="py-1.5 px-3 tabular-nums text-[var(--ink3)]">{e.time}</td>
                      <td className="py-1.5 px-3">{t('haccp_type_' + e.type)}</td>
                      <td className="py-1.5 px-3 text-[var(--ink3)]">{e.location || '—'}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums">
                        {e.value != null
                          ? `${e.value.toLocaleString(locale, { maximumFractionDigits: 2 })} ${e.unit || ''}`
                          : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase"
                              style={{ background: c.bg, color: c.fg }}>
                          {t('haccp_status_' + e.status)}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-[var(--ink3)]">{e.operator}</td>
                      <td className="py-1.5 px-3 text-[var(--ink3)]">{e.notes || '—'}</td>
                      <td className="py-1.5 px-3 text-right">
                        <button onClick={() => handleRemove(e)}
                                className="text-[var(--coral)] hover:underline cursor-pointer bg-transparent border-none text-xs">
                          {t('delete')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
