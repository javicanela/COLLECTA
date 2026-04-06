import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  fullscreen: 'max-w-[95vw] h-[90vh]',
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'spring' as const, duration: 0.3, bounce: 0.25 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: { duration: 0.15 }
  },
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose();
    }
    
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 50);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'var(--c-overlay)', backdropFilter: 'blur(6px)' }}
          onClick={handleOverlayClick}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          <motion.div
            ref={modalRef}
            className={`glass-heavy w-full ${sizeClasses[size]} overflow-hidden rounded-2xl flex flex-col max-h-[90vh] ${className}`}
            style={{ 
              background: 'var(--c-surface)',
              boxShadow: 'var(--c-shadow-lg)',
            }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {(title || showCloseButton) && (
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ 
                  borderBottom: '1px solid var(--c-border)', 
                  background: 'var(--c-surface-raised)' 
                }}
              >
                {title ? (
                  <h3
                    id="modal-title"
                    className="text-base font-bold"
                    style={{ color: 'var(--c-text)' }}
                  >
                    {title}
                  </h3>
                ) : (
                  <div />
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
                    style={{ color: 'var(--c-text-muted)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--c-surface-raised)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            <div className="p-5 overflow-y-auto flex-1">
              {children}
            </div>
            {footer && (
              <div
                className="px-5 py-4 flex-shrink-0 flex items-center justify-end gap-3"
                style={{ 
                  borderTop: '1px solid var(--c-border)', 
                  background: 'var(--c-surface-raised)' 
                }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, className = '' }) => (
  <div className={`px-5 py-4 border-b border-[var(--c-border)] bg-[var(--c-surface-raised)] ${className}`}>
    {children}
  </div>
);

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className = '' }) => (
  <div className={`p-5 overflow-y-auto flex-1 ${className}`}>
    {children}
  </div>
);

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '' }) => (
  <div 
    className={`px-5 py-4 border-t border-[var(--c-border)] bg-[var(--c-surface-raised)] flex items-center justify-end gap-3 ${className}`}
  >
    {children}
  </div>
);

export default Modal;
