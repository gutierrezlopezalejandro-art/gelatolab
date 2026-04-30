// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipeComparisonModal } from './RecipeComparisonModal';

// Fixture minimal: 3 ingredientes y 3 recetas con composicion bien diferenciada
// para que el highlighting tenga datos significativos.
const milk = {
  id: 1, name: 'Leche', water_pct: 87.5, fat_pct: 3.5, sng_pct: 9, sugar_pct: 0,
  pod: 0, pac: 0, calories: 62, protein: 3.3, satfat: 2.1, sodium_mg: 40,
  sugars: 4.6, lactose: 4.6, msnf: 8.5,
};
const cream = {
  id: 2, name: 'Crema', water_pct: 60, fat_pct: 35, sng_pct: 5.2, sugar_pct: 0,
  pod: 0, pac: 0, calories: 340, protein: 2, satfat: 22, sodium_mg: 30,
  sugars: 3, lactose: 3, msnf: 5.2,
};
const sugar = {
  id: 3, name: 'Sacarosa', water_pct: 0, fat_pct: 0, sng_pct: 0, sugar_pct: 100,
  pod: 1, pac: 1, calories: 400, sugars: 100, sodium_mg: 0,
};

const recipes = [
  // Receta A: helado tradicional 12% grasa
  {
    id: 10, name: 'Vainilla clasica', type: 'helado', subtype: 'base',
    ingredients: [
      { ingredient_id: 1, qty_grams: 600 },
      { ingredient_id: 2, qty_grams: 200 },
      { ingredient_id: 3, qty_grams: 200 },
    ],
  },
  // Receta B: helado bajo en azucar (mas leche, menos azucar)
  {
    id: 11, name: 'Vainilla low-sugar', type: 'helado', subtype: 'base',
    ingredients: [
      { ingredient_id: 1, qty_grams: 800 },
      { ingredient_id: 2, qty_grams: 100 },
      { ingredient_id: 3, qty_grams: 100 },
    ],
  },
];

const ingredients = [milk, cream, sugar];

describe('RecipeComparisonModal', () => {
  it('renders one column per recipe with name and type', () => {
    render(
      <RecipeComparisonModal
        recipes={recipes}
        ingredients={ingredients}
        allRecipes={recipes}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Vainilla clasica')).toBeInTheDocument();
    expect(screen.getByText('Vainilla low-sugar')).toBeInTheDocument();
    // Tipo "Helado" aparece en ambas cabeceras
    expect(screen.getAllByText(/Helado/i).length).toBeGreaterThanOrEqual(2);
  });

  it('renders the three sections (technical, composition, nutrition)', () => {
    render(
      <RecipeComparisonModal
        recipes={recipes}
        ingredients={ingredients}
        allRecipes={recipes}
        onClose={() => {}}
      />
    );
    // Match exact section headers (los regex sueltos colisionan con la leyenda).
    expect(screen.getByText(/^Técnicas$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Composición$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Nutrición \(por 100 g\)$/i)).toBeInTheDocument();
  });

  it('shows the recipes count in the subtitle', () => {
    render(
      <RecipeComparisonModal
        recipes={recipes}
        ingredients={ingredients}
        allRecipes={recipes}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/2 receta/i)).toBeInTheDocument();
  });

  it('highlights low-sugar recipe with mint background (best of "lower_better")', () => {
    render(
      <RecipeComparisonModal
        recipes={recipes}
        ingredients={ingredients}
        allRecipes={recipes}
        onClose={() => {}}
      />
    );
    const sugarRow = screen.getByRole('row', { name: /Azúcares totales/i });
    const cells = within(sugarRow).getAllByRole('cell');
    // cells[0] = label; cells[1] = receta A (alta azucar); cells[2] = receta B (baja).
    // Best (menor azucar) → fondo mint3. Worst (mayor) → fondo coral2.
    expect(cells[2].style.background).toBe('var(--mint3)');
    expect(cells[1].style.background).toBe('var(--coral2)');
  });

  it('shows the verdict icon (✓ ⚠ or ✗) for each recipe', () => {
    const { container } = render(
      <RecipeComparisonModal
        recipes={recipes}
        ingredients={ingredients}
        allRecipes={recipes}
        onClose={() => {}}
      />
    );
    const text = container.textContent;
    // Al menos uno de los iconos debe aparecer dos veces (uno por receta)
    const totalIcons =
      (text.match(/✓/g) || []).length +
      (text.match(/⚠/g) || []).length +
      (text.match(/✗/g) || []).length;
    expect(totalIcons).toBeGreaterThanOrEqual(2);
  });

  it('expands sub-recipes when computing stats', () => {
    // Receta C usa la receta A como subreceta
    const subRecipe = {
      id: 20, name: 'Con subreceta', type: 'helado', subtype: 'base',
      ingredients: [
        { recipe_id: 10, qty_grams: 1000 }, // toda la receta A
      ],
    };
    render(
      <RecipeComparisonModal
        recipes={[subRecipe]}
        ingredients={ingredients}
        allRecipes={[...recipes, subRecipe]}
        onClose={() => {}}
      />
    );
    // El header de la columna debe mostrar peso total ~1000g (no 0)
    expect(screen.getByText(/1.000 g|1000 g/)).toBeInTheDocument();
  });

  it('calls onClose when × button is clicked', async () => {
    const user = userEvent.setup();
    let closed = false;
    render(
      <RecipeComparisonModal
        recipes={recipes}
        ingredients={ingredients}
        allRecipes={recipes}
        onClose={() => { closed = true; }}
      />
    );
    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(closed).toBe(true);
  });
});
