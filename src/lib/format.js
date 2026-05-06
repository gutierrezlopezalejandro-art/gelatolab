// Formatters centralizados de número, moneda y fecha. Antes había 17+
// llamadas a `toLocaleString('es-CL')` con locale hardcoded distribuidas
// por el código + literales `$` que asumían CLP. Para usuarios en Brasil,
// EU o EEUU eso renderizaba mal (R$3.000 mostrado como $3.000 con
// separadores chilenos).
//
// Estas funciones aceptan locale y country explícitos; el hook useFormatters
// los lee automáticamente del store de i18n y país.

import { useI18nStore } from './i18n';
import { useCountryStore } from '../store/countryStore';

// Mapeo país → código ISO 4217 de su moneda. Caemos al USD para países
// que no listamos (US ya es USD por defecto, el resto es razonable).
const CURRENCY_BY_COUNTRY = {
  CL: 'CLP', PE: 'PEN', MX: 'MXN', AR: 'ARS', UY: 'UYU',
  CO: 'COP', BR: 'BRL', CA: 'CAD', US: 'USD', EC: 'USD',
  VE: 'VES', PY: 'PYG', BO: 'BOB', CR: 'CRC', PA: 'PAB',
  DO: 'DOP', SV: 'USD', GT: 'GTQ', HN: 'HNL', NI: 'NIO',
  CU: 'CUP', PR: 'USD',
};

export function getCurrencyForCountry(code) {
  return CURRENCY_BY_COUNTRY[code] || 'USD';
}

// Mapeo locale corto → BCP-47 que Intl entiende. El i18n store usa
// códigos de 2 letras (es, en, pt, ...), pero Intl.NumberFormat necesita
// regiones para que los separadores y decimales sean correctos.
const LOCALE_MAP = {
  es: 'es-CL', en: 'en-US', pt: 'pt-BR', de: 'de-DE',
  fr: 'fr-FR', it: 'it-IT', ja: 'ja-JP', ko: 'ko-KR',
};

export function getLocale(lang) {
  return LOCALE_MAP[lang] || 'es-CL';
}

// Moneda con decimales configurables. CLP no tiene centavos por convención.
export function formatCurrency(value, { locale = 'es-CL', currency = 'CLP', maximumFractionDigits } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  // Por defecto: 0 decimales para CLP/COP/PYG/UYU (monedas de alto valor
  // sin centavos en uso diario), 2 para el resto.
  const noCentsCurrencies = ['CLP', 'COP', 'PYG', 'UYU', 'JPY', 'KRW', 'VES'];
  const fractionDigits = maximumFractionDigits ?? (noCentsCurrencies.includes(currency) ? 0 : 2);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency,
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString(locale)}`;
  }
}

export function formatNumber(value, { locale = 'es-CL', maximumFractionDigits = 2, minimumFractionDigits } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  try {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits,
      ...(minimumFractionDigits != null ? { minimumFractionDigits } : {}),
    }).format(n);
  } catch {
    return n.toLocaleString(locale);
  }
}

// Fechas: 'short' (06-05-2026 en es-CL), 'long' (6 de mayo de 2026),
// 'full' (martes, 6 de mayo de 2026).
export function formatDate(value, { locale = 'es-CL', dateStyle = 'short' } = {}) {
  const d = value instanceof Date ? value : (typeof value === 'string' ? new Date(value.length === 10 ? value + 'T00:00:00' : value) : new Date(value));
  if (!d || isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Hook que devuelve formatters pre-configurados con el locale del usuario
 * y la moneda de su país. Uso típico:
 *
 *   const { fmtCurrency, fmtNumber, fmtDate } = useFormatters();
 *   <span>{fmtCurrency(stats.cost)}</span>
 */
export function useFormatters() {
  const lang = useI18nStore(s => s.lang);
  const country = useCountryStore(s => s.country);
  const locale = getLocale(lang);
  const currency = getCurrencyForCountry(country);
  return {
    locale,
    currency,
    fmtCurrency: (value, opts) => formatCurrency(value, { locale, currency, ...opts }),
    fmtNumber: (value, opts) => formatNumber(value, { locale, ...opts }),
    fmtDate: (value, opts) => formatDate(value, { locale, ...opts }),
  };
}
