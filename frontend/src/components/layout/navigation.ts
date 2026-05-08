import {
  Bot,
  Download,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavigationItem = {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  path: string;
};

export type NavigationGroup = {
  id: string;
  label: string;
  items: NavigationItem[];
};

export type PageInfo = {
  title: string;
  subtitle: string;
};

export const navigationGroups: NavigationGroup[] = [
  {
    id: 'cobranza',
    label: 'Cobranza',
    items: [
      { id: 'portfolio', label: 'Cartera', icon: LayoutDashboard, path: '/' },
      { id: 'clients', label: 'Clientes', icon: Users, path: '/directorio' },
    ],
  },
  {
    id: 'data',
    label: 'Datos',
    items: [
      { id: 'import', label: 'Importar datos', shortLabel: 'Importar', icon: Upload, path: '/registros' },
      { id: 'export', label: 'Exportar', icon: Download, path: '/exportar' },
    ],
  },
  {
    id: 'pending',
    label: 'Trabajo pendiente',
    items: [
      { id: 'agent', label: 'Aprobaciones', icon: Bot, path: '/agente' },
      { id: 'payments', label: 'Pagos por confirmar', shortLabel: 'Pagos', icon: ReceiptText, path: '/pagos/revision' },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    items: [
      { id: 'diagnostics', label: 'Diagnostico', icon: ShieldCheck, path: '/sistema/diagnostico' },
      { id: 'audit', label: 'Auditoria', icon: ScrollText, path: '/logs' },
      { id: 'settings', label: 'Configuracion', icon: Settings, path: '/config' },
    ],
  },
];

export const flatNavigationItems = navigationGroups.flatMap(group => group.items);

export const pageTitles: Record<string, PageInfo> = {
  '/': { title: 'Cartera', subtitle: 'Prioriza vencimientos, acciones y seguimiento de cobranza' },
  '/registros': { title: 'Importar datos', subtitle: 'Revision de archivos, mapeo y commit controlado' },
  '/directorio': { title: 'Clientes', subtitle: 'Base de clientes, contactos y operaciones relacionadas' },
  '/exportar': { title: 'Exportar', subtitle: 'Descarga reportes y datos operativos' },
  '/agente': { title: 'Aprobaciones del agente', subtitle: 'Revisa acciones automatizadas antes del handoff' },
  '/pagos/revision': { title: 'Pagos por confirmar', subtitle: 'Valida comprobantes ambiguos y candidatos de operacion' },
  '/sistema/diagnostico': { title: 'Diagnostico del sistema', subtitle: 'Readiness E2E de conectividad e integraciones' },
  '/logs': { title: 'Auditoria', subtitle: 'Historial de eventos de cobranza y automatizacion' },
  '/config': { title: 'Configuracion', subtitle: 'Modo operativo, canales, plantillas y equipo' },
};

export function isActivePath(itemPath: string, pathname: string) {
  return itemPath === '/' ? pathname === '/' : pathname.startsWith(itemPath);
}

export function getPageInfo(pathname: string): PageInfo {
  const exact = pageTitles[pathname];
  if (exact) return exact;

  for (const [path, info] of Object.entries(pageTitles)) {
    if (path !== '/' && pathname.startsWith(path)) return info;
  }

  return { title: 'Collecta', subtitle: 'Cobranza inteligente' };
}
