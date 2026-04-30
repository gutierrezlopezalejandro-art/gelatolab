import { useState } from 'react';
import { useT, useIngredientName } from '../lib/i18n';
import { useIngredientStore } from '../store/ingredientStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { isWebcamAvailable } from '../lib/barcode';
import { findIngredientByBarcode, buildAddBarcodePatch, getBarcodes } from '../lib/barcodeMap';
import { track } from '../lib/analytics';

/**
 * Vista "Bodega Movil": UI simplificada pensada para usar desde iPhone/Android
 * caminando por la bodega con la camara apuntando a los ingredientes. Tres
 * acciones grandes:
 *   - Ingreso (compra/llegada de mercaderia)
 *   - Conteo fisico
 *   - Buscar ingrediente (modo lectura libre)
 *
 * Los datos se sincronizan automaticamente al PC via Supabase si hay sesion.
 */
const MODES = {
  in:    { key: 'in',    icon: '📥', tKey: 'mobile_mode_in',    color: '#1a5c3a' },
  count: { key: 'count', icon: '🧮', tKey: 'mobile_mode_count', color: '#0d5c6e' },
  query: { key: 'query', icon: '🔍', tKey: 'mobile_mode_query', color: '#6a1b9a' },
};

export default function Mobile() {
  const t = useT();
  const tIng = useIngredientName();
  const ingredients = useIngredientStore(s => s.ingredients);
  const recordMovement = useInventoryStore(s => s.record);
  const { showToast } = useAppStore();
  const user = useAuthStore(s => s.user);
  const businessName = useBusinessStore(s => s.fantasy_name);

  const [mode, setMode] = useState(null); // null = home, 'in'|'count'|'query' = scanning
  const [scanning, setScanning] = useState(false);
  const [pending, setPending] = useState(null); // { ingredient, code }
  const [qty, setQty] = useState('');
  const [unmatchedCode, setUnmatchedCode] = useState('');
  const [assigning, setAssigning] = useState(false); // mostrando picker para asignar
  const [assignFilter, setAssignFilter] = useState('');
  const updateIngredient = useIngredientStore(s => s.update);

  function startMode(m) {
    setMode(m);
    setScanning(true);
    setPending(null);
    setUnmatchedCode('');
    setQty('');
    track('mobile_scan_started', { mode: m });
  }

  function handleDetected(code) {
    setScanning(false);
    const match = findIngredientByBarcode(ingredients, code);
    if (match) {
      setPending({ ingredient: match, code });
      setQty('');
    } else {
      setUnmatchedCode(code);
    }
  }

  function handleConfirm() {
    if (!pending) return;
    const value = parseFloat(qty);
    if (!Number.isFinite(value) || value < 0) {
      showToast(t('mobile_qty_invalid'), 'error');
      return;
    }
    if (mode === 'in') {
      recordMovement({ ingredient_id: pending.ingredient.id, type: 'in', qty_g: value, notes: 'mobile' });
      showToast(t('mobile_in_ok', { name: tIng(pending.ingredient.name), qty: value }));
    } else if (mode === 'count') {
      recordMovement({ ingredient_id: pending.ingredient.id, type: 'adjustment', qty_g: value, notes: 'mobile-count' });
      showToast(t('mobile_count_ok', { name: tIng(pending.ingredient.name), qty: value }));
    }
    setPending(null);
    setQty('');
    setScanning(true); // vuelve a abrir camara para siguiente codigo
  }

  function backToHome() {
    setMode(null);
    setScanning(false);
    setPending(null);
    setUnmatchedCode('');
    setAssigning(false);
    setAssignFilter('');
  }

  // Asigna el codigo escaneado a un ingrediente existente. Si el ingrediente
  // ya tenia otros codigos (otras marcas), el nuevo se AGREGA — no reemplaza.
  function assignCodeTo(ingredientId) {
    const ing = ingredients.find(i => i.id === ingredientId);
    const patch = buildAddBarcodePatch(ing, unmatchedCode);
    if (patch) updateIngredient(ingredientId, patch);
    track('mobile_barcode_assigned', { ingredient_id: ingredientId });
    showToast(t('mobile_assigned_ok', { name: tIng(ing?.name || '') }));
    setUnmatchedCode('');
    setAssigning(false);
    setAssignFilter('');
    if (mode === 'query') {
      setScanning(true);
    } else {
      setPending({ ingredient: ing, code: unmatchedCode });
      setQty('');
    }
  }

  // Vista home
  if (!mode) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
        <header className="bg-[var(--ink)] text-white px-4 py-4">
          <h1 className="font-display text-xl">{businessName || 'GelatoLab'}</h1>
          <p className="text-xs text-white/70 mt-0.5">📦 {t('mobile_warehouse_title')}</p>
        </header>

        <main className="flex-1 p-5 space-y-4">
          {!user && (
            <div className="rounded-xl bg-[#fff8e1] border-l-4 border-[#f5c842] p-3 text-xs text-[var(--ink2)]">
              ⚠ {t('mobile_no_session')}
            </div>
          )}

          <p className="text-sm text-[var(--ink2)] text-center mt-2 mb-4">
            {t('mobile_intro')}
          </p>

          {Object.values(MODES).map(m => (
            <button
              key={m.key}
              onClick={() => startMode(m.key)}
              disabled={!isWebcamAvailable()}
              className="w-full text-left rounded-2xl p-5 border-2 cursor-pointer transition-all
                         active:scale-95 hover:shadow-lg disabled:opacity-50"
              style={{ background: m.color + '15', borderColor: m.color }}
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{m.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-base" style={{ color: m.color }}>{t(m.tKey)}</div>
                  <div className="text-xs text-[var(--ink3)] mt-0.5">{t(m.tKey + '_sub')}</div>
                </div>
                <span className="text-2xl text-[var(--ink3)]">›</span>
              </div>
            </button>
          ))}

          {!isWebcamAvailable() && (
            <p className="text-xs text-[var(--coral)] text-center mt-4">
              ⚠ {t('mobile_no_camera')}
            </p>
          )}

          <p className="text-[10px] text-[var(--ink3)] text-center mt-6 leading-relaxed">
            {t('mobile_sync_note')}
          </p>
        </main>
      </div>
    );
  }

  // Vista de escaneo / confirmacion
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
      <header className="bg-[var(--ink)] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={backToHome} className="text-2xl bg-transparent border-none text-white cursor-pointer">←</button>
        <div className="flex-1">
          <div className="text-xs text-white/60 uppercase tracking-wider">{MODES[mode].icon} {t(MODES[mode].tKey)}</div>
        </div>
      </header>

      <main className="flex-1 p-5 space-y-4">
        {/* Codigo no matcheado: dos opciones, asignar o reintentar */}
        {unmatchedCode && !assigning && (
          <div className="rounded-xl bg-[#fff8e1] border-l-4 border-[#f5c842] p-4">
            <div className="font-semibold text-[var(--ink)] mb-1">⚠ {t('mobile_unknown_code')}</div>
            <div className="text-xs font-mono text-[var(--ink2)] mb-3">{unmatchedCode}</div>
            <p className="text-xs text-[var(--ink3)] mb-3">{t('mobile_unknown_hint_v2')}</p>
            <div className="flex gap-2 flex-col">
              <button onClick={() => setAssigning(true)} className="btn-primary w-full">
                🔗 {t('mobile_assign_btn')}
              </button>
              <button onClick={() => { setUnmatchedCode(''); setScanning(true); }}
                      className="btn-secondary w-full">
                📷 {t('mobile_scan_again')}
              </button>
            </div>
          </div>
        )}

        {/* Picker de ingrediente para asignar el codigo escaneado */}
        {unmatchedCode && assigning && (
          <div className="rounded-2xl bg-white border border-black/10 shadow-md p-4">
            <div className="text-xs text-[var(--ink3)] uppercase tracking-wider mb-1">{t('mobile_assign_picker_title')}</div>
            <div className="text-xs font-mono text-[var(--ink2)] mb-3">{unmatchedCode}</div>
            <input
              type="text"
              autoFocus
              className="input w-full text-sm mb-3"
              placeholder={t('mobile_assign_search')}
              value={assignFilter}
              onChange={e => setAssignFilter(e.target.value)}
            />
            <div className="max-h-[50vh] overflow-y-auto -mx-4 border-t border-black/5">
              {ingredients
                .filter(i => !assignFilter || tIng(i.name).toLowerCase().includes(assignFilter.toLowerCase()))
                .sort((a, b) => tIng(a.name).localeCompare(tIng(b.name)))
                .slice(0, 50)
                .map(i => {
                  const codes = getBarcodes(i);
                  return (
                    <button key={i.id}
                            onClick={() => assignCodeTo(i.id)}
                            className="w-full text-left px-4 py-3 border-b border-black/5 hover:bg-[var(--cream2)] cursor-pointer bg-white border-l-0 border-r-0 border-t-0">
                      <div className="text-sm font-medium text-[var(--ink)] flex items-center gap-2">
                        <span className="flex-1">{tIng(i.name)}</span>
                        {codes.length > 0 && (
                          <span className="text-[10px] font-bold text-[var(--mint)] bg-[var(--mint3)] px-1.5 py-0.5 rounded-full">
                            {codes.length} {codes.length === 1 ? t('mobile_assign_codes_one') : t('mobile_assign_codes_many')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--ink3)]">{i.category} · stock {i.stock_g || 0}g</div>
                    </button>
                  );
                })
              }
            </div>
            <button onClick={() => setAssigning(false)}
                    className="btn-secondary w-full mt-3 text-sm">
              {t('cancel')}
            </button>
          </div>
        )}

        {/* Confirmacion de cantidad */}
        {pending && (
          <div className="rounded-2xl bg-white border border-black/10 shadow-md p-5">
            <div className="text-xs text-[var(--ink3)] uppercase tracking-wider mb-1">{t('mobile_detected')}</div>
            <div className="font-display text-xl text-[var(--ink)] mb-1">{tIng(pending.ingredient.name)}</div>
            <div className="text-xs text-[var(--ink3)] mb-4">
              {t('mobile_current_stock')}: <strong>{pending.ingredient.stock_g || 0} g</strong>
            </div>

            <label className="text-xs font-semibold text-[var(--ink2)] block mb-2">
              {mode === 'in' ? t('mobile_in_qty_label') : t('mobile_count_qty_label')}
            </label>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="number" inputMode="decimal" min="0" step="1"
                autoFocus
                className="input flex-1 text-2xl text-center font-bold"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="0"
              />
              <span className="text-base font-semibold text-[var(--ink2)]">g</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setPending(null); setQty(''); setScanning(true); }}
                      className="btn-secondary flex-1">
                {t('cancel')}
              </button>
              <button onClick={handleConfirm}
                      className="btn-primary flex-1"
                      disabled={!qty}>
                ✓ {t('mobile_confirm')}
              </button>
            </div>
          </div>
        )}

        {/* Indicador de espera */}
        {!pending && !unmatchedCode && !scanning && (
          <button onClick={() => setScanning(true)}
                  className="btn-primary w-full text-lg py-4">
            📷 {t('mobile_scan_btn')}
          </button>
        )}
      </main>

      {/* Modal del escaner */}
      {scanning && (
        <BarcodeScannerModal
          onDetected={handleDetected}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
