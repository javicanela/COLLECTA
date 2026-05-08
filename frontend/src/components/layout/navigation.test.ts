import { describe, expect, it } from 'vitest';
import { flatNavigationItems, getPageInfo, isActivePath, navigationGroups } from './navigation';

describe('layout navigation contract', () => {
  it('keeps current route contracts while grouping navigation by job', () => {
    const paths = flatNavigationItems.map(item => item.path);

    expect(paths).toEqual([
      '/',
      '/directorio',
      '/registros',
      '/exportar',
      '/agente',
      '/pagos/revision',
      '/sistema/diagnostico',
      '/logs',
      '/config',
    ]);
    expect(navigationGroups.map(group => group.label)).toEqual([
      'Cobranza',
      'Datos',
      'Trabajo pendiente',
      'Sistema',
    ]);
  });

  it('marks nested paths as active without making every route active for root', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/', '/agente')).toBe(false);
    expect(isActivePath('/pagos/revision', '/pagos/revision/abc')).toBe(true);
  });

  it('returns operational page copy for known routes', () => {
    expect(getPageInfo('/').title).toBe('Cartera');
    expect(getPageInfo('/pagos/revision')).toMatchObject({
      title: 'Pagos por confirmar',
    });
    expect(getPageInfo('/ruta/desconocida')).toMatchObject({
      title: 'Collecta',
    });
  });
});
