import { describe, it, expect } from 'vitest';
import {
  getBarcodes,
  findIngredientByBarcode,
  buildAddBarcodePatch,
  buildRemoveBarcodePatch,
} from './barcodeMap';

describe('getBarcodes', () => {
  it('returns empty array for null/undefined ingredient', () => {
    expect(getBarcodes(null)).toEqual([]);
    expect(getBarcodes(undefined)).toEqual([]);
  });

  it('returns empty array when ingredient has no barcodes', () => {
    expect(getBarcodes({ id: 1, name: 'X' })).toEqual([]);
  });

  it('returns the new barcodes[] array', () => {
    expect(getBarcodes({ barcodes: ['111', '222'] })).toEqual(['111', '222']);
  });

  it('falls back to legacy barcode field', () => {
    expect(getBarcodes({ barcode: '999' })).toEqual(['999']);
  });

  it('merges legacy barcode into barcodes[] without duplicating', () => {
    expect(getBarcodes({ barcodes: ['111'], barcode: '111' })).toEqual(['111']);
    expect(getBarcodes({ barcodes: ['111'], barcode: '222' })).toEqual(['111', '222']);
  });

  it('drops empty strings and trims legacy', () => {
    expect(getBarcodes({ barcodes: ['111', ''], barcode: '   ' })).toEqual(['111']);
  });
});

describe('findIngredientByBarcode', () => {
  const ingredients = [
    { id: 1, name: 'Sacarosa', barcodes: ['7501', '7502'] },
    { id: 2, name: 'Leche',    barcode:  '8901' },
    { id: 3, name: 'Crema',    barcodes: ['1234'], barcode: '5678' },
  ];

  it('returns null for empty/missing code', () => {
    expect(findIngredientByBarcode(ingredients, '')).toBeNull();
    expect(findIngredientByBarcode(ingredients, null)).toBeNull();
    expect(findIngredientByBarcode(ingredients, undefined)).toBeNull();
  });

  it('finds by new array', () => {
    expect(findIngredientByBarcode(ingredients, '7502')?.id).toBe(1);
  });

  it('finds by legacy field', () => {
    expect(findIngredientByBarcode(ingredients, '8901')?.id).toBe(2);
  });

  it('finds when both legacy and array exist', () => {
    expect(findIngredientByBarcode(ingredients, '5678')?.id).toBe(3);
    expect(findIngredientByBarcode(ingredients, '1234')?.id).toBe(3);
  });

  it('trims and stringifies the search code', () => {
    expect(findIngredientByBarcode(ingredients, '  7501  ')?.id).toBe(1);
    expect(findIngredientByBarcode(ingredients, 7501)?.id).toBe(1);
  });

  it('returns null if not found', () => {
    expect(findIngredientByBarcode(ingredients, '0000')).toBeNull();
  });
});

describe('buildAddBarcodePatch', () => {
  it('returns null if code is empty/whitespace', () => {
    expect(buildAddBarcodePatch({ barcodes: [] }, '')).toBeNull();
    expect(buildAddBarcodePatch({ barcodes: [] }, '   ')).toBeNull();
    expect(buildAddBarcodePatch({ barcodes: [] }, null)).toBeNull();
  });

  it('returns null if code already exists in array', () => {
    expect(buildAddBarcodePatch({ barcodes: ['111'] }, '111')).toBeNull();
  });

  it('returns null if code already exists as legacy', () => {
    expect(buildAddBarcodePatch({ barcode: '111' }, '111')).toBeNull();
  });

  it('appends to existing array', () => {
    expect(buildAddBarcodePatch({ barcodes: ['111'] }, '222'))
      .toEqual({ barcodes: ['111', '222'], barcode: '111' });
  });

  it('mirrors first code into legacy barcode field', () => {
    const patch = buildAddBarcodePatch({}, '999');
    expect(patch.barcodes).toEqual(['999']);
    expect(patch.barcode).toBe('999');
  });

  it('trims whitespace from new code', () => {
    const patch = buildAddBarcodePatch({ barcodes: [] }, '  555  ');
    expect(patch.barcodes).toEqual(['555']);
  });
});

describe('buildRemoveBarcodePatch', () => {
  it('returns null for empty code', () => {
    expect(buildRemoveBarcodePatch({ barcodes: ['111'] }, '')).toBeNull();
  });

  it('returns null if code not present', () => {
    expect(buildRemoveBarcodePatch({ barcodes: ['111'] }, '999')).toBeNull();
  });

  it('removes the code from the array', () => {
    expect(buildRemoveBarcodePatch({ barcodes: ['111', '222'] }, '111'))
      .toEqual({ barcodes: ['222'], barcode: '222' });
  });

  it('clears legacy when last code is removed', () => {
    expect(buildRemoveBarcodePatch({ barcodes: ['111'] }, '111'))
      .toEqual({ barcodes: [], barcode: '' });
  });

  it('removes a code that lived only in legacy', () => {
    expect(buildRemoveBarcodePatch({ barcode: '111' }, '111'))
      .toEqual({ barcodes: [], barcode: '' });
  });
});
