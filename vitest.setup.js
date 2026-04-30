// Setup global de los tests de componentes (cargado solo cuando un archivo
// usa environment jsdom via "// @vitest-environment jsdom" en su header).
// Anade los matchers de jest-dom (toBeInTheDocument, toHaveTextContent, etc.)
// y limpia el DOM entre tests.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
