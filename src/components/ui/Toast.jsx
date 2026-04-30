import { useState, useEffect } from 'react';

export default function Toast({ toast }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 2700);
    return () => clearTimeout(t);
  }, [toast.id]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[999] px-5 py-3 rounded-xl shadow-xl text-sm font-medium
        ${leaving ? 'toast-leave' : 'toast-enter'}`}
      style={{
        background: toast.type === 'error' ? 'var(--coral)' : 'var(--ink)',
        color: '#fff',
      }}
    >
      {toast.message}
    </div>
  );
}
