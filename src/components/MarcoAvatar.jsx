/**
 * Marco — el heladero italiano que personifica al asistente. Usa una imagen
 * WebP optimizada (~36 KB) en /public/marco-avatar.webp. Tres tamaños:
 *   sm = 40px (uso en chat bubbles, headers de guides)
 *   md = 64px (FAB y pantalla de bienvenida)
 *   lg = 96px (header del welcome destacado)
 *
 * Variante `talking` agrega una burbuja con 🍦 en la esquina superior derecha
 * para sugerir que esta hablando — solo decorativa.
 *
 * Variante `hero` usa marco-hero.webp (640px ancho, ~51 KB) para hero shots
 * donde queremos mostrar el contexto completo (heladeria, tablet, etc.).
 */

const SIZES = { sm: 40, md: 64, lg: 96 };

// Animaciones CSS-in-JS — no usamos Lottie ni libs externas. Son keyframes
// inyectadas al document una sola vez (al primer render del componente).
const ANIM_STYLE_ID = 'marco-anim-styles';
function ensureAnimStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ANIM_STYLE_ID)) return;
  const css = `
    @keyframes marco-bob {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50%      { transform: translateY(-2px) rotate(-1.5deg); }
    }
    @keyframes marco-bubble-pop {
      0%, 100% { transform: scale(1) rotate(0deg); }
      50%      { transform: scale(1.08) rotate(8deg); }
    }
    .marco-anim-bob { animation: marco-bob 3.5s ease-in-out infinite; }
    .marco-anim-bubble { animation: marco-bubble-pop 2.4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .marco-anim-bob, .marco-anim-bubble { animation: none; }
    }
  `;
  const style = document.createElement('style');
  style.id = ANIM_STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

export function MarcoAvatar({ size = 'md', talking = false, animated = false, className = '' }) {
  const sz = SIZES[size] || SIZES.md;
  if (animated) ensureAnimStyles();

  return (
    <div className={`relative inline-block ${className} ${animated ? 'marco-anim-bob' : ''}`}
         style={{ width: sz, height: sz }}>
      <img
        src="./marco-avatar.webp"
        alt="Marco, asistente de GelatoLab"
        width={sz}
        height={sz}
        className="rounded-full object-cover bg-white shadow-sm"
        style={{
          width: sz, height: sz,
          objectPosition: 'center 28%',
          border: '2px solid var(--cream)',
        }}
        loading="lazy"
      />
      {talking && (
        <div
          className={`absolute -top-1 -right-1 bg-white rounded-full shadow-md border border-black/10 flex items-center justify-center ${animated ? 'marco-anim-bubble' : ''}`}
          style={{ width: sz * 0.42, height: sz * 0.42, fontSize: sz * 0.26 }}
          aria-hidden="true"
        >
          🍦
        </div>
      )}
    </div>
  );
}

/**
 * Hero shot completo de Marco en la heladeria. Usa marco-hero.webp.
 * Aspect 640×349 aprox. Ideal para top de la pantalla de bienvenida.
 */
export function MarcoHero({ className = '' }) {
  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-[var(--cream)] ${className}`}>
      <img
        src="./marco-hero.webp"
        alt="Marco, maestro del gelato, en su heladeria con tablet de recetas"
        className="w-full h-auto block"
        loading="lazy"
      />
    </div>
  );
}
