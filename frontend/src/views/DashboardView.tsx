import { useToast } from '../hooks/useToast';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOperationStore } from '../stores/useOperationStore';
import { useClientStore } from '../stores/useClientStore';
import { Filter, X, FileDown, Send, Plus, MoreVertical, Search } from 'lucide-react';
import NewOperationModal from '../components/modals/NewOperationModal';
import MasivoWAModal from '../components/modals/MasivoWAModal';
import { api } from '../services/api';
import { OperationService } from '../services/operationService';
import { LogService } from '../services/logService';
import { buildWaUrl, reemplazarVariables, DEFAULT_MSG_VENCIDO, DEFAULT_MSG_HOY, DEFAULT_MSG_RECORDATORIO } from '../utils/whatsapp';
import { PdfService } from '../services/pdfService';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Toolbar } from '../components/ui/Toolbar';
import { StateBlock } from '../components/ui/StateBlock';
import { CobranzaWorkbench } from '../components/cobranza/CobranzaWorkbench';
import { PortfolioMetricsStrip } from '../components/cobranza/PortfolioMetricsStrip';
import { CollectionActionBar } from '../components/cobranza/CollectionActionBar';
import { OperationInspector } from '../components/cobranza/OperationInspector';
import { OperationStatusBadge } from '../components/cobranza/OperationStatusBadge';
import { filterOperationsForWorkbench, type WorkbenchQueueFilter } from '../components/cobranza/operationWorkbench';
import { getVisibleSelectionState } from '../components/cobranza/selection';
import type { Operation, OperationEstatus } from '../types';

type OperationStatusFilter = OperationEstatus | 'TODOS';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toStatusFilter(value: string | string[]): OperationStatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  const allowed: OperationStatusFilter[] = [
    'TODOS',
    'VENCIDO',
    'HOY VENCE',
    'POR VENCER',
    'AL CORRIENTE',
    'PENDIENTE',
    'PAGADO',
    'EXCLUIDO',
  ];

  return allowed.includes(raw as OperationStatusFilter) ? raw as OperationStatusFilter : 'TODOS';
}

