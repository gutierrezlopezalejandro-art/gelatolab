import { useState, useEffect } from 'react';

/**
 * Drop-in replacement for `<input type="number">` that lets the user clear
 * the field, type partial decimals like "0." and "0.5", and start with
 * arbitrary digits without the value being clamped to a fallback on every
 * keystroke.
 *
 * The component holds the raw string the user typed in local state so React
 * never overrides what the input shows mid-typing. Whenever the string is
 * parseable as a number, that number is emitted via `onChange`. When the
 * field is cleared, `fallback` (default 0) is emitted — but the input still
 * displays empty so the user can keep typing without backspace gymnastics.
 *
 * Use exactly like a native input:
 *   <NumberInput value={liters} onChange={setLiters} className="input"
 *                min="0.1" step="0.1" />
 */
export function NumberInput({ value, onChange, fallback = 0, ...inputProps }) {
  const [str, setStr] = useState(value == null ? '' : String(value));

  // Resync from external value only when it diverges from the buffer.
  // The empty-string-with-fallback case is treated as "in sync" so clearing
  // the input doesn't fight with the fallback the parent stored.
  useEffect(() => {
    const parsed = str === '' ? null : parseFloat(str);
    const propNum = value == null ? null : Number(value);
    const inSync = parsed === propNum || (str === '' && propNum === fallback);
    if (!inSync) setStr(value == null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e) {
    const v = e.target.value;
    setStr(v);
    if (v === '') {
      onChange(fallback);
      return;
    }
    const n = parseFloat(v);
    if (!Number.isNaN(n)) onChange(n);
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      {...inputProps}
      value={str}
      onChange={handleChange}
    />
  );
}
