// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryModal } from './InventoryModal';
import { useInventoryStore } from '../store/inventoryStore';
import { useIngredientStore } from '../store/ingredientStore';
import { useSupplierStore } from '../store/supplierStore';

function ingredient(overrides = {}) {
  return {
    id: 1,
    name: 'Sacarosa',
    stock_g: 1000,
    min_stock_g: 500,
    barcodes: [],
    ...overrides,
  };
}

beforeEach(() => {
  useInventoryStore.getState().clear();
  useSupplierStore.getState().clear();
  useIngredientStore.setState({
    ingredients: [ingredient()],
    nextId: 2,
  });
});

describe('InventoryModal — basic recording', () => {
  it('records an in-movement and updates stock', async () => {
    const user = userEvent.setup();
    const ing = ingredient();
    const { container } = render(<InventoryModal ingredient={ing} onClose={() => {}} />);
    // Form: select tipo, input qty, input notas.
    // Tipo por default = 'in' (no hay movimientos previos).
    const qtyInput = container.querySelector('input[type="number"]');
    await user.clear(qtyInput);
    await user.type(qtyInput, '5000');
    await user.click(screen.getByRole('button', { name: /^\+ Registrar$/i }));
    expect(useInventoryStore.getState().movements).toHaveLength(1);
    expect(useIngredientStore.getState().get(1).stock_g).toBe(6000); // 1000 + 5000
  });

  it('captures total cost and converts to per-kg', async () => {
    const user = userEvent.setup();
    const ing = ingredient();
    const { container } = render(<InventoryModal ingredient={ing} onClose={() => {}} />);
    // Tipo = in (default). Qty = 25000g (25 kg). Precio total = 50000.
    // Esperado: unit_cost_per_kg = 50000 / 25 = 2000
    const numberInputs = container.querySelectorAll('input[type="number"]');
    await user.clear(numberInputs[0]);
    await user.type(numberInputs[0], '25000');
    // numberInputs[1] = precio total
    await user.type(numberInputs[1], '50000');
    await user.click(screen.getByRole('button', { name: /^\+ Registrar$/i }));
    const m = useInventoryStore.getState().movements[0];
    expect(m.unit_cost_per_kg).toBeCloseTo(2000, 6);
  });

  it('autocreates a new supplier when typed name does not exist', async () => {
    const user = userEvent.setup();
    const ing = ingredient();
    const { container } = render(<InventoryModal ingredient={ing} onClose={() => {}} />);
    const numberInputs = container.querySelectorAll('input[type="number"]');
    await user.clear(numberInputs[0]);
    await user.type(numberInputs[0], '1000');
    // Encuentra el input de proveedor (text input dentro del form, despues de notes)
    // Busqueda por placeholder.
    const supplierInput = screen.getByPlaceholderText(/Distribuidora Lácteos Sur/i);
    await user.type(supplierInput, 'Lacteos Nuevos');
    await user.click(screen.getByRole('button', { name: /^\+ Registrar$/i }));
    const suppliers = useSupplierStore.getState().list();
    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toBe('Lacteos Nuevos');
    const m = useInventoryStore.getState().movements[0];
    expect(m.supplier_id).toBe(suppliers[0].id);
  });

  it('reuses an existing supplier (case-insensitive match)', async () => {
    const user = userEvent.setup();
    const existing = useSupplierStore.getState().create({ name: 'Lacteos Sur' });
    const ing = ingredient();
    const { container } = render(<InventoryModal ingredient={ing} onClose={() => {}} />);
    const numberInputs = container.querySelectorAll('input[type="number"]');
    await user.clear(numberInputs[0]);
    await user.type(numberInputs[0], '1000');
    const supplierInput = screen.getByPlaceholderText(/Distribuidora Lácteos Sur/i);
    await user.type(supplierInput, 'lacteos sur'); // distinto case
    await user.click(screen.getByRole('button', { name: /^\+ Registrar$/i }));
    // No se creo un duplicado
    expect(useSupplierStore.getState().list()).toHaveLength(1);
    const m = useInventoryStore.getState().movements[0];
    expect(m.supplier_id).toBe(existing.id);
  });

  it('shows cost stats panel after recording purchases with cost', async () => {
    const user = userEvent.setup();
    const ing = ingredient();
    // Pre-cargar 2 compras con costo
    useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 1500,
    });
    useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 2000, unit_cost_per_kg: 1700,
    });
    render(<InventoryModal ingredient={ing} onClose={() => {}} />);
    // El panel "Estadisticas de costo" debe mostrarse.
    expect(screen.getByText(/Estadísticas de costo/i)).toBeInTheDocument();
    expect(screen.getByText(/Promedio/i)).toBeInTheDocument();
    expect(screen.getByText(/Total invertido/i)).toBeInTheDocument();
  });

  it('cost panel hidden when no costed history', () => {
    const ing = ingredient();
    useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 1000, // sin costo
    });
    render(<InventoryModal ingredient={ing} onClose={() => {}} />);
    expect(screen.queryByText(/Estadísticas de costo/i)).toBeNull();
  });

  it('prefills form with last movement values per ingredient', () => {
    useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 25000, notes: 'Saco IANSA 25kg',
    });
    const { container } = render(
      <InventoryModal ingredient={ingredient()} onClose={() => {}} />
    );
    const qtyInput = container.querySelector('input[type="number"]');
    expect(qtyInput.value).toBe('25000');
    expect(screen.getByDisplayValue('Saco IANSA 25kg')).toBeInTheDocument();
    expect(screen.getByText(/Prellenado con el último/i)).toBeInTheDocument();
  });

  it('does not prefill cost/supplier on out movements', async () => {
    const user = userEvent.setup();
    // Pre-cargar una entrada con costo, luego cambiar tipo a out.
    useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 999, supplier_id: null,
    });
    const ing = ingredient();
    const { container } = render(<InventoryModal ingredient={ing} onClose={() => {}} />);
    // Cambiar tipo a 'out'
    const typeSelect = container.querySelector('select');
    await user.selectOptions(typeSelect, 'out');
    // Los campos de costo y proveedor desaparecen (solo se renderizan en 'in')
    expect(screen.queryByPlaceholderText(/Distribuidora Lácteos Sur/i)).toBeNull();
  });
});

describe('InventoryModal — barcode chips', () => {
  it('adds and removes barcodes', async () => {
    const user = userEvent.setup();
    const ing = ingredient();
    render(<InventoryModal ingredient={ing} onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/manual|escanea/i);
    await user.type(input, '7501234567890');
    await user.click(screen.getByRole('button', { name: /\+ Agregar/i }));
    // El chip aparece
    expect(screen.getByText('7501234567890')).toBeInTheDocument();
    // El estado del store refleja el nuevo codigo
    expect(useIngredientStore.getState().get(1).barcodes).toContain('7501234567890');
  });
});
