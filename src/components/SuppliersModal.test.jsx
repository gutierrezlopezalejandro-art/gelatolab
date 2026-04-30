// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuppliersModal } from './SuppliersModal';
import { useSupplierStore } from '../store/supplierStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useIngredientStore } from '../store/ingredientStore';

function setup() {
  useSupplierStore.getState().clear();
  useInventoryStore.getState().clear();
}

describe('SuppliersModal', () => {
  beforeEach(setup);

  it('shows empty state when no suppliers', () => {
    render(<SuppliersModal onClose={() => {}} />);
    expect(screen.getByText(/Aún no hay proveedores/i)).toBeInTheDocument();
  });

  it('lists existing suppliers sorted alphabetically', () => {
    useSupplierStore.getState().create({ name: 'Carlos' });
    useSupplierStore.getState().create({ name: 'Ana' });
    useSupplierStore.getState().create({ name: 'Beatriz' });
    render(<SuppliersModal onClose={() => {}} />);
    const rows = screen.getAllByRole('row').slice(1); // skip header
    const names = rows.map(r => within(r).getAllByRole('cell')[0].textContent);
    expect(names).toEqual(['Ana', 'Beatriz', 'Carlos']);
  });

  it('creates a new supplier from the form', async () => {
    const user = userEvent.setup();
    const { container } = render(<SuppliersModal onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /nuevo/i }));
    // Primer text input dentro del form es Nombre.
    const form = container.querySelector('form');
    const nameInput = form.querySelector('input[type="text"]');
    await user.type(nameInput, 'Distribuidora Sur');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    const list = useSupplierStore.getState().list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Distribuidora Sur');
  });

  it('does not create when name is blank (rejected by required)', async () => {
    const user = userEvent.setup();
    render(<SuppliersModal onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /nuevo/i }));
    // Input vacio: el HTML5 required bloquea el submit
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    expect(useSupplierStore.getState().list()).toHaveLength(0);
  });

  it('edits an existing supplier', async () => {
    const user = userEvent.setup();
    const created = useSupplierStore.getState().create({
      name: 'Original', phone: '111',
    });
    render(<SuppliersModal onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    // El input del telefono ya esta prellenado con '111'.
    const phoneInput = screen.getByDisplayValue('111');
    await user.clear(phoneInput);
    await user.type(phoneInput, '222');
    await user.click(screen.getByRole('button', { name: /^guardar$/i }));
    expect(useSupplierStore.getState().get(created.id).phone).toBe('222');
  });

  it('shows usage count for each supplier', () => {
    const supplier = useSupplierStore.getState().create({ name: 'Lacteos Sur' });
    useIngredientStore.setState({
      ingredients: [{ id: 1, name: 'Leche', stock_g: 0 }],
      nextId: 2,
    });
    useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 1000, unit_cost_per_kg: 1000, supplier_id: supplier.id,
    });
    useInventoryStore.getState().record({
      ingredient_id: 1, type: 'in', qty_g: 500, unit_cost_per_kg: 1100, supplier_id: supplier.id,
    });
    render(<SuppliersModal onClose={() => {}} />);
    const row = screen.getByRole('row', { name: /lacteos sur/i });
    expect(within(row).getByText('2')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    let closed = false;
    render(<SuppliersModal onClose={() => { closed = true; }} />);
    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(closed).toBe(true);
  });
});
