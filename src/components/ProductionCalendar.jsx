import { useState, useMemo } from 'react';
import { useT, useI18nStore } from '../lib/i18n';

/**
 * Vista calendario para /production (v1.0.13 Fase 2).
 *
 * Soporta dos modos:
 *   - 'month': cuadrícula mensual estilo Outlook (default)
 *   - 'week':  cuadrícula semanal con días verticales
 *
 * Por cada día muestra chips con: nombre del lote + litros totales del lote.
 * Si hay muchos lotes en un día, muestra los primeros N y "+X más" como
 * indicador. Click en un día abre detail panel con todos los lotes de ese
 * día + botón "Ir a planificación" (navega a /plan con la fecha pre-cargada).
 *
 * Color del chip por estado del lote:
 *   - Verde: confirmado (inventory_deducted_at set)
 *   - Amarillo: pendiente confirmar (pending_confirmation, prod_date == hoy)
 *   - Azul: planeado (futuro, sin descontar ni pending)
 */

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const LOCALE_MAP = { es: 'es-CL', en: 'en-US', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-BR' };

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function startOfWeek(d) {
  const out = new Date(d);
  const day = out.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // semana arranca en lunes
  out.setDate(out.getDate() + diff);
  return out;
}
function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

/**
 * Estado del lote → color del chip.
 * Devuelve { bg, fg } para inline styles.
 */
function statusColor(entry) {
  const today = ymd(new Date());
  const entryDate = String(entry.prod_date).slice(0, 10);
  if (entry.inventory_deducted_at) {
    return { bg: 'var(--mint)', fg: 'white' }; // verde — confirmado
  }
  if (entry.pending_confirmation) {
    return { bg: 'var(--gold)', fg: 'white' }; // amarillo — pendiente
  }
  if (entryDate > today) {
    return { bg: 'var(--teal)', fg: 'white' }; // azul — planeado
  }
  // Caso raro: fecha pasada sin descontar ni pending — lo tratamos como pending visual
  return { bg: 'var(--gold)', fg: 'white' };
}

export function ProductionCalendar({ entries, onDayClick }) {
  const t = useT();
  const lang = useI18nStore(s => s.lang);
  const locale = LOCALE_MAP[lang] || 'es-CL';

  const [view, setView] = useState('month'); // 'month' | 'week'
  const [cursor, setCursor] = useState(() => new Date());

  // Index entries por fecha YYYY-MM-DD para lookup rápido en cada celda
  const byDate = useMemo(() => {
    const acc = {};
    for (const e of entries) {
      const d = String(e.prod_date).slice(0, 10);
      (acc[d] = acc[d] || []).push(e);
    }
    return acc;
  }, [entries]);

  // Cells del view actual
  const cells = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    // Month view: 6 filas × 7 columnas. Empezar en lunes anterior al primero
    // del mes y llenar hasta cubrir 42 celdas (estandar calendario).
    const first = startOfMonth(cursor);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor, view]);

  // Header label segun el view
  const headerLabel = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor);
      const end = addDays(start, 6);
      const startStr = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(start);
      const endStr = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(end);
      return `${startStr} – ${endStr}`;
    }
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor);
  }, [cursor, view, locale]);

  function navigate(direction) {
    const d = new Date(cursor);
    if (view === 'week') {
      d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCursor(d);
  }

  function goToday() { setCursor(new Date()); }

  const today = new Date();
  const cursorMonth = cursor.getMonth();

  return (
    <div className="bg-white rounded-xl border border-black/10 overflow-hidden">
      {/* Header con navegacion + selector de view */}
      <div className="px-4 py-3 bg-[var(--cream)] border-b border-black/10 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('prev')}
                  className="w-8 h-8 rounded-lg border border-black/10 hover:bg-black/5 cursor-pointer flex items-center justify-center text-base"
                  aria-label={t('cal_prev')}>
            ‹
          </button>
          <button onClick={goToday}
                  className="px-3 h-8 rounded-lg border border-black/10 hover:bg-black/5 cursor-pointer text-xs font-semibold">
            {t('cal_today')}
          </button>
          <button onClick={() => navigate('next')}
                  className="w-8 h-8 rounded-lg border border-black/10 hover:bg-black/5 cursor-pointer flex items-center justify-center text-base"
                  aria-label={t('cal_next')}>
            ›
          </button>
        </div>
        <span className="font-display text-base text-[var(--ink)] capitalize flex-1 min-w-0">
          {headerLabel}
        </span>
        {/* Toggle vista */}
        <div className="inline-flex rounded-lg border border-black/10 overflow-hidden text-xs">
          <button onClick={() => setView('month')}
                  className={`px-3 py-1.5 cursor-pointer ${view === 'month' ? 'bg-[var(--ink)] text-[var(--cream)]' : 'bg-white hover:bg-black/5'}`}>
            {t('cal_view_month')}
          </button>
          <button onClick={() => setView('week')}
                  className={`px-3 py-1.5 cursor-pointer border-l border-black/10 ${view === 'week' ? 'bg-[var(--ink)] text-[var(--cream)]' : 'bg-white hover:bg-black/5'}`}>
            {t('cal_view_week')}
          </button>
        </div>
      </div>

      {/* Header de dias de la semana (Lun Mar...) */}
      <div className="grid grid-cols-7 border-b border-black/10 bg-black/5">
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-[var(--ink3)] py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de celdas */}
      <div className={`grid grid-cols-7 ${view === 'week' ? '' : 'auto-rows-[100px]'}`}>
        {cells.map((d, i) => {
          const ds = ymd(d);
          const dayEntries = byDate[ds] || [];
          const isCurrentMonth = view === 'week' || d.getMonth() === cursorMonth;
          const isToday = isSameDate(d, today);
          // Cuantos chips mostrar antes de cortar a "+N mas"
          const maxChips = view === 'week' ? 8 : 3;
          const visibleEntries = dayEntries.slice(0, maxChips);
          const hiddenCount = dayEntries.length - visibleEntries.length;

          return (
            <button
              key={ds + '-' + i}
              type="button"
              onClick={() => onDayClick && onDayClick(ds, dayEntries)}
              className={`text-left p-1.5 border-r border-b border-black/10 last:border-r-0 hover:bg-[var(--cream)] transition-colors cursor-pointer overflow-hidden flex flex-col gap-1 bg-white
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${view === 'week' ? 'min-h-[280px]' : ''}`}
              aria-label={`${ds} — ${dayEntries.length} lote(s)`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isToday ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--mint)] text-white' : 'text-[var(--ink2)]'}`}>
                  {d.getDate()}
                </span>
                {dayEntries.length > 0 && (
                  <span className="text-[9px] font-bold text-[var(--ink3)]">
                    {dayEntries.reduce((s, e) => s + (parseFloat(e.liters) || 0), 0).toFixed(1)}L
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visibleEntries.map(e => {
                  const c = statusColor(e);
                  return (
                    <span key={e.id}
                          className="text-[10px] font-semibold px-1 py-0.5 rounded truncate"
                          style={{ background: c.bg, color: c.fg }}
                          title={`${e.recipe_name} — ${parseFloat(e.liters || 0).toFixed(1)}L`}>
                      {e.recipe_name} · {parseFloat(e.liters || 0).toFixed(1)}L
                    </span>
                  );
                })}
                {hiddenCount > 0 && (
                  <span className="text-[9px] text-[var(--ink3)] px-1">+{hiddenCount} {t('cal_more')}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Leyenda de colores */}
      <div className="px-4 py-2 border-t border-black/10 bg-black/5 flex flex-wrap gap-3 text-[10px] text-[var(--ink3)]">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'var(--mint)' }}></span>{t('cal_legend_confirmed')}</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'var(--gold)' }}></span>{t('cal_legend_pending')}</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'var(--teal)' }}></span>{t('cal_legend_planned')}</span>
      </div>
    </div>
  );
}
