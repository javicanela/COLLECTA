import { describe, expect, it } from 'vitest';
import { multilevelHeaderRows } from '../__fixtures__/sample-workbooks';
import { collapseMultilevelHeaders } from './header-collapse';

describe('header collapse', () => {
  it('collapses multi-level headers by carrying group labels forward', () => {
    const headers = collapseMultilevelHeaders(multilevelHeaderRows, {
      headerRows: [0, 1],
      startColumn: 0,
      endColumn: 6,
    });

    expect(headers).toEqual([
      'Cliente RFC',
      'Cliente Razon Social',
      'Contacto Email',
      'Contacto Telefono',
      'Operacion Monto',
      'Operacion Vencimiento',
      'Operacion Descripcion',
    ]);
  });
});
