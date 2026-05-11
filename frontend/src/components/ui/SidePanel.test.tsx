import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SidePanel } from './SidePanel';

describe('SidePanel', () => {
  it('renders an accessible complementary panel with title and close label', () => {
    const html = renderToStaticMarkup(
      <SidePanel
        title="Detalle de operacion"
        open
        onClose={() => {}}
      >
        <p>Contenido</p>
      </SidePanel>,
    );

    expect(html).toContain('role="complementary"');
    expect(html).toContain('Detalle de operacion');
    expect(html).toContain('aria-label="Cerrar panel"');
  });

  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      <SidePanel title="Detalle" open={false} onClose={() => {}}>
        <p>Contenido</p>
      </SidePanel>,
    );

    expect(html).toBe('');
  });
});
