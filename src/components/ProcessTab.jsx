// ProcessTab.jsx — Pasos de proceso adaptativos segun tipo y composicion

import { useT } from '../lib/i18n';
import { useBusinessStore } from '../store/businessStore';
import { getEquipmentRecommendations } from '../data/machines';

const BADGE_COLORS = {
  temp:  { bg:'#fff3e0', border:'#ffcc80', color:'#e65100' },
  time:  { bg:'#e3f2fd', border:'#90caf9', color:'#0d3d5c' },
  warn:  { bg:'#fdecea', border:'#ef9a9a', color:'#c0392b' },
  ok:    { bg:'#e8f5e9', border:'#a5d6a7', color:'#0d3d22' },
};

function Badge({ text, type = 'ok' }) {
  const s = BADGE_COLORS[type] || BADGE_COLORS.ok;
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold mr-1 mt-1"
          style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {text}
    </span>
  );
}

function Step({ num, title, desc, badges = [] }) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-6 h-6 rounded-full bg-[var(--mint)] text-white text-[11px] font-bold
                      flex items-center justify-center flex-shrink-0 mt-0.5">
        {num}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-[var(--ink)] mb-0.5">{title}</div>
        <div className="text-xs text-[var(--ink2)] leading-relaxed">{desc}</div>
        {badges.length > 0 && (
          <div className="mt-1">
            {badges.map(([txt, cls], i) => <Badge key={i} text={txt} type={cls} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Note({ text }) {
  return (
    <div className="bg-[var(--gold2)] border border-[#d4b84a] rounded-lg px-3 py-2
                    text-xs text-[#4a3200] mb-3 leading-relaxed">
      {text}
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="card p-5 mb-4">
      <div className="font-display text-base text-[var(--ink)] mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  );
}

function EquipmentRecsCard({ recipeType, t }) {
  const machineIds     = useBusinessStore(s => s.machine_ids || []);
  const pasteurizerIds = useBusinessStore(s => s.pasteurizer_ids || []);

  // Resolve per-machine recommendations.
  const machineRecsList = machineIds
    .map(id => getEquipmentRecommendations(id, recipeType))
    .filter(Boolean);
  const pastRecsList = pasteurizerIds
    .map(id => getEquipmentRecommendations(id, recipeType))
    .filter(r => r && !machineIds.includes(r.machine.id));

  if (machineRecsList.length === 0 && pastRecsList.length === 0) return null;

  // If a separate pasteurizer is configured, suppress pasteurize/cool/aging
  // from any combo in the batch-freezer list to avoid duplicate rows.
  const hasSeparatePasteurizer = pastRecsList.length > 0;

  return (
    <div className="card p-5">
      <div className="font-display text-base text-[var(--ink)] mb-3 flex items-center gap-2">
        <span>🛠</span> {t('equip_recs_title')}
      </div>
      {pastRecsList.map(r => (
        <RecGroup key={r.machine.id} name={r.machine.name} stages={r.stages} t={t} />
      ))}
      {machineRecsList.map(r => {
        const stages = { ...r.stages };
        if (hasSeparatePasteurizer) {
          delete stages.pasteurize;
          delete stages.cool;
          delete stages.aging;
        }
        if (Object.keys(stages).length === 0) return null;
        return <RecGroup key={r.machine.id} name={r.machine.name} stages={stages} t={t} />;
      })}
      <div className="border-t border-black/10 mt-3 pt-2 text-[10px] text-[var(--ink3)] leading-relaxed">
        {t('equip_recs_footer')}
      </div>
    </div>
  );
}

function RecGroup({ name, stages, t }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs font-semibold text-[var(--ink2)] mb-1.5">{name}</div>
      <div className="space-y-1.5 text-[11px]">
        {Object.entries(stages).map(([k, v]) => (
          <RecRow key={k} stage={k} val={v} t={t} />
        ))}
      </div>
    </div>
  );
}

function RecRow({ stage, val, t }) {
  const label = {
    pasteurize: t('equip_stage_pasteurize'),
    cool:       t('equip_stage_cool'),
    aging:      t('equip_stage_aging'),
    churn:      t('equip_stage_churn'),
    harden:     t('equip_stage_harden'),
  }[stage];

  let detail = '';
  if (stage === 'pasteurize') {
    detail = `${val.setpoint} °C · ${val.hold} (${val.mode})`;
  } else if (stage === 'churn') {
    detail = `${val.extract_temp} °C · ${val.time} · overrun ${val.overrun}`;
  } else {
    detail = [val.setpoint != null ? `${val.setpoint} °C` : '', val.time].filter(Boolean).join(' · ');
  }
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[var(--ink2)]">{label}</span>
      <span className="text-[var(--ink)] font-medium text-right">{detail}</span>
    </div>
  );
}

function TempTable({ rows, t }) {
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr>
            <th className="text-left py-1.5 px-2 border-b border-black/10 text-[var(--ink3)] font-semibold whitespace-nowrap">{t('proc_stage')}</th>
            <th className="text-right py-1.5 px-2 border-b border-black/10 text-[var(--ink3)] font-semibold whitespace-nowrap">{t('proc_target_t')}</th>
            <th className="text-right py-1.5 px-2 border-b border-black/10 text-[var(--ink3)] font-semibold whitespace-nowrap">{t('proc_time')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([etapa, temp, tiempo], i) => (
            <tr key={i}>
              <td className="py-1.5 px-2 border-b border-black/5 text-[var(--ink)]">{etapa}</td>
              <td className="py-1.5 px-2 border-b border-black/5 text-right font-semibold text-[var(--coral)] whitespace-nowrap">{temp}</td>
              <td className="py-1.5 px-2 border-b border-black/5 text-right text-[var(--ink2)] whitespace-nowrap">{tiempo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProcessTab({ recipe, ingredients = [] }) {
  const t = useT();

  const type      = recipe?.type || 'helado';
  const isGelato  = type === 'gelato';
  const isSorbete = type === 'sorbete';

  const names = ingredients.map(ri => (ri.ingredient?.name || ri.name || '').toLowerCase());
  const hasEgg      = names.some(n => n.includes('yema') || n.includes('huevo'));
  const hasCream    = names.some(n => n.includes('crema'));
  const hasChoc     = names.some(n => n.includes('chocolate') || n.includes('cacao'));
  const hasFruit    = names.some(n => n.includes('pulpa'));
  const hasNeutro   = names.some(n => n.includes('neutro'));

  const pastT    = hasEgg ? '82-85 C' : '72-75 C';
  const pastTime = hasEgg ? `15-20 s (HTST) ${t('or_conj')} 30 min (LTLT)` : '15 s (HTST)';
  const tempSalida = isGelato ? `-6 ${t('diag_to')} -8 C` : isSorbete ? `-5 ${t('diag_to')} -7 C` : `-5 ${t('diag_to')} -6 C`;
  const overrun    = isGelato ? '20-35%' : isSorbete ? '0-10%' : '60-100%';
  const mantTime   = isGelato ? '8-12 min' : isSorbete ? '10-15 min' : '10-20 min';
  const hardenT    = isGelato ? `-11 ${t('diag_to')} -14 C` : `-18 ${t('diag_to')} -22 C`;
  const serveT     = isGelato ? `-11 ${t('diag_to')} -13 C` : isSorbete ? `-12 ${t('diag_to')} -14 C` : `-14 ${t('diag_to')} -16 C`;
  const vidaUtil   = isGelato ? `7-14 ${t('days_at')} -14 C` : `30-90 ${t('days_at')} -22 C`;

  const tempRows = [
    !isSorbete ? [t('proc_tr_past'), pastT, hasEgg ? '30 min (LTLT)' : '15 s (HTST)'] : null,
    isSorbete  ? [t('proc_tr_heat'), '60-65 C', '10 min'] : null,
    [t('proc_tr_cool'), '< 10 C', '< 30 min'],
    [t('proc_tr_aging'), '2-4 C', isSorbete ? '4-8 h' : '4-12 h'],
    [t('proc_tr_churn'), tempSalida, mantTime],
    [t('proc_tr_harden'), hardenT, '2-4 h'],
    [t('proc_tr_serve'), serveT, '--'],
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div>
        {/* PASTEURIZACION */}
        <Section icon="🌡️" title={t('proc_pasteurization')}>
          {isSorbete ? (
            <>
              <Step num={1} title={t('proc_s1_title')}
                desc={t('proc_s1_desc')}
                badges={[['20-25 C','temp'],['5-8 min','time']]} />
              <Step num={2} title={t('proc_s2_title')}
                desc={t('proc_s2_desc')}
                badges={[['60-65 C','temp'],['10 min','time']]} />
              <Step num={3} title={t('proc_s3_stab_title')}
                desc={t('proc_s3_stab_desc')}
                badges={[['85-90 C','temp'],['2 min','time']]} />
              <Note text={t('proc_s_acid_note')} />
            </>
          ) : (
            <>
              <Step num={1} title={t('proc_d1_title')}
                desc={t('proc_d1_desc')}
                badges={[['4-8 C','time'],[t('proc_d1_badge'),'ok']]} />
              <Step num={2} title={t('proc_d2_title')}
                desc={t('proc_d2_desc')}
                badges={[['10-15 C','temp'],['3-5 min','time']]} />
              <Step num={3} title={t('proc_d3_title')}
                desc={t('proc_d3_desc')}
                badges={[['40 C','temp'],[t('proc_d3_badge'),'ok']]} />
              {hasEgg && (
                <Step num={4} title={t('proc_egg_title')}
                  desc={t('proc_egg_desc')}
                  badges={[[t('proc_egg_warn1'),'warn'],[t('proc_egg_warn2'),'warn']]} />
              )}
              {hasChoc && (
                <Step num={hasEgg ? 5 : 4} title={t('proc_choc_title')}
                  desc={t('proc_choc_desc')}
                  badges={[['55-60 C','temp'],[t('proc_choc_badge'),'ok']]} />
              )}
              <Step num={hasEgg ? (hasChoc ? 6 : 5) : (hasChoc ? 5 : 4)} title={t('proc_past_title')}
                desc={t('proc_past_desc')}
                badges={[[pastT,'temp'],[pastTime,'time'],[t('proc_past_badge'),'ok']]} />
              <Note text={hasEgg ? t('proc_past_egg_note') : t('proc_past_noegg_note')} />
            </>
          )}
        </Section>

        {/* MEZCLA Y HOMOGENEIZACION */}
        <Section icon="🥄" title={t('proc_mixing')}>
          {isSorbete ? (
            <>
              <Step num={1} title={t('proc_homog_title')}
                desc={t('proc_homog_desc_sorbet')}
                badges={[[t('proc_homog_badge'),'ok'],['1-2 min','time']]} />
              <Step num={2} title={t('proc_juice_title')}
                desc={t('proc_juice_desc')}
                badges={[['< 40 C','temp']]} />
            </>
          ) : (
            <>
              <Step num={1} title={t('proc_homog_post_title')}
                desc={t('proc_homog_post_desc')}
                badges={[['68-72 C','temp'],['2-3 min','time'],[t('proc_homog_post_badge'),'ok']]} />
              {hasNeutro && (
                <Step num={2} title={t('proc_stab_check_title')}
                  desc={t('proc_stab_check_desc')}
                  badges={[[t('proc_stab_check_badge'),'ok']]} />
              )}
              {hasFruit && (
                <Step num={hasNeutro ? 3 : 2} title={t('proc_fruit_title')}
                  desc={t('proc_fruit_desc')}
                  badges={[['50-55 C','temp'],['30 s mixer','time']]} />
              )}
            </>
          )}
        </Section>

        {/* MADURACION */}
        <Section icon="❄️" title={t('proc_aging')}>
          <Step num={1} title={t('proc_cool_title')}
            desc={t('proc_cool_desc')}
            badges={[['< 10 C','temp'],['< 30 min','time']]} />
          <Step num={2} title={t('proc_rest_title')}
            desc={t('proc_rest_desc')}
            badges={[['2-4 C','temp'],[isSorbete ? '4-8 h' : '4-12 h min.','time'],[t('proc_rest_badge'),'ok']]} />
          <Note text={isGelato
            ? t('proc_aging_gelato_note')
            : isSorbete
            ? t('proc_aging_sorbet_note')
            : t('proc_aging_cream_note')} />
        </Section>

        {/* MANTECACION */}
        <Section icon="🔄" title={t('proc_churning')}>
          <Step num={1} title={t('proc_precool_title')}
            desc={t('proc_precool_desc')}
            badges={[['< -15 C cilindro','temp'],['10 min precool','time']]} />
          <Step num={2} title={t('proc_churn_title')}
            desc={t('proc_churn_desc')}
            badges={[[tempSalida,'temp'],[mantTime,'time'],[`Overrun ${overrun}`,'ok']]} />
          {!isSorbete && (
            <Step num={3} title={t('proc_dump_title')}
              desc={t('proc_dump_desc')}
              badges={[[t('proc_dump_badge1'),'ok'],[t('proc_dump_badge2'),'ok']]} />
          )}
          {hasChoc && !isSorbete && (
            <Note text={t('proc_choc_note')} />
          )}
        </Section>

        {/* ENDURECIMIENTO */}
        <Section icon="🧊" title={t('proc_hardening')}>
          <Step num={1} title={t('proc_pack_title')}
            desc={t('proc_pack_desc')}
            badges={[[t('proc_pack_badge1'),'ok'],[t('proc_pack_badge2'),'ok']]} />
          <Step num={2} title={t('proc_harden_title')}
            desc={t('proc_harden_desc')}
            badges={[[hardenT,'temp'],['2-4 h','time']]} />
          <Step num={3} title={t('proc_store_title')}
            desc={t('proc_store_desc')}
            badges={[[`${hardenT} (${t('stock_label')})`,'temp'],[`${serveT} (${t('service_label')})`,'temp']]} />
          <Note text={t('proc_shelf_life').replace('{life}', vidaUtil)} />
        </Section>
      </div>

      {/* Panel lateral */}
      <div className="sticky top-20 space-y-4">
        <EquipmentRecsCard recipeType={type} t={t} />

        <div className="card p-5">
          <div className="font-display text-base text-[var(--ink)] mb-4">{t('proc_summary')}</div>
          <div className="space-y-1 text-sm">
            {[
              [t('proc_type_label'), { helado: t('proc_type_helado'), gelato: t('proc_type_gelato'), sorbete: t('proc_type_sorbete') }[type] || type],
              [t('proc_with_egg'),    hasEgg     ? t('proc_yes') : t('proc_no')],
              [t('proc_with_cream'),   hasCream   ? t('proc_yes') : t('proc_no')],
              [t('proc_with_fruit'),   hasFruit   ? t('proc_yes') : t('proc_no')],
              [t('proc_with_choc'),    hasChoc    ? t('proc_yes') : t('proc_no')],
              [t('proc_with_stab'),    hasNeutro  ? t('proc_yes') : t('proc_no')],
            ].map(([lbl, val]) => (
              <div key={lbl} className="flex justify-between">
                <span className="text-[var(--ink2)]">{lbl}</span>
                <span className="font-semibold text-[var(--ink)]">{val}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-black/10 mt-3 pt-3 text-[10px] text-[var(--ink3)] leading-relaxed">
            {t('proc_auto_adapt')}
          </div>
        </div>

        <div className="card p-5">
          <div className="font-display text-base text-[var(--ink)] mb-3">{t('proc_temp_control')}</div>
          <TempTable rows={tempRows} t={t} />
        </div>
      </div>
    </div>
  );
}
