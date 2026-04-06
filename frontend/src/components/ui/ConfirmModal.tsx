import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } finally {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="text-center">
        <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
          variant === 'danger' ? 'bg-red-100' : 'bg-orange-100'
        }`}>
          <AlertTriangle 
            size={24} 
            className={variant === 'danger' ? 'text-red-500' : 'text-orange-500'} 
          />
        </div>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <Button 
            variant="gray" 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'red' : 'orange'}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Procesando...
              </span>
            ) : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
