import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ConnectivityTestPanel } from './ConnectivityTestPanel';
import type { ReadinessSummary } from './ReadinessChecklist';

const summary: ReadinessSummary = {
  total: 8,
  ok: 3,
  warning: 1,
  error: 1,
  notConfigured: 2,
  unverified: 1,
  blocking: 5,
};

describe('ConnectivityTestPanel', () => {
  it('renders refresh control, summary counters and sanitized error copy', () => {
    const html = renderToStaticMarkup(
      <ConnectivityTestPanel
        summary={summary}
        overallStatus="error"
        generatedAt="2026-05-11T18:40:00.000Z"
        environment="development"
        isLoading={false}
        error="token: sk-live-secret-value"
        onRefresh={vi.fn()}
      />,
    );

    expect(html).toContain('Prueba de conectividad');
    expect(html).toContain('Refrescar');
    expect(html).toContain('3 OK');
    expect(html).toContain('2 no configuradas');
    expect(html).toContain('1 sin verificar');
    expect(html).toContain('token: [oculto]');
    expect(html).not.toContain('sk-live-secret-value');
  });
});
