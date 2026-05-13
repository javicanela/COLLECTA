import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LoginProviderPanel } from './LoginProviderPanel';

describe('LoginProviderPanel', () => {
  it('shows Supabase as unavailable without rendering an active login action', () => {
    const html = renderToStaticMarkup(
      <LoginProviderPanel
        status={{
          id: 'supabase',
          label: 'Supabase',
          configured: false,
          available: false,
          reason: 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
        }}
        isLoading={false}
        onProviderLogin={vi.fn()}
      />,
    );

    expect(html).toContain('Supabase no configurado');
    expect(html).toContain('disabled=""');
  });

  it('renders the provider login action only when Supabase is available', () => {
    const html = renderToStaticMarkup(
      <LoginProviderPanel
        status={{
          id: 'supabase',
          label: 'Supabase',
          configured: true,
          available: true,
          reason: 'Supabase Auth listo.',
        }}
        isLoading={false}
        onProviderLogin={vi.fn()}
      />,
    );

    expect(html).toContain('Continuar con Supabase');
    expect(html).not.toContain('disabled=""');
  });
});
