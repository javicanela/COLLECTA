import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SidebarFooter } from './MainLayout';

describe('SidebarFooter', () => {
  it('renders an explicit logout action', () => {
    const html = renderToStaticMarkup(
      <SidebarFooter
        theme="dark"
        onToggleTheme={vi.fn()}
        onLogout={vi.fn()}
        userName="Admin"
        userRole="Administrador"
      />,
    );

    expect(html).toContain('Cerrar sesion');
  });
});
