import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StatusRail } from './StatusRail';

describe('StatusRail', () => {
  it('shows the API connection state explicitly', () => {
    const html = renderToStaticMarkup(
      <StatusRail
        sysMode="PRUEBA"
        waStatus="not_configured"
        activeProvider={null}
        connectionStatus="offline"
      />,
    );

    expect(html).toContain('Collecta Offline');
  });

  it('allows horizontal scrolling on narrow viewports', () => {
    const html = renderToStaticMarkup(
      <StatusRail
        sysMode="PRUEBA"
        waStatus="not_configured"
        activeProvider="gemini"
        connectionStatus="online"
      />,
    );

    expect(html).toContain('overflow-x-auto');
  });
});
