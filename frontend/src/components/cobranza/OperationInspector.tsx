import {
  Archive,
  Ban,
  CalendarDays,
  CheckCircle2,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
  Send,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react';
import { ActionButton } from '../ui/ActionButton';
import { Button } from '../ui/Button';
import { SidePanel } from '../ui/SidePanel';
import { StatusBadge } from '../ui/StatusBadge';
import type { Operation } from '../../types';
import { getClientOpenBalance, getOperationDays, getOperationPriority, getOperationStatus } from './operationWorkbench';

export interface OperationInspectorProps {
  operation: Operation | null;
  open: boolean;
  activeTab: 'activas' | 'archivadas';
  sendingStatement: boolean;
  clientOperations: Operation[];
  onClose: () => void;
  onMarkPaid: (id: string) => void;
  onUnmarkPaid: (id: string) => void;
  onSendWA: (operation: Operation) => void;
  onGeneratePDF: (operation: Operation) => void;
  onSendStatement: (operation: Operation) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onToggleExclude: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha invalida';
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--c-border-subtle)] py-2 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text-muted)]">{label}</span>
      <span className="max-w-[13rem] text-right text-sm font-semibold text-[var(--c-text)]">{value}</span>
    </div>
  );
}

export function OperationInspector({
  operation,
  open,
  activeTab,
  sendingStatement,
  clientOperations,
  onClose,
  onMarkPaid,
  onUnmarkPaid,
  onSendWA,
  onGeneratePDF,
  onSendStatement,
  onArchive,
  onUnarchive,
  onToggleExclude,
  onDelete,
}: OperationInspectorProps) {
  if (!operation) return null;

  const client = operation.client;
  const status = getOperationStatus(operation);
  const days = getOperationDays(operation);
  const priority = getOperationPriority(operation);
  const balance = getClientOpenBalance(clientOperations);
  const hasPhone = !!client?.telefono;
  const hasEmail = !!client?.email;
  const isPaid = status === 'PAGADO' || !!operation.fechaPago;
  const daysLabel = days === null
    ? 'Sin dato'
    : days === 0
      ? 'Hoy'
      : days < 0
        ? `${Math.abs(days)} dias vencida`
        : `${days} dias`;

  return (
    <SidePanel
      title={client?.nombre || 'Operacion sin cliente'}
      subtitle={operation.descripcion || operation.tipo}
      open={open}
      onClose={onClose}
      size="lg"
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          {isPaid ? (
            <ActionButton
              label="Desmarcar pago"
              icon={<RotateCcw size={14} />}
              tone="neutral"
              size="sm"
              onClick={() => onUnmarkPaid(operation.id)}
            />
          ) : (
            <ActionButton
              label="Registrar pago"
              icon={<CheckCircle2 size={14} />}
              tone="success"
              size="sm"
              onClick={() => onMarkPaid(operation.id)}
            />
          )}
        </>
      }
    >
      <div className="space-y-4">
        <section className="rounded-md border border-[var(--c-border-subtle)] bg-[var(--c-surface-raised)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={status} status={status} size="md" />
            <StatusBadge label={priority.label} tone={priority.tone} size="md" />
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--c-text-2)]">{priority.reason}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text-muted)]">Monto</span>
              <p className="mt-1 font-mono text-xl font-black text-[var(--brand-gold)]">{formatCurrency(operation.monto || 0)}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text-muted)]">Dias</span>
              <p className="mt-1 text-xl font-black text-[var(--c-text)]">{daysLabel}</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-[var(--c-border-subtle)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--c-text)]">
            <UserRound size={16} />
            Cliente
          </div>
          <FieldRow label="RFC" value={client?.rfc || 'S/N'} />
          <FieldRow label="Asesor" value={operation.asesor || client?.asesor || 'Sin asignar'} />
          <FieldRow label="Telefono" value={client?.telefono || 'Falta telefono'} />
          <FieldRow label="Email" value={client?.email || 'Falta email'} />
        </section>

        <section className="rounded-md border border-[var(--c-border-subtle)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--c-text)]">
            <Wallet size={16} />
            Saldo del cliente
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-[var(--c-surface-raised)] p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text-muted)]">Abiertas</span>
              <p className="mt-1 text-2xl font-black text-[var(--c-text)]">{balance.count}</p>
            </div>
            <div className="rounded-md bg-[var(--c-surface-raised)] p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text-muted)]">Total</span>
              <p className="mt-1 font-mono text-lg font-black text-[var(--brand-gold)]">{formatCurrency(balance.total)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-[var(--c-border-subtle)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--c-text)]">
            <CalendarDays size={16} />
            Operacion
          </div>
          <FieldRow label="Tipo" value={operation.tipo || 'Sin tipo'} />
          <FieldRow label="Registro" value={formatDate(operation.createdAt)} />
          <FieldRow label="Vence" value={formatDate(operation.fechaVence)} />
          <FieldRow label="Archivo" value={operation.archived ? 'Archivada' : 'Activa'} />
        </section>

        <section className="rounded-md border border-[var(--c-border-subtle)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--c-text)]">
            <Send size={16} />
            Acciones de cobranza
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ActionButton
              label="WhatsApp"
              icon={<MessageCircle size={14} />}
              tone="success"
              variant="outline"
              disabled={!hasPhone}
              disabledReason={!hasPhone ? 'Falta telefono del cliente' : undefined}
              onClick={() => onSendWA(operation)}
            />
            <ActionButton
              label="PDF"
              icon={<FileText size={14} />}
              tone="info"
              variant="outline"
              onClick={() => onGeneratePDF(operation)}
            />
            <ActionButton
              label="Estado de cuenta"
              icon={<Send size={14} />}
              tone="warning"
              variant="outline"
              loading={sendingStatement}
              disabled={sendingStatement}
              disabledReason={sendingStatement ? 'Ya se esta enviando el estado de cuenta' : undefined}
              onClick={() => onSendStatement(operation)}
            />
            {activeTab === 'activas' ? (
              <ActionButton
                label="Archivar"
                icon={<Archive size={14} />}
                tone="neutral"
                variant="outline"
                onClick={() => onArchive(operation.id)}
              />
            ) : (
              <ActionButton
                label="Restaurar"
                icon={<RotateCcw size={14} />}
                tone="neutral"
                variant="outline"
                onClick={() => onUnarchive(operation.id)}
              />
            )}
            <ActionButton
              label={operation.excluir ? 'Reactivar' : 'Excluir'}
              icon={<Ban size={14} />}
              tone={operation.excluir ? 'info' : 'neutral'}
              variant="outline"
              pressed={operation.excluir}
              onClick={() => onToggleExclude(operation.id)}
            />
            <ActionButton
              label="Eliminar"
              icon={<Trash2 size={14} />}
              tone="danger"
              variant="outline"
              onClick={() => onDelete(operation.id)}
            />
          </div>
        </section>

        <section className="rounded-md border border-[var(--c-border-subtle)] p-4">
          <div className="mb-3 text-sm font-bold text-[var(--c-text)]">Canales</div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={hasPhone ? 'WhatsApp listo' : 'Falta telefono'}
              tone={hasPhone ? 'success' : 'warning'}
              icon={<Phone size={12} />}
            />
            <StatusBadge
              label={hasEmail ? 'Email listo' : 'Falta email'}
              tone={hasEmail ? 'success' : 'warning'}
              icon={<Mail size={12} />}
            />
          </div>
        </section>
      </div>
    </SidePanel>
  );
}

