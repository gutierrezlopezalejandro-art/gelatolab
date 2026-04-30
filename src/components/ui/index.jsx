export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div style={{
        width: 32, height: 32,
        border: '3px solid var(--cream3)',
        borderTopColor: 'var(--mint)',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
      }} />
    </div>
  );
}

export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="text-center py-16" role="status">
      <div className="mb-3 opacity-40 flex justify-center">
        {icon || (
          <svg width="56" height="56" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M 18 20 L 18 10 L 30 10 L 30 20 L 38 38 Q 38 42 34 42 L 14 42 Q 10 42 10 38 Z"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="24" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        )}
      </div>
      <h3 className="font-display text-lg text-[var(--ink2)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--ink3)] mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] font-semibold text-[var(--ink3)] uppercase tracking-widest mb-1">{label}</div>
      <div className="text-3xl font-bold text-[var(--ink)] tabular-nums">{value}</div>
      {sub && <div className="text-xs text-[var(--ink3)] mt-1">{sub}</div>}
    </div>
  );
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`card p-4 space-y-3 ${className}`} role="status" aria-label="Cargando...">
      <div className="skeleton h-3 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4 w-full" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card p-4" role="status" aria-label="Cargando tabla...">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div key={i} className="skeleton h-5" />
        ))}
      </div>
    </div>
  );
}
