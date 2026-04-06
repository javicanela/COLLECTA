import { useState, useCallback } from 'react';

export type ToastType = 'ok' | 'err' | 'warn';
export interface Toast { 
  id: string; 
  type: ToastType; 
  message: string; 
  details?: string;
}

const MAX_TOASTS = 3;
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  ok: 3000,
  err: 5000,
  warn: 4000,
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string, details?: string) => {
    const id = crypto.randomUUID();
    const duration = DEFAULT_DURATIONS[type];
    
    setToasts(prev => {
      const updated = [...prev, { id, type, message, details }];
      if (updated.length > MAX_TOASTS) {
        return updated.slice(-MAX_TOASTS);
      }
      return updated;
    });

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return { toasts, toast };
}
