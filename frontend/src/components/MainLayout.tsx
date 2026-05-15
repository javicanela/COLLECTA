import { useEffect, useState, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { Sun, Moon, Menu, X, Wallet, LogOut } from 'lucide-react';
import { useOperationStore } from '../stores/useOperationStore';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { useBrowserOnlineStatus, type CollectaConnectionStatus } from '../hooks/useConnectivityStatus';
import ToastContainer from './ui/ToastContainer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  navigationGroups,
  isActivePath,
  getPageInfo,
  type NavigationGroup,
  type NavigationItem,
} from './layout/navigation';
import { PageHeader } from './layout/PageHeader';
import { StatusRail, type RailServiceStatus, type WhatsAppConnectionStatus } from './layout/StatusRail';
import type { DiagnosticsReadinessCheck, DiagnosticsReadinessResponse } from '../types';
import { useAuthStore } from '../stores/useAuthStore';

/* ── MainLayout ─────────────────────────────────────────────────────────── */

interface SidebarNavProps {
  currentPath: string;
  isMobile: boolean;
  vencidasCount: number;
  onNavigate: () => void;
}

function SidebarNav({ currentPath, isMobile, vencidasCount, onNavigate }: SidebarNavProps) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Navegación principal">
      {navigationGroups.map((group: NavigationGroup) => (
        <div key={group.id} className="mb-4">
          <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--sidebar-text)] opacity-50">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item: NavigationItem) => {
              const active = isActivePath(item.path, currentPath);
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    onClick={isMobile ? onNavigate : undefined}
                    className={`
                      group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium
                      no-underline transition-colors
                      ${active
                        ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-text-active)]'
                        : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text-active)]'
                      }
                    `}
                    aria-current={active ? 'page' : undefined}
                  >
                    {active && (
                      <span
                        className="absolute left-0 h-5 w-[3px] rounded-r-full bg-[var(--sidebar-active-bar)]"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      size={16}
                      className="flex-shrink-0 transition-colors"
                      style={{ opacity: active ? 1 : 0.7 }}
                    />
                    <span className="flex-1 truncate">{item.shortLabel || item.label}</span>
                    {item.id === 'portfolio' && vencidasCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-danger)] px-1.5 text-[10px] font-bold text-white">
                        {vencidasCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

interface SidebarFooterProps {
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
}

export function SidebarFooter({
  theme,
  onToggleTheme,
  onLogout,
  userName = 'Admin',
  userRole = 'Administrador',
}: SidebarFooterProps) {
  return (
    <div className="mt-auto border-t border-[var(--sidebar-border)] px-3 py-3">
      <div className="flex items-center gap-2.5 px-2">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
          style={{ background: 'var(--brand-primary)' }}
        >
          C
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--sidebar-text-active)]">{userName}</p>
          <p className="truncate text-[10px] text-[var(--sidebar-text)] opacity-50">{userRole}</p>
        </div>
        <button
          onClick={onToggleTheme}
          className="flex-shrink-0 rounded-md p-2 text-[var(--sidebar-text)] transition-colors hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text-active)]"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={onLogout}
          className="flex-shrink-0 rounded-md p-2 text-[var(--sidebar-text)] transition-colors hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text-active)]"
          title="Cerrar sesion"
          aria-label="Cerrar sesion"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

function normalizeRailStatus(status?: string): RailServiceStatus {
  if (!status) return 'unknown';
  const normalized = status.toLowerCase();
  if (['ok', 'pass', 'passed', 'ready'].includes(normalized)) return 'ok';
  if (['warning', 'warn', 'degraded', 'skipped'].includes(normalized)) return 'warning';
  if (['error', 'fail', 'failed', 'blocked'].includes(normalized)) return 'error';
  return 'unknown';
}

function getCheckStatus(checks: DiagnosticsReadinessResponse['checks'], id: string): RailServiceStatus {
  const list: DiagnosticsReadinessCheck[] = Array.isArray(checks)
    ? checks
    : Object.values(checks || {});
  const check = list.find(item => item.id === id || item.key === id);

  if (!check) return 'unknown';
  if (typeof check.ok === 'boolean') return check.ok ? 'ok' : 'error';
  return normalizeRailStatus(check.status);
}

export default function MainLayout() {
  const location = useLocation();
  const { fetchOperations, vencidasCount } = useOperationStore();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { toasts } = useToast();
  const isBrowserOnline = useBrowserOnlineStatus();

  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<CollectaConnectionStatus>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'syncing'
  );
  const [sysMode, setSysMode] = useState<string>(() =>
    localStorage.getItem('sys_modo') || 'PRUEBA',
  );
  const [waStatus, setWaStatus] = useState<WhatsAppConnectionStatus>('not_configured');
  const [readinessStatus, setReadinessStatus] = useState<RailServiceStatus>('unknown');
  const [emailStatus, setEmailStatus] = useState<RailServiceStatus>('unknown');
  const [pdfStatus, setPdfStatus] = useState<RailServiceStatus>('ok');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /* ── Data fetching ──────────────────────────────────────────────────── */

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  useEffect(() => {
    if (!isBrowserOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors browser online/offline events into app status
      setConnectionStatus('offline');
      return;
    }

    setConnectionStatus('syncing');
    const savedModo = localStorage.getItem('sys_modo');

    api.get<Record<string, string>>('/config').then(cfg => {
      setActiveProvider(cfg['active_api_provider'] || null);
      const modo = cfg['modo'] || cfg['sysModo'] || savedModo || 'PRUEBA';
      setSysMode(modo);
      localStorage.setItem('sys_modo', modo);
      setConnectionStatus('online');
    }).catch(() => setConnectionStatus('api_error'));

    const pollWaStatus = () => {
      api.get<{ configured: boolean; connected: boolean; state?: string }>('/whatsapp/status')
        .then(s => {
          if (!s.configured) setWaStatus('not_configured');
          else if (s.state === 'error') setWaStatus('error');
          else setWaStatus(s.connected ? 'connected' : 'disconnected');
        })
        .catch(() => setWaStatus('error'));
    };
    pollWaStatus();
    const waInterval = setInterval(pollWaStatus, 30000);

    const pollReadiness = () => {
      api.get<DiagnosticsReadinessResponse>('/diagnostics/e2e-readiness')
        .then(result => {
          setReadinessStatus(normalizeRailStatus(result.status));
          setEmailStatus(getCheckStatus(result.checks, 'email'));
          setPdfStatus('ok');
        })
        .catch(() => {
          setReadinessStatus('error');
          setEmailStatus('unknown');
          setPdfStatus('unknown');
        });
    };
    pollReadiness();
    const readinessInterval = setInterval(pollReadiness, 60000);

    const handleModoChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSysMode(customEvent.detail || 'PRUEBA');
      localStorage.setItem('sys_modo', customEvent.detail || 'PRUEBA');
    };
    window.addEventListener('modo-changed', handleModoChange);
    return () => {
      clearInterval(waInterval);
      clearInterval(readinessInterval);
      window.removeEventListener('modo-changed', handleModoChange);
    };
  }, [isBrowserOnline]);

  /* ── Responsive ─────────────────────────────────────────────────────── */

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && sidebarOpen && isMobile) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen, isMobile]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const pageInfo = getPageInfo(location.pathname);

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="flex min-h-screen bg-[var(--c-bg)]" style={{ backgroundImage: 'var(--c-bg-gradient)' }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-primary)] focus:px-4 focus:py-2 focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2"
      >
        Saltar al contenido principal
      </a>

      {/* ── Mobile overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-full flex-col
          border-r border-[var(--sidebar-border)]
          bg-[var(--sidebar-bg)] transition-transform duration-200
          lg:static lg:z-auto lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ width: 'var(--sidebar-width, 240px)' }}
      >
        {/* Sidebar header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--sidebar-border)] px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ background: 'var(--brand-primary)' }}
            >
              <Wallet size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-[var(--sidebar-text-active)]">
                Collecta
              </h1>
              <p className="text-[10px] text-[var(--sidebar-text)] opacity-50">Cobranza Inteligente</p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1.5 text-[var(--sidebar-text)] transition-colors hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text-active)]"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <SidebarNav
          currentPath={location.pathname}
          isMobile={isMobile}
          vencidasCount={vencidasCount}
          onNavigate={() => setSidebarOpen(false)}
        />
        <SidebarFooter
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={logout}
          userName={user?.name || user?.email || 'Admin'}
          userRole={user?.role || 'Administrador'}
        />
      </aside>

      {/* ── Main content area ──────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-[var(--c-border-subtle)] bg-[var(--c-surface)] px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-[var(--c-text-2)] transition-colors hover:bg-[var(--c-surface-raised)] hover:text-[var(--c-text)]"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-bold text-[var(--c-text)]">Collecta</span>
          </div>
          <div className="flex items-center gap-2">
            {vencidasCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-danger)] px-1.5 text-[10px] font-bold text-white">
                {vencidasCount}
              </span>
            )}
            <button
              onClick={toggleTheme}
              className="rounded-md p-2 text-[var(--c-text-2)] transition-colors hover:bg-[var(--c-surface-raised)] hover:text-[var(--c-text)]"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Page header + status rail (desktop) */}
        <div className="flex-shrink-0 space-y-3 border-b border-[var(--c-border-subtle)] bg-[var(--c-surface-glass)] px-4 py-4 sm:px-5 lg:px-6" style={{ backdropFilter: 'blur(12px)' }}>
          <div className="mx-auto max-w-7xl space-y-3">
            <PageHeader title={pageInfo.title} subtitle={pageInfo.subtitle} />
            <StatusRail
              sysMode={sysMode}
              waStatus={waStatus}
              activeProvider={activeProvider}
              connectionStatus={connectionStatus}
              readinessStatus={readinessStatus}
              emailStatus={emailStatus}
              pdfStatus={pdfStatus}
            />
          </div>
        </div>

        {/* Main content */}
        <main id="main-content" className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mx-auto max-w-7xl"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
