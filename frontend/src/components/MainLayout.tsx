import { useEffect, useMemo, useState, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import {
  LayoutDashboard, Users, Upload, Download,
  Settings, ScrollText, Sun, Moon, Menu, X,
  Zap, AlertCircle, Wallet, ChevronRight, Home,
} from 'lucide-react';
import { useOperationStore } from '../stores/useOperationStore';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ui/ToastContainer';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
  { id: 'ops', label: 'Operaciones', icon: LayoutDashboard, path: '/' },
  { id: 'reg', label: 'Registros', icon: Upload, path: '/registros' },
  { id: 'dir', label: 'Directorio', icon: Users, path: '/directorio' },
  { id: 'exp', label: 'Exportar', icon: Download, path: '/exportar' },
  { id: 'log', label: 'Logs', icon: ScrollText, path: '/logs' },
  { id: 'conf', label: 'Config', icon: Settings, path: '/config' },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Operaciones', subtitle: 'Gestión de cobranza y seguimiento de pagos' },
  '/registros': { title: 'Registros', subtitle: 'Importación de datos desde Excel o CSV' },
  '/directorio': { title: 'Directorio', subtitle: 'Base de clientes del despacho' },
  '/exportar': { title: 'Exportar', subtitle: 'Exportaciones y estadísticas' },
  '/logs': { title: 'Logs', subtitle: 'Historial de envíos de cobranza' },
  '/config': { title: 'Configuración', subtitle: 'Configuración del sistema' },
};

