import { useState } from 'react';
import { COUNTRIES, getCountry } from '../lib/countryRegulations';
import { useCountryStore } from '../store/countryStore';
import { useT } from '../lib/i18n';

// flagcdn.com solo sirve ciertos anchos: 20, 40, 80, 160, 320, 640, 1280,
// 2560. Si pides otro ancho responde 404 y la imagen sale rota. Redondeamos
// al mas chico que cubra el tamano solicitado.
const FLAGCDN_WIDTHS = [20, 40, 80, 160, 320, 640, 1280, 2560];
function nearestFlagWidth(w) {
  return FLAGCDN_WIDTHS.find(v => v >= w) || FLAGCDN_WIDTHS[FLAGCDN_WIDTHS.length - 1];
}

export function Flag({ code, size = 20, alt = '' }) {
  const lc = code.toLowerCase();
  const w1x = nearestFlagWidth(size);
  const w2x = nearestFlagWidth(size * 2);
  return (
    <img
      src={`https://flagcdn.com/w${w1x}/${lc}.png`}
      srcSet={`https://flagcdn.com/w${w2x}/${lc}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={alt}
      className="inline-block rounded-sm align-middle"
      style={{ objectFit: 'cover', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.15)' }}
      loading="lazy"
    />
  );
}

/**
 * Compact dropdown to pick the country whose front-of-package labeling
 * regulations should drive the seals / nutrition table. Sits next to the
 * language selector in the top nav.
 */
export function CountrySelector() {
  const t = useT();
  const country = useCountryStore(s => s.country);
  const setCountry = useCountryStore(s => s.setCountry);
  const [open, setOpen] = useState(false);
  const current = getCountry(country);

  return (
    <div className="relative">
      <button
        data-tour="country-selector"
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('country_label')}: ${current.name}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold
                   bg-white/10 hover:bg-white/20 text-white/80 hover:text-white
                   transition-colors cursor-pointer border-none"
        title={t('country_label')}
      >
        <Flag code={current.code} size={20} alt="" />
        <span>{current.code}</span>
        <span className="text-[10px] opacity-50" aria-hidden="true">▼</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[98]" onClick={() => setOpen(false)} />
          <ul role="listbox"
              className="absolute right-0 top-full mt-1 z-[99] bg-white rounded-lg shadow-xl
                         border border-black/10 overflow-hidden min-w-[200px]">
            {COUNTRIES.map(c => (
              <li key={c.code}>
                <button
                  role="option"
                  aria-selected={c.code === country}
                  onClick={() => { setCountry(c.code); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2
                             hover:bg-[var(--cream)] transition-colors cursor-pointer border-none
                             ${c.code === country ? 'bg-[var(--mint3)] text-[var(--mint)]' : 'bg-white text-[var(--ink)]'}`}
                >
                  <Flag code={c.code} size={20} alt={c.name} />
                  <span className="font-bold w-7">{c.code}</span>
                  <span className="flex-1">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
