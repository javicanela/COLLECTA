import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuditFilters, type AuditFiltersState } from './AuditFilters';

const filters: AuditFiltersState = {
  type: 'all',
  outcome: 'all',
  query: '',
  from: '',
  to: '',
};

describe('AuditFilters', () => {
  it('renders type, outcome, text and date controls', () => {
    const html = renderToStaticMarkup(
      <AuditFilters
        filters={filters}
        resultCount={8}
        totalCount={12}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(html).toContain('Tipo');
    expect(html).toContain('Resultado');
    expect(html).toContain('Cliente o texto');
    expect(html).toContain('Desde');
    expect(html).toContain('Hasta');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('Pago');
    expect(html).toContain('8 de 12');
  });
});