export default function MainLayout() {
  const location = useLocation();
  const { fetchOperations, vencidasCount } = useOperationStore();
  const { theme, toggleTheme } = useTheme();
  const { toasts } = useToast();

  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [sysMode, setSysMode] = useState<string>('PRUEBA');
  const [waStatus, setWaStatus] = useState<'connected' | 'disconnected' | 'not_configured'>('not_configured');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  useEffect(() => {
    // Cargar config y modo desde localStorage al iniciar
    const savedModo = localStorage.getItem('sys_modo');
    if (savedModo) setSysMode(savedModo);
    
    api.get<Record<string, string>>('/config').then(cfg => {
      setActiveProvider(cfg['active_api_provider'] || null);
      const modo = cfg['modo'] || cfg['sysModo'] || savedModo || 'PRUEBA';
      setSysMode(modo);
      localStorage.setItem('sys_modo', modo);
    }).catch(() => {});

    // Poll WhatsApp connection status
    const pollWaStatus = () => {
      api.get<{ configured: boolean; connected: boolean }>('/whatsapp/status')
        .then(s => setWaStatus(s.configured ? (s.connected ? 'connected' : 'disconnected') : 'not_configured'))
        .catch(() => setWaStatus('not_configured'));
    };
    pollWaStatus();
    const waInterval = setInterval(pollWaStatus, 30000);

    const handleModoChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSysMode(customEvent.detail || 'PRUEBA');
      localStorage.setItem('sys_modo', customEvent.detail || 'PRUEBA');
    };
    window.addEventListener('modo-changed', handleModoChange);
    return () => {
      clearInterval(waInterval);
      window.removeEventListener('modo-changed', handleModoChange);
    };
  }, []);

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
  }, []);

  const pageInfo = useMemo(() => {
    const exact = pageTitles[location.pathname];
    if (exact) return exact;
    for (const [path, info] of Object.entries(pageTitles)) {
      if (location.pathname.startsWith(path) && path !== '/') return info;
    }
    return { title: 'Collecta', subtitle: 'Cobranza Inteligente' };
  }, [location.pathname]);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const isDark = theme === 'dark';
  
  const sidebarBg = isDark 
    ? 'rgba(15, 23, 42, 0.92)' 
    : 'rgba(26, 31, 60, 0.92)';
  
  const mainBg = isDark
    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #134e4a 100%)'
    : 'linear-gradient(135deg, #e0f2fe 0%, #d1fae5 50%, #a7f3d0 100%)';

  const sidebarVariants = {
    hidden: { x: -320, opacity: 0, scale: 0.96 },
    visible: { x: 0, opacity: 1, scale: 1, transition: { type: 'spring' as const, damping: 28, stiffness: 320, mass: 0.8 } },
    exit: { x: -320, opacity: 0, scale: 0.96, transition: { duration: 0.2, ease: 'easeInOut' as const } },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
    exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' as const } },
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && sidebarOpen && isMobile) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen, isMobile]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen flex" style={{ background: mainBg }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-brand-primary focus:text-white focus:rounded-lg focus:font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
      >
        Saltar al contenido principal
      </a>
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSidebarOpen(false)}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          transition-all duration-300 ease-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          width: '280px',
        }}
      >
        <motion.div
          variants={sidebarVariants}
          initial={isMobile ? 'hidden' : false}
          animate={sidebarOpen || !isMobile ? 'visible' : 'hidden'}
          className="h-full m-3 rounded-2xl overflow-hidden"
          style={{
            background: sidebarBg,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div
            className="px-5 py-5 flex-shrink-0 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #3B4FE8 0%, #7C3AED 100%)',
                  boxShadow: '0 4px 12px rgba(59, 79, 232, 0.4)',
                }}
              >
                <Wallet size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-xl tracking-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  Collecta
                </h1>
                <p className="text-xs text-white/50 font-medium mt-0.5">Cobranza Inteligente</p>
              </div>
            </div>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
            <ul className="space-y-1">
              {menuItems.map((item, idx) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl
                        transition-all duration-200 no-underline relative group
                        ${active 
                          ? 'text-white' 
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                        }
                      `}
                      style={{
                        background: active ? 'linear-gradient(135deg, rgba(59,79,232,0.25), rgba(124,58,237,0.15))' : 'transparent',
                        boxShadow: active ? '0 4px 16px rgba(59, 79, 232, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                      }}
                    >
                      {active && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                          style={{ background: 'linear-gradient(180deg, #3B4FE8, #7C3AED)' }}
                          initial={{ opacity: 0, scaleY: 0 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Icon
                          size={18}
                          className="transition-transform duration-200 group-hover:scale-110 flex-shrink-0"
                          style={{ color: active ? '#fff' : 'rgba(255,255,255,0.7)' }}
                        />
                      </motion.div>
                      <span className="flex-1 font-medium text-sm">{item.label}</span>
                      {item.id === 'ops' && vencidasCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: 'linear-gradient(135deg, #EF3F3F, #f87171)',
                            boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                          }}
                        >
                          {vencidasCount}
                        </motion.span>
                      )}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </nav>

          <div className="px-4 pb-4 mt-auto">
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-3 text-xs"
              style={{
                background: sysMode === 'PRODUCCIÓN' ? 'rgba(16,183,125,0.15)' : 'rgba(245,158,11,0.15)',
                border: `1px solid ${sysMode === 'PRODUCCIÓN' ? 'rgba(16,183,125,0.25)' : 'rgba(245,158,11,0.25)'}`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  background: sysMode === 'PRODUCCIÓN' ? '#10B77D' : '#F59E0B',
                  boxShadow: `0 0 8px ${sysMode === 'PRODUCCIÓN' ? '#10B77D' : '#F59E0B'}`,
                }}
              />
              <span
                className="font-bold uppercase tracking-wider"
                style={{ color: sysMode === 'PRODUCCIÓN' ? '#10B77D' : '#F59E0B' }}
              >
                {sysMode}
              </span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 text-white/50 text-xs font-medium">
              {activeProvider ? (
                <>
                  <Zap size={14} style={{ color: '#10B77D' }} />
                  <span>{activeProvider}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} style={{ color: '#EF3F3F' }} />
                  <span>Sin API</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 px-4 py-2 text-white/50 text-xs font-medium mb-3">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: waStatus === 'connected' ? '#25D366' : waStatus === 'disconnected' ? '#EF3F3F' : '#6B7280',
                  boxShadow: waStatus === 'connected' ? '0 0 6px #25D366' : 'none',
                }}
              />
              <span>
                WA {waStatus === 'connected' ? 'Conectado' : waStatus === 'disconnected' ? 'Desconectado' : 'No config.'}
              </span>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-3" />

            <div className="flex items-center gap-3 px-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #3B4FE8, #7C3AED)',
                  boxShadow: '0 2px 8px rgba(59, 79, 232, 0.4)',
                  color: 'white',
                }}
              >
                C
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">Admin</p>
                <p className="text-white/40 text-xs truncate">Administrador</p>
              </div>
              <motion.button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl transition-all hover:bg-white/10 relative overflow-hidden flex-shrink-0"
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                whileHover={{ scale: 1.08, backgroundColor: 'rgba(255,255,255,0.12)' }}
                whileTap={{ scale: 0.95 }}
                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  {theme === 'dark' ? (
                    <Sun size={16} style={{ color: '#F59E0B' }} />
                  ) : (
                    <Moon size={16} style={{ color: '#7C3AED' }} />
                  )}
                </motion.div>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{
            background: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div className="flex items-center gap-3">
            <motion.button 
              onClick={() => setSidebarOpen(true)} 
              className="p-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #3B4FE8 0%, #7C3AED 100%)',
                  boxShadow: '0 2px 10px rgba(59,79,232,0.4)',
                }}
              >
                <Wallet size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">Collecta</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {vencidasCount > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #EF3F3F, #f87171)',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                }}
              >
                {vencidasCount}
              </motion.span>
            )}
            <motion.button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <motion.div
                animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {theme === 'dark' ? <Sun size={18} style={{ color: '#F59E0B' }} /> : <Moon size={18} style={{ color: '#7C3AED' }} />}
              </motion.div>
            </motion.button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="hidden lg:flex items-center gap-2 px-6 py-3"
            style={{
              background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Link 
              to="/" 
              className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1.5 no-underline"
            >
              <Home size={12} />
              Inicio
            </Link>
            <ChevronRight size={12} className="text-white/25" />
            <span className="text-xs font-medium text-white/75">{pageInfo.title}</span>
          </motion.div>
        </AnimatePresence>

        <main id="main-content" className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
