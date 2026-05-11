import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IntegrationStatusGrid } from './IntegrationStatusGrid';
import type { ReadinessItem } from './ReadinessChecklist';

const items: ReadinessItem[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp / Evolution',
    shortLabel: 'WhatsApp',
    status: 'not_configured',
    message: 'WhatsApp automation is not fully configured.',
    nextAction: 'Configurar Evolution API en staging.',
    fallback: 'Fallback manual: abrir wa.me con mensaje prellenado.',
    sourceLabels: ['Evolution API'],
  },
  {
    id: 'email',
    label: 'Email',
    shortLabel: 'Email',
    status: 'ok',
    message: 'Email delivery appears configured.',
    nextAction: 'Enviar prueba controlada.',
    fallback: 'Descargar PDF y enviarlo manualmente.',
    sourceLabels: ['Email delivery'],
  },
  {
    id: 'payments',
    label: 'Pagos',
    shortLabel: 'Pagos',
    status: 'error',
    message: 'Provider failed.',
    nextAction: 'Revisar provider.',
    fallback: 'Conciliacion manual.',
    sourceLabels: ['Payment detection provider'],
  },
  {
    id: 'smartImport',
    label: 'Smart Import',
    shortLabel: 'Import',
    status: 'unverified',
    message: 'No data.',
    nextAction: 'Probar CSV caotico.',
    fallback: 'Parseo deterministico local.',
    sourceLabels: [],
  },
];

describe('IntegrationStatusGrid', () => {
  it('renders integration readiness with fallbacks and stable status labels', () => {
    const html = renderToStaticMarkup(<IntegrationStatusGrid items={items} />);

    expect(html).toContain('Integraciones');
    expect(html).toContain('WhatsApp / Evolution');
    expect(html).toContain('No configurado');
    expect(html).toContain('Email delivery appears configured.');
    expect(html).toContain('Error');
    expect(html).toContain('Sin verificar');
    expect(html).toContain('Parseo deterministico local.');
  });
});
