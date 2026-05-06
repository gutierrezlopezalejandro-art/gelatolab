import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../lib/i18n';

export default function SearchSelect({
  options = [], value, onChange,
  placeholder, className = '',
  disabled = false,
  id,
}) {
  const t = useT();
  // Si el caller no pasa placeholder, default i18n. Antes era `'Buscar…'`
  // hardcoded, lo que dejaba el componente en español incluso para usuarios
  // EN/PT/etc. cuando se omitía la prop.
  const effectivePlaceholder = placeholder ?? t('search_placeholder');
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [active,  setActive]  = useState(0);
  const [pos,     setPos]     = useState(null); // { top, left, width, openUp }
  const inputRef     = useRef(null);
  const containerRef = useRef(null);
  const listRef      = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  const filtered = useMemo(() =>
    query.trim()
      ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
      : options
  , [options, query]);

  // Group options for display, but keep a flat array for keyboard navigation
  // so ArrowUp/Down moves through the same order the user sees on screen.
  const { hasGroups, ungrouped, groups, flat } = useMemo(() => {
    const groups = {};
    const ungrouped = [];
    filtered.forEach(o => {
      if (o.group) {
        if (!groups[o.group]) groups[o.group] = [];
        groups[o.group].push(o);
      } else {
        ungrouped.push(o);
      }
    });
    const hasGroups = Object.keys(groups).length > 0;
    const flat = [...ungrouped, ...Object.values(groups).flat()];
    return { hasGroups, ungrouped, groups, flat };
  }, [filtered]);

  // Recompute dropdown position when opened, on scroll, on resize.
  useLayoutEffect(() => {
    if (!open) return;
    function recompute() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dropH = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < dropH && spaceAbove > spaceBelow;
      setPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUp,
      });
    }
    recompute();
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [open]);

  // Close on outside click (portal-aware: ignore clicks inside listRef too)
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (containerRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
      setQuery('');
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Reset highlighted row whenever the filter changes so it never points
  // beyond the current list.
  useEffect(() => { setActive(0); }, [query]);

  // Scroll the active row into view when it changes via keyboard.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-row-idx="${active}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function handleOpen() {
    setOpen(true);
    setQuery('');
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(val) {
    onChange(val);
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = flat[active];
      if (opt) handleSelect(opt.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(flat.length - 1);
    }
  }

  // Map every option to its position in the flat list so OptionRow knows
  // whether it's the active (keyboard-highlighted) one.
  const flatIndexByValue = useMemo(() => {
    const m = new Map();
    flat.forEach((o, i) => m.set(String(o.value), i));
    return m;
  }, [flat]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        className={`select flex items-center justify-between ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={disabled ? undefined : handleOpen}
        onKeyDown={disabled ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            handleOpen();
          }
        }}
        style={{ userSelect: 'none', opacity: disabled ? 0.6 : 1, background: disabled ? '#f5f5f5' : undefined }}
        aria-disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selected ? 'text-[var(--ink)]' : 'text-[var(--ink3)]'}>
          {selected ? selected.label : effectivePlaceholder}
        </span>
        <span className="text-[var(--ink3)] text-xs ml-2" style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.15s',
          display: 'inline-block',
        }}>▼</span>
      </div>

      {/* Dropdown rendered in a portal so overflow-hidden / overflow-x-auto on
          parent containers (e.g. tables) can't clip it. */}
      {open && pos && createPortal(
        <div
          ref={listRef}
          className="bg-white rounded-xl border border-black/10 shadow-2xl overflow-hidden"
          style={{
            position: 'fixed',
            zIndex: 9999,
            left: pos.left,
            width: pos.width,
            ...(pos.openUp
              ? { bottom: window.innerHeight - pos.top, maxHeight: 320 }
              : { top: pos.top, maxHeight: 320 }),
          }}
          role="listbox"
        >
          {/* Search */}
          <div className="p-2 border-b border-black/10 bg-[var(--cream)]">
            <input
              ref={inputRef}
              type="text"
              className="input text-sm py-1.5"
              placeholder={t('search_inside_dropdown')}
              aria-label={t('search_inside_dropdown')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: 258 }}>
            <div
              className="px-3 py-2 text-sm text-[var(--ink3)] hover:bg-[var(--cream)] cursor-pointer"
              onClick={() => handleSelect('')}
            >
              — {effectivePlaceholder} —
            </div>

            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-[var(--ink3)] text-center">
                {t('search_no_results', { query })}
              </div>
            )}

            {hasGroups ? (
              <>
                {ungrouped.map(o => (
                  <OptionRow
                    key={o.value} o={o} value={value} onSelect={handleSelect}
                    indent={false}
                    activeIndex={active}
                    rowIndex={flatIndexByValue.get(String(o.value))}
                  />
                ))}
                {Object.entries(groups).map(([group, items]) => (
                  <div key={group}>
                    <div className="px-3 py-1 text-[10px] font-bold text-[var(--ink3)]
                                    uppercase tracking-widest bg-[var(--cream2)] sticky top-0">
                      {group}
                    </div>
                    {items.map(o => (
                      <OptionRow
                        key={o.value} o={o} value={value} onSelect={handleSelect}
                        indent
                        activeIndex={active}
                        rowIndex={flatIndexByValue.get(String(o.value))}
                      />
                    ))}
                  </div>
                ))}
              </>
            ) : (
              filtered.map(o => (
                <OptionRow
                  key={o.value} o={o} value={value} onSelect={handleSelect}
                  indent={false}
                  activeIndex={active}
                  rowIndex={flatIndexByValue.get(String(o.value))}
                />
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function OptionRow({ o, value, onSelect, indent, activeIndex, rowIndex }) {
  const active = String(o.value) === String(value);
  const highlighted = rowIndex === activeIndex;
  return (
    <div
      data-row-idx={rowIndex}
      role="option"
      aria-selected={active}
      className={`py-2 text-sm cursor-pointer transition-colors
                  ${indent ? 'px-4' : 'px-3'}
                  ${highlighted
                    ? 'bg-[var(--mint3)] text-[var(--mint)]'
                    : active
                      ? 'bg-[var(--mint3)]/50 text-[var(--mint)] font-medium'
                      : 'hover:bg-[var(--cream)] text-[var(--ink)]'}`}
      onClick={() => onSelect(o.value)}
    >
      {o.label}
    </div>
  );
}
