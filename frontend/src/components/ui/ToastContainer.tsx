import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Toast, ToastType } from '../../hooks/useToast';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

const TOAST_STYLE: Record<ToastType, { bg: string; color: string; border: string; icon: React.ReactNode }> = {
  ok:   { bg: 'rgba(16,183,125,0.15)',  color: '#10B77D', border: 'rgba(16,183,125,0.30)', icon: <CheckCircle2 size={18} /> },
  err:  { bg: 'rgba(239,63,63,0.15)',   color: '#EF3F3F', border: 'rgba(239,63,63,0.30)', icon: <AlertCircle size={18} /> },
  warn: { bg: 'rgba(245,158,11,0.15)',  color: '#D97706', border: 'rgba(245,158,11,0.30)', icon: <AlertTriangle size={18} /> },
};

const toastVariants = {
  hidden: { 
    opacity: 0, 
    x: 50, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  },
  exit: { 
    opacity: 0, 
    x: 30, 
    scale: 0.9,
    transition: {
      duration: 0.15,
    },
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const [showDetails, setShowDetails] = useState(false);
  const s = TOAST_STYLE[toast.type];
  const hasDetails = toast.type === 'err' && toast.details;

  return (
    <motion.div
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="px-4 py-3 rounded-xl text-sm font-semibold backdrop-blur-md flex flex-col min-w-[280px]"
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-3">
        <motion.span 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
        >
          {s.icon}
        </motion.span>
        <span className="flex-1">{toast.message}</span>
        {hasDetails && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs underline hover:no-underline opacity-70"
            style={{ color: s.color }}
          >
            {showDetails ? 'Ocultar' : 'Ver detalles'}
          </button>
        )}
      </div>
      <AnimatePresence>
        {showDetails && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-t overflow-hidden"
            style={{ borderColor: s.border }}
          >
            <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: s.color }}>
              {toast.details}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
