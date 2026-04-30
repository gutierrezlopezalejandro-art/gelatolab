import { useT } from '../lib/i18n';
import { useBusinessStore } from '../store/businessStore';
import { rateBatchVolume } from '../data/machines';

/**
 * Aviso compacto si el volumen del batch (en litros) queda fuera del rango
 * de la mantecadora seleccionada. No bloquea — solo informa.
 */
export function MachineVolumeWarning({ liters }) {
  const t = useT();
  const machineId = useBusinessStore(s => s.machine_id);
  if (!machineId || !liters) return null;

  const r = rateBatchVolume(liters, machineId);
  if (!r) return null;
  const { state, diff, machine } = r;

  if (state === 'ok' || state === 'optimal') {
    return (
      <div className="text-[11px] text-[var(--mint)] flex items-center gap-1.5 py-1">
        <span>✓</span>
        <span>{t('machine_in_range', { name: machine.name })}</span>
        {state === 'optimal' && <span className="text-[10px] text-[var(--ink3)]">({t('machine_optimal')})</span>}
      </div>
    );
  }

  const isOver = state === 'over';
  return (
    <div
      className="text-xs rounded-lg p-2.5 flex items-start gap-2 border"
      style={{
        background: isOver ? '#fdecea' : '#fff8e1',
        borderColor: isOver ? '#f5b7b1' : '#ffe082',
        color: isOver ? '#c0392b' : '#8a6d00',
      }}
    >
      <span className="text-base leading-none">⚠</span>
      <div className="flex-1">
        <strong>
          {isOver
            ? t('machine_warning_over', { name: machine.name, max: machine.max })
            : t('machine_warning_under', { name: machine.name, min: machine.min })}
        </strong>
        <div className="text-[11px] opacity-90 mt-0.5">
          {t('machine_warning_diff', { diff: diff.toFixed(2) })}
          {' · '}
          {t('machine_optimal_is', { optimal: machine.optimal })}
        </div>
      </div>
    </div>
  );
}
