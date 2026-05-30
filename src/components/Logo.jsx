export function Logo({ size = 32, showText = false, variant = 'dark' }) {
  const src = variant === 'dark'
    ? '/icons/logo-dark.png'
    : '/icons/logo-light.png';

  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label="GelatoLab logo">
      <img
        src={src}
        alt="GelatoLab"
        width={size}
        height={size}
        style={{ borderRadius: size * 0.2, objectFit: 'cover' }}
        aria-hidden="true"
      />
      {showText && (
        <span className="font-display text-sm leading-tight">
          Gelato<em className="text-[var(--gold)] not-italic">Lab</em>
        </span>
      )}
    </span>
  );
}
