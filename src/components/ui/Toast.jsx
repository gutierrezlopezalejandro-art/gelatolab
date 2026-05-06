import { useState, useEffect } from 'react';

export default function Toast({ toast }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 2700);
    return () => clearTimeout(t);
  }, [toast.id]);

  // role + aria-live: usuarios con lector de pantalla necesitan oír los toasts.
  // Errores como `assertive` para interrumpir; éxito/info como `polite` para
  // anunciar cuando el lector termine lo que está leyendo. aria-atomic asegura
  // que se lea el mensaje completo en cada actualización.
  const isError = toast.type === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`fixed bottom-6 left-1/2 z-[999] px-5 py-3 rounded-xl shadow-xl text-sm font-medium
        ${leaving ? 'toast-leave' : 'toast-enter'}`}
      style={{
        background: isError ? 'var(--coral)' : 'var(--ink)',
        color: '#fff',
      }}
    >
      {toast.message}
    </div>
  );
}
