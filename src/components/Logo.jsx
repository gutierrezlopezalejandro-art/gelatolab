/**
 * GelatoLab Logo — concept: ice cream scoop inside a laboratory flask
 * Combines the ice cream theme with a scientific/lab feel
 */
export function Logo({ size = 32, showText = false, variant = 'dark' }) {
  // variant: 'dark' (for dark backgrounds) | 'light' (for light backgrounds)
  const scoop = variant === 'dark' ? '#f5e6c8' : '#b8860b';
  const flask = variant === 'dark' ? '#c8e8d4' : '#1a5c3a';
  const stroke = variant === 'dark' ? '#f5e6c8' : '#0f1a12';
  const accent = '#b8860b';

  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label="GelatoLab logo">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Flask body (trapezoid) */}
        <path
          d="M 18 20 L 18 10 L 30 10 L 30 20 L 38 38 Q 38 42 34 42 L 14 42 Q 10 42 10 38 Z"
          fill={flask}
          fillOpacity="0.25"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Flask top rim */}
        <line x1="16" y1="10" x2="32" y2="10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        {/* Liquid inside flask */}
        <path
          d="M 14 32 Q 17 30 20 32 Q 23 34 26 32 Q 29 30 32 32 Q 35 34 36 32 L 38 38 Q 38 42 34 42 L 14 42 Q 10 42 10 38 Z"
          fill={flask}
          fillOpacity="0.6"
        />
        {/* Ice cream scoop on top of flask */}
        <circle cx="24" cy="10" r="7" fill={scoop} stroke={stroke} strokeWidth="1.5" />
        {/* Scoop highlight */}
        <circle cx="22" cy="8" r="2.5" fill="white" fillOpacity="0.4" />
        {/* Cherry on top */}
        <circle cx="24" cy="3.5" r="2" fill={accent} />
        <path d="M 24 2 Q 25 0 27 1" stroke="#2d7a52" strokeWidth="1" fill="none" strokeLinecap="round" />
      </svg>
      {showText && (
        <span className="font-display text-sm leading-tight">
          Gelato<em className="text-[var(--gold)] not-italic">Lab</em>
        </span>
      )}
    </span>
  );
}
