import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './components/MainLayout';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import DirectoryView from './views/DirectoryView';
import RegistersView from './views/RegistersView';
import ConfigView from './views/ConfigView';
import ExportView from './views/ExportView';
import UIPreview from './views/UIPreview';
import LogView from './views/LogView';
import AgentView from './views/AgentView';
import PaymentReviewView from './views/PaymentReviewView';
import SystemReadinessView from './views/SystemReadinessView';
import { useAuthStore } from './stores/useAuthStore';
import './App.css';

const pageVariants = {
  initial: {
    opacity: 0,
    x: -10,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: 10,
  },
};

const pageTransition = {
  duration: 0.2,
  ease: 'easeOut' as const,
};

function AnimatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<AnimatedRoute><DashboardView /></AnimatedRoute>} />
          <Route path="directorio" element={<AnimatedRoute><DirectoryView /></AnimatedRoute>} />
          <Route path="registros" element={<AnimatedRoute><RegistersView /></AnimatedRoute>} />
          <Route path="exportar" element={<AnimatedRoute><ExportView /></AnimatedRoute>} />
          <Route path="agente" element={<AnimatedRoute><AgentView /></AnimatedRoute>} />
          <Route path="pagos/revision" element={<AnimatedRoute><PaymentReviewView /></AnimatedRoute>} />
          <Route path="sistema/diagnostico" element={<AnimatedRoute><SystemReadinessView /></AnimatedRoute>} />
          <Route path="config" element={<AnimatedRoute><ConfigView /></AnimatedRoute>} />
          {import.meta.env.DEV && <Route path="ui-preview" element={<AnimatedRoute><UIPreview /></AnimatedRoute>} />}
          <Route path="logs" element={<AnimatedRoute><LogView /></AnimatedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {isLoading ? <SessionRestoreView /> : isAuthenticated ? <AppRoutes /> : <LoginView />}
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function SessionRestoreView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090718] text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-purple-300" />
        <p className="text-sm font-semibold tracking-wide text-white/70">Restaurando sesion segura...</p>
      </div>
    </div>
  );
}

export default App;
