import { useT } from '../lib/i18n';
import { useBusinessStore } from '../store/businessStore';
import { rateBatchVolumeMulti, ratePasteurizerVolumeMulti } from '../data/machines';

/**
 * Compact warning if the batch volume (in liters) is outside the optimal
 * range of all configured equipment of the requested kind. Non-blocking.
 *
 * `rate` selects which equipment is checked: 'batch' (default) or 'pasteurizer'.
 *
 * `machineId` (optional) restricts the validation to a single machine — used
 * by ProductionPlan when the operator has explicitly assigned a machine to
 * a specific batch. If omitted, the warning evaluates against the full list
 * of configured machines (any-fit logic).
 */
function VolumeWarning({ liters, rate, machineId }) {
  const t = useT();
  const storeIds = useBusinessStore(s =>
    rate === 'pasteurizer' ? s.pasteurizer_ids : s.machine_ids
  );
  const ids = machineId ? [machineId] : storeIds;
  if (!Array.isArray(ids) || ids.length === 0 || !liters) return null;

  const r = rate === 'pasteurizer'
    ? ratePasteurizerVolumeMulti(liters, ids)
    : rateBatchVolumeMulti(liters, ids);
  if (!r) return null;
  const { state, diff, machine, alternatives = [] } = r;

  // Build alternatives string (other machines that also fit, when applicable)
  const altFitting = alternatives.filter(a => a.state === 'optimal' || a.state === 'ok');
  const altText = altFitting.length > 0
    ? ' · ' + t('machine_alt_fits', { names: altFitting.map(a => a.machine.name).join(', ') })
    : '';

  if (state === 'ok' || state === 'optimal') {
    return (
      <div className="text-[11px] text-[var(--mint)] flex items-center gap-1.5 py-1">
        <span>✓</span>
        <span>{t('machine_in_range', { name: machine.name })}</span>
        {state === 'optimal' && <span className="text-[10px] text-[var(--ink3)]">({t('machine_optimal')})</span>}
        {altText && <span className="text-[10px] text-[var(--ink3)]">{altText}</span>}
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

export function MachineVolumeWarning({ liters, machineId }) {
  return <VolumeWarning liters={liters} rate="batch" machineId={machineId} />;
}

export function PasteurizerVolumeWarning({ liters, machineId }) {
  return <VolumeWarning liters={liters} rate="pasteurizer" machineId={machineId} />;
}