export default function DashboardView() {
  const {
    operations,
    archivedOperations,
    isLoading,
    isLoadingArchived,
    error: operationsError,
    fetchOperations,
    fetchArchivedOperations,
    filterStatus,
    setFilterStatus,
    markAsPaid,
    unmarkAsPaid,
    deleteOperation,
    archiveOperation,
    unarchiveOperation,
    toggleExclude,
  } = useOperationStore();
  const { fetchClients } = useClientStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'activas' | 'archivadas'>('activas');
  const [workbenchFilter, setWorkbenchFilter] = useState<WorkbenchQueueFilter>('all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('cliente') || '');
  const [asesor, setAsesor] = useState('Todos');
  const [isNewOpModalOpen, setIsNewOpModalOpen] = useState(false);
  const [isMasivoOpen, setIsMasivoOpen] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGeneratingMasivoPDF, setIsGeneratingMasivoPDF] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [sendingStatementIds, setSendingStatementIds] = useState<Set<string>>(new Set());
  const [inspectedOperationId, setInspectedOperationId] = useState<string | null>(null);

  useEffect(() => {
    fetchOperations();
    fetchArchivedOperations();
    fetchClients();
    api.get<Record<string, string>>('/config').then(setConfig).catch(() => {});
  }, [fetchOperations, fetchArchivedOperations, fetchClients]);

  const getStatus = useCallback((op: Operation) => op.calculatedStatus || op.estatus, []);

  const metrics = useMemo(() => {
    const total = operations.filter(op => !op.archived).length;
    const pendiente = operations.filter(op => ['PENDIENTE', 'POR VENCER', 'AL CORRIENTE'].includes(getStatus(op))).length;
    const hoy = operations.filter(op => getStatus(op) === 'HOY VENCE').length;
    const vencido = operations.filter(op => getStatus(op) === 'VENCIDO').length;
    const pagado = operations.filter(op => getStatus(op) === 'PAGADO').length;
    const montoTotal = operations.filter(op => getStatus(op) !== 'PAGADO' && getStatus(op) !== 'EXCLUIDO').reduce((acc, op) => acc + (op.monto || 0), 0);
    return { total, pendiente, hoy, vencido, pagado, montoTotal };
  }, [operations, getStatus]);

  const applyFilters = useCallback((list: Operation[]) => {
    let result = list;
    if (filterStatus !== 'TODOS') result = result.filter(op => getStatus(op) === filterStatus);
    if (asesor !== 'Todos') result = result.filter(op => (op.asesor || op.client?.asesor || '').toUpperCase().includes(asesor.toUpperCase()));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(op =>
        op.client?.nombre?.toLowerCase().includes(q) ||
        op.client?.rfc?.toLowerCase().includes(q) ||
        op.descripcion?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [asesor, filterStatus, getStatus, searchQuery]);

  const filteredOps = useMemo(() => applyFilters(operations), [applyFilters, operations]);
  const filteredArchivedOps = useMemo(() => applyFilters(archivedOperations), [applyFilters, archivedOperations]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const clearFilters = () => {
    setFilterStatus('TODOS');
    setWorkbenchFilter('all');
    setSearchQuery('');
    setAsesor('Todos');
    if (searchParams.has('cliente')) setSearchParams({});
  };

  /* ── Bulk actions ────────────────────────────────────────────────────── */

  const handleBulkPay = async () => {
    if (!confirm(`Marcar ${selectedVisibleIds.length} operaciones como pagadas?`)) return;
    for (const id of selectedVisibleIds) await markAsPaid(id);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Eliminar ${selectedVisibleIds.length} operaciones? Esta accion no se puede deshacer.`)) return;
    let errores = 0;
    for (const id of selectedVisibleIds) {
      try {
        await deleteOperation(id);
      } catch (e) {
        console.error('Error eliminando:', id, e);
        errores++;
      }
    }
    if (errores > 0) {
      toast('err', `Error al eliminar ${errores} operaciones`);
    }
    setSelectedIds(new Set());
  };

  const handleBulkArchive = async () => {
    const actionLabel = activeTab === 'activas' ? 'Archivar' : 'Restaurar';
    if (!confirm(`${actionLabel} ${selectedVisibleIds.length} operaciones?`)) return;
    for (const id of selectedVisibleIds) {
      if (activeTab === 'activas') await archiveOperation(id);
      else await unarchiveOperation(id);
    }
    setSelectedIds(new Set());
  };

  /* ── WhatsApp ────────────────────────────────────────────────────────── */

  const handleSendWA = (op: Operation) => {
    const status = getStatus(op);
    const templateKey = status === 'VENCIDO' ? 'plantilla_vencido' : status === 'HOY VENCE' ? 'plantilla_hoy' : 'plantilla_recordatorio';
    const defaultTemplate = status === 'VENCIDO' ? DEFAULT_MSG_VENCIDO : status === 'HOY VENCE' ? DEFAULT_MSG_HOY : DEFAULT_MSG_RECORDATORIO;
    let template = config[templateKey] || defaultTemplate;
    
    const clientOps = operations.filter(o => o.clientId === op.clientId && !o.fechaPago && !o.excluir);
    const totalCalc = clientOps.reduce((s, o) => s + (Number(o.monto) || 0), 0);
    const cantidadCalc = clientOps.length;
    const fmx = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
    
    if (!template.includes('{TOTAL}')) {
      if (status === 'VENCIDO') {
        template = template.replace(/saldo vencido de \*\{MONTO\}\*/g, `saldo total vencido de *${fmx(totalCalc)}* (${cantidadCalc} operaciones)`);
      } else if (status === 'HOY VENCE') {
        template = template.replace(/Saldo pendiente: \*\{MONTO\}\*/g, `Saldo pendiente: *${fmx(totalCalc)}* (${cantidadCalc} operaciones)`);
      } else {
        template = template.replace(/Saldo pendiente: \*\{MONTO\}\*/g, `Saldo pendiente: *${fmx(totalCalc)}* (${cantidadCalc} operaciones)`);
      }
    } else {
      template = template.replace(/{TOTAL}/g, fmx(totalCalc)).replace(/{CANTIDAD}/g, String(cantidadCalc));
    }
    
    const message = reemplazarVariables(template, op, config, clientOps);
    const modo = config.modo === 'PRODUCCION' || config.modo === 'PRODUCCIÓN' ? 'PRODUCCIÓN' : 'PRUEBA';
    const phone = modo === 'PRUEBA' ? (config.telPrueba || '') : (op.client?.telefono || '');
    if (!phone) { toast('warn', 'No hay telefono configurado'); return; }
    window.open(buildWaUrl(phone, message), '_blank');
    LogService.create({
      clientId: op.clientId, tipo: 'WHATSAPP',
      variante: status === 'VENCIDO' ? 'VENCIDO' : status === 'HOY VENCE' ? 'HOY VENCE' : 'RECORDATORIO',
      resultado: 'ENVIADO', mensaje: message.substring(0, 500), telefono: phone, modo,
    }).catch(() => {});
  };

  /* ── PDF & Statements ────────────────────────────────────────────────── */

  const asesores = useMemo(() =>
    ['Todos', ...Array.from(new Set(operations.map(op => op.asesor || op.client?.asesor).filter((a): a is string => !!a))).sort()],
    [operations]
  );

  const handleGeneratePDF = async (op: Operation) => {
    const client = op.client;
    if (!client) return;
    const clientOps = operations.filter(o => o.clientId === op.clientId);
    try {
      await PdfService.downloadPDF(client, clientOps, config);
    } catch (error: unknown) {
      if (getErrorMessage(error, 'Error') !== 'Cancelled') {
        toast('err', 'Error al generar PDF');
      }
    }
  };

  const handleSendStatement = async (op: Operation) => {
    if (sendingStatementIds.has(op.id)) return;
    setSendingStatementIds(prev => new Set(prev).add(op.id));
    try {
      const result = await OperationService.sendStatement(op.id, 'AUTO');
      if (result.channel === 'WHATSAPP' && result.success) {
        toast('ok', 'Estado de cuenta enviado por WhatsApp');
      } else if (result.channel === 'EMAIL' && result.success) {
        toast('ok', 'Estado de cuenta enviado por email');
      } else if (result.channel === 'MANUAL_FALLBACK') {
        toast('warn', 'Canales automaticos no disponibles. Se abrio fallback manual.');
        if (result.fallbackWaUrl) {
          window.open(result.fallbackWaUrl, '_blank');
        } else if (result.mediaUrl) {
          window.open(result.mediaUrl, '_blank');
        }
      }
    } catch (error: unknown) {
      toast('err', getErrorMessage(error, 'Error al enviar estado de cuenta'));
    } finally {
      setSendingStatementIds(prev => {
        const next = new Set(prev);
        next.delete(op.id);
        return next;
      });
    }
  };

  const findOperationById = useCallback((id: string) =>
    operations.find(op => op.id === id) || archivedOperations.find(op => op.id === id),
    [archivedOperations, operations],
  );

  const closeInspectorFor = useCallback((id: string) => {
    setInspectedOperationId(current => current === id ? null : current);
  }, []);

  const handleMarkPaid = useCallback(async (id: string) => {
    if (!confirm('Marcar como pagada?')) return;
    try {
      await markAsPaid(id);
      toast('ok', 'Operacion marcada como pagada');
    } catch {
      toast('err', 'Error al registrar pago');
    }
  }, [markAsPaid, toast]);

  const handleUnmarkPaid = useCallback(async (id: string) => {
    if (!confirm('Desmarcar pago?')) return;
    try {
      await unmarkAsPaid(id);
      toast('ok', 'Pago desmarcado');
    } catch {
      toast('err', 'Error al desmarcar pago');
    }
  }, [toast, unmarkAsPaid]);

  const handleArchive = useCallback(async (id: string) => {
    if (!confirm('Archivar?')) return;
    try {
      await archiveOperation(id);
      closeInspectorFor(id);
      toast('ok', 'Operacion archivada');
    } catch {
      toast('err', 'Error al archivar operacion');
    }
  }, [archiveOperation, closeInspectorFor, toast]);

  const handleUnarchive = useCallback(async (id: string) => {
    try {
      await unarchiveOperation(id);
      closeInspectorFor(id);
      toast('ok', 'Operacion restaurada correctamente');
      navigate('/');
    } catch {
      toast('err', 'Error al restaurar operacion');
    }
  }, [closeInspectorFor, navigate, toast, unarchiveOperation]);

  const handleToggleExclude = useCallback(async (id: string) => {
    const currentOperation = findOperationById(id);
    try {
      await toggleExclude(id);
      toast('ok', currentOperation?.excluir ? 'Operacion reactivada' : 'Operacion excluida');
    } catch {
      toast('err', 'Error al cambiar estado de exclusion');
    }
  }, [findOperationById, toast, toggleExclude]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Eliminar esta operacion?')) return;
    try {
      await deleteOperation(id);
      closeInspectorFor(id);
      toast('ok', 'Operacion eliminada');
    } catch {
      toast('err', 'Error al eliminar operacion');
    }
  }, [closeInspectorFor, deleteOperation, toast]);

  const handleMasivoPDF = async () => {
    const activeOps = operations.filter(op => 
      !op.archived && 
      getStatus(op) !== 'PAGADO' && 
      getStatus(op) !== 'EXCLUIDO' && 
      op.client?.estado !== 'SUSPENDIDO'
    );
    if (activeOps.length === 0) { toast('warn', 'No hay clientes con operaciones pendientes'); return; }
    setIsGeneratingMasivoPDF(true);
    try {
      const result = await PdfService.generateMasivoPDF(operations, config);
      toast('ok', `Se generaron ${result.generated} PDFs${result.failed > 0 ? `, ${result.failed} fallidos` : ''}`);
    } catch {
      toast('err', 'Error al generar PDFs');
    }
    setIsGeneratingMasivoPDF(false);
  };

  /* ── Derived state ───────────────────────────────────────────────────── */

  const baseDisplayOps = activeTab === 'activas' ? filteredOps : filteredArchivedOps;
  const displayOps = useMemo(
    () => filterOperationsForWorkbench(baseDisplayOps, workbenchFilter),
    [baseDisplayOps, workbenchFilter],
  );
  const isCurrentLoading = activeTab === 'activas' ? isLoading : isLoadingArchived;
  const { visibleIds, allVisibleSelected: isAllSelected } = getVisibleSelectionState(selectedIds, displayOps);
  const selectedVisibleIds = visibleIds.filter(id => selectedIds.has(id));
  const inspectedOperation = useMemo(() => {
    if (!inspectedOperationId) return null;
    return findOperationById(inspectedOperationId) || null;
  }, [findOperationById, inspectedOperationId]);
  const inspectedClientOperations = useMemo(() => {
    if (!inspectedOperation) return [];
    return operations.filter(op => op.clientId === inspectedOperation.clientId);
  }, [inspectedOperation, operations]);

  const statusOptions: Array<{ value: OperationStatusFilter; label: string }> = [
    { value: 'TODOS', label: 'Todos los estatus' },
    { value: 'VENCIDO', label: 'Vencido' },
    { value: 'HOY VENCE', label: 'Hoy Vence' },
    { value: 'POR VENCER', label: 'Por Vencer' },
    { value: 'AL CORRIENTE', label: 'Al Corriente' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'PAGADO', label: 'Pagado' },
    { value: 'EXCLUIDO', label: 'Excluido' },
  ];

  const allFiltersActive = filterStatus !== 'TODOS' || workbenchFilter !== 'all' || searchQuery !== '' || asesor !== 'Todos';

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-5">

      {/* Actions bar (mobile + desktop) */}
      <div className="flex items-center justify-between gap-3">
        <SegmentedControl
          value={activeTab}
          label="Tipo de operación"
          options={[
            { value: 'activas', label: 'Activas' },
            { value: 'archivadas', label: 'Archivadas', count: archivedOperations.length || undefined },
          ]}
          onChange={(v) => { setActiveTab(v); setWorkbenchFilter('all'); setSelectedIds(new Set()); }}
        />
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <Button size="sm" variant="blue" leftIcon={<FileDown size={14} />} onClick={handleMasivoPDF} disabled={isGeneratingMasivoPDF} loading={isGeneratingMasivoPDF}>
              PDF Masivo
            </Button>
            <Button size="sm" variant="orange" leftIcon={<Send size={14} />} onClick={() => setIsMasivoOpen(true)}>
              WA Masivo
            </Button>
            <Button size="sm" variant="primary" leftIcon={<Plus size={14} />} onClick={() => setIsNewOpModalOpen(true)}>
              Operación
            </Button>
          </div>
          <div className="relative md:hidden">
            <Button size="sm" variant="primary" leftIcon={<Plus size={14} />} onClick={() => setIsNewOpModalOpen(true)}>
              + Op
            </Button>
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="ml-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-raised)] p-2 hover:bg-[var(--c-surface)]"
            >
              <MoreVertical size={16} />
            </button>
            {showActionsDropdown && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-lg">
                <button
                  onClick={() => { handleMasivoPDF(); setShowActionsDropdown(false); }}
                  disabled={isGeneratingMasivoPDF}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--c-surface-raised)] disabled:opacity-50"
                >
                  <FileDown size={16} className="text-brand-info" /> PDF Masivo
                </button>
                <button
                  onClick={() => { setIsMasivoOpen(true); setShowActionsDropdown(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--c-surface-raised)]"
                >
                  <Send size={16} className="text-brand-warn" /> WA Masivo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio metrics strip */}
      {activeTab === 'activas' && (
        <PortfolioMetricsStrip
          metrics={metrics}
          activeFilter={filterStatus}
          onFilterChange={setFilterStatus}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Toolbar: filters + bulk actions */}
      <Toolbar
        label="Filtros de operaciones"
        leading={<Filter size={16} />}
        filters={
          <>
            <Select
              options={asesores.map(a => ({ value: a, label: a }))}
              value={asesor}
              onChange={(v) => setAsesor(v as string)}
              placeholder="Asesor"
              size="sm"
              className="w-40"
            />
            <Select
              options={statusOptions}
              value={filterStatus}
              onChange={(value) => setFilterStatus(toStatusFilter(value))}
              size="sm"
              className="w-40"
            />
            <Input
              placeholder="RFC / Cliente / Concepto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="sm"
              className="w-56"
              leftIcon={<Search size={14} />}
            />
            {allFiltersActive && (
              <Button size="sm" variant="ghost" onClick={clearFilters} leftIcon={<X size={14} />}>
                Limpiar
              </Button>
            )}
          </>
        }
        selectedCount={selectedVisibleIds.length}
        bulkActions={
          <>
            <Button size="sm" variant="green" onClick={handleBulkPay}>Marcar pagado</Button>
            <Button size="sm" variant="gray" onClick={handleBulkArchive}>
              {activeTab === 'activas' ? 'Archivar' : 'Restaurar'}
            </Button>
            <Button size="sm" variant="red" onClick={handleBulkDelete}>Eliminar</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Cancelar</Button>
          </>
        }
      />

      {/* Operations workbench + table */}
      <CobranzaWorkbench
        operations={baseDisplayOps}
        activeFilter={workbenchFilter}
        onFilterChange={(filter) => {
          setWorkbenchFilter(filter);
          setSelectedIds(new Set());
        }}
        onInspect={(operation) => setInspectedOperationId(operation.id)}
        formatCurrency={formatCurrency}
        isLoading={isCurrentLoading}
        error={operationsError}
      >
      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-sm">
        {operationsError ? (
          <StateBlock
            state="error"
            title="No se pudo cargar cartera"
            description={operationsError}
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void (activeTab === 'activas' ? fetchOperations() : fetchArchivedOperations());
                }}
              >
                Reintentar
              </Button>
            }
            className="py-16"
          />
        ) : isCurrentLoading ? (
          <StateBlock state="loading" title="Cargando operaciones…" className="py-16" />
        ) : displayOps.length === 0 ? (
          <StateBlock
            state="empty"
            title={allFiltersActive ? 'Sin resultados' : 'No hay operaciones'}
            description={allFiltersActive
              ? 'No se encontraron operaciones con los filtros aplicados'
              : 'Crea tu primera operación para comenzar a gestionar cobranza'}
            action={
              <Button
                size="sm"
                variant={allFiltersActive ? 'ghost' : 'primary'}
                onClick={allFiltersActive ? clearFilters : () => setIsNewOpModalOpen(true)}
              >
                {allFiltersActive ? 'Limpiar Filtros' : '+ Nueva Operación'}
              </Button>
            }
            className="py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left">
              <thead>
                <tr className="border-b border-[var(--c-border)] bg-[var(--c-surface-raised)]">
                  <th className="w-10 px-3 py-3.5">
                    <input
                      type="checkbox"
                      className="rounded border-[var(--c-border)]"
                      checked={isAllSelected}
                      onChange={(e) => {
                        setSelectedIds((current) => {
                          const next = new Set(current);
                          if (e.target.checked) visibleIds.forEach(id => next.add(id));
                          else visibleIds.forEach(id => next.delete(id));
                          return next;
                        });
                      }}
                    />
                  </th>
                  {['Asesor', 'Cliente', 'RFC', 'Teléfono', 'Email', 'Concepto', 'Monto', 'F. Reg.', 'Vencimiento', 'Días', 'Estatus', 'Acciones'].map(h => (
                    <th key={h} className={`px-4 py-3.5 text-[10px] font-black uppercase tracking-widest ${h === 'Acciones' ? 'text-right' : ''} ${h === 'Monto' ? 'text-[var(--brand-gold)]' : 'text-[var(--c-text-muted)]'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayOps.map((op, idx) => {
                  const status = getStatus(op);
                  const diasDiff = op.diasRestantes ?? Math.ceil((new Date(op.fechaVence).getTime() - Date.now()) / 86400000);
                  const diasText = diasDiff === 0 ? 'Hoy' : diasDiff < 0 ? `+${Math.abs(diasDiff)}d` : `${diasDiff}d`;
                  const diasColor = diasDiff < 0 ? 'var(--brand-danger)' : diasDiff === 0 ? 'var(--brand-warn)' : 'var(--brand-info)';
                  const rowBase = selectedIds.has(op.id) ? 'rgba(59,79,232,0.06)' : idx % 2 === 0 ? 'transparent' : 'var(--c-surface-raised)';

                  return (
                    <motion.tr
                      key={op.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: idx * 0.02 }}
                      className="border-b border-[var(--c-border-subtle)] transition-colors duration-150"
                      style={{ background: rowBase }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,79,232,0.04)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = rowBase; }}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-[var(--c-border)]"
                          checked={selectedIds.has(op.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(op.id); else next.delete(op.id);
                            setSelectedIds(next);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold tracking-wider text-[var(--c-text-muted)]">
                        {op.asesor || op.client?.asesor || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-[var(--c-text)]">
                        {op.client?.nombre || 'General'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--c-text-2)]">
                        {op.client?.rfc || 'S/N'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--c-text-2)]">
                        {op.client?.telefono || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--c-text-2)]">
                        {op.client?.email || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold uppercase text-[var(--c-text-2)]">
                        {op.descripcion || op.tipo}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-black text-[var(--brand-gold)]">
                        {formatCurrency(op.monto || 0)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold uppercase text-[var(--c-text-muted)]">
                        {op.createdAt ? new Date(op.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold uppercase text-[var(--c-text-muted)]">
                        {op.fechaVence ? new Date(op.fechaVence).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-black" style={{ color: diasColor }}>
                        {diasText}
                      </td>
                      <td className="px-4 py-3">
                        <OperationStatusBadge operation={op} status={status} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <CollectionActionBar
                          operation={op}
                          status={status}
                          activeTab={activeTab}
                          sendingStatement={sendingStatementIds.has(op.id)}
                          onInspect={(operation) => setInspectedOperationId(operation.id)}
                          onMarkPaid={handleMarkPaid}
                          onUnmarkPaid={handleUnmarkPaid}
                          onSendWA={handleSendWA}
                          onGeneratePDF={handleGeneratePDF}
                          onSendStatement={handleSendStatement}
                          onArchive={handleArchive}
                          onUnarchive={handleUnarchive}
                          onToggleExclude={handleToggleExclude}
                          onDelete={handleDelete}
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </CobranzaWorkbench>

      <NewOperationModal isOpen={isNewOpModalOpen} onClose={() => setIsNewOpModalOpen(false)} />
      <MasivoWAModal isOpen={isMasivoOpen} onClose={() => setIsMasivoOpen(false)} operations={operations.filter(op => !op.archived)} config={config} />
      <OperationInspector
        operation={inspectedOperation}
        open={!!inspectedOperation}
        activeTab={activeTab}
        sendingStatement={inspectedOperation ? sendingStatementIds.has(inspectedOperation.id) : false}
        clientOperations={inspectedClientOperations}
        onClose={() => setInspectedOperationId(null)}
        onMarkPaid={handleMarkPaid}
        onUnmarkPaid={handleUnmarkPaid}
        onSendWA={handleSendWA}
        onGeneratePDF={handleGeneratePDF}
        onSendStatement={handleSendStatement}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onToggleExclude={handleToggleExclude}
        onDelete={handleDelete}
      />
    </div>
  );
}
