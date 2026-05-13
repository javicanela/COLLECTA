import { CheckCircle2, MessageCircle, FileText, Ban, Archive, Trash2, RotateCcw, Send, Eye } from 'lucide-react';
import { ActionButton } from '../ui/ActionButton';
import type { Operation } from '../../types';

export interface CollectionActionBarProps {
  operation: Operation;
  status: string;
  activeTab: 'activas' | 'archivadas';
  sendingStatement: boolean;
  onInspect: (op: Operation) => void;
  onMarkPaid: (id: string) => void;
  onUnmarkPaid: (id: string) => void;
  onSendWA: (op: Operation) => void;
  onGeneratePDF: (op: Operation) => void;
  onSendStatement: (op: Operation) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onToggleExclude: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CollectionActionBar({
  operation,
  status,
  activeTab,
  sendingStatement,
  onInspect,
  onMarkPaid,
  onUnmarkPaid,
  onSendWA,
  onGeneratePDF,
  onSendStatement,
  onArchive,
  onUnarchive,
  onToggleExclude,
  onDelete,
}: CollectionActionBarProps) {
  const hasPhone = !!operation.client?.telefono;

  return (
    <div className="flex items-center justify-end gap-1">
      <ActionButton
        label="Ver detalle"
        icon={<Eye size={13} />}
        tone="primary"
        variant="ghost"
        size="xs"
        iconOnly
        onClick={() => onInspect(operation)}
      />

      {status === 'PAGADO' ? (
        <ActionButton
          label="Desmarcar pago"
          icon={<RotateCcw size={13} />}
          tone="neutral"
          variant="ghost"
          size="xs"
          iconOnly
          onClick={() => onUnmarkPaid(operation.id)}
        />
      ) : (
        <ActionButton
          label="Registrar pago"
          icon={<CheckCircle2 size={13} />}
          tone="success"
          size="xs"
          iconOnly
          onClick={() => onMarkPaid(operation.id)}
        />
      )}

      <ActionButton
        label="WhatsApp"
        icon={<MessageCircle size={13} />}
        tone="success"
        variant="ghost"
        size="xs"
        iconOnly
        disabled={!hasPhone}
        disabledReason={!hasPhone ? 'Falta telefono del cliente' : undefined}
        onClick={() => onSendWA(operation)}
      />

      <ActionButton
        label="PDF"
        icon={<FileText size={13} />}
        tone="info"
        variant="ghost"
        size="xs"
        iconOnly
        onClick={() => onGeneratePDF(operation)}
      />

      <ActionButton
        label="Enviar estado de cuenta"
        icon={<Send size={13} />}
        tone="warning"
        variant="ghost"
        size="xs"
        iconOnly
        loading={sendingStatement}
        disabled={sendingStatement}
        disabledReason={sendingStatement ? 'Ya se esta enviando el estado de cuenta' : undefined}
        onClick={() => onSendStatement(operation)}
      />

      {activeTab === 'activas' ? (
        <ActionButton
          label="Archivar"
          icon={<Archive size={13} />}
          tone="neutral"
          variant="ghost"
          size="xs"
          iconOnly
          onClick={() => onArchive(operation.id)}
        />
      ) : (
        <ActionButton
          label="Desarchivar"
          icon={<RotateCcw size={13} />}
          tone="neutral"
          variant="ghost"
          size="xs"
          iconOnly
          onClick={() => onUnarchive(operation.id)}
        />
      )}

      <ActionButton
        label={operation.excluir ? 'Reactivar' : 'Excluir'}
        icon={<Ban size={13} />}
        tone={operation.excluir ? 'info' : 'neutral'}
        variant="ghost"
        size="xs"
        iconOnly
        pressed={!!operation.excluir}
        onClick={() => onToggleExclude(operation.id)}
      />

      <ActionButton
        label="Eliminar"
        icon={<Trash2 size={13} />}
        tone="danger"
        variant="ghost"
        size="xs"
        iconOnly
        onClick={() => onDelete(operation.id)}
      />
    </div>
  );
}
