import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ui/ToastContainer';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOperationStore } from '../stores/useOperationStore';
import { useClientStore } from '../stores/useClientStore';
import Topbar from '../components/Topbar';
import { CheckCircle2, MessageCircle, FileText, Ban, Archive, Trash2, RotateCcw, DollarSign, AlertTriangle, Clock, Check, Wallet, Filter, X, FileDown, Send, Plus, FolderOpen, MoreVertical } from 'lucide-react';
import NewOperationModal from '../components/modals/NewOperationModal';
import MasivoWAModal from '../components/modals/MasivoWAModal';
import { api } from '../services/api';
import { LogService } from '../services/logService';
import { buildWaUrl, reemplazarVariables, DEFAULT_MSG_VENCIDO, DEFAULT_MSG_HOY, DEFAULT_MSG_RECORDATORIO } from '../utils/whatsapp';
import { PdfService } from '../services/pdfService';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { SkeletonTable } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export default function DashboardView() {
  const {
    operations,
    archivedOperations,
    isLoading,
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
  const { toasts, toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'activas' | 'archivadas'>('activas');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('cliente') || '');
  const [asesor, setAsesor] = useState('Todos');
  const [isNewOpModalOpen, setIsNewOpModalOpen] = useState(false);
  const [isMasivoOpen, setIsMasivoOpen] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGeneratingMasivoPDF, setIsGeneratingMasivoPDF] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  useEffect(() => {
    fetchOperations();
    fetchArchivedOperations();
    fetchClients();
    api.get<Record<string, string>>('/config').then(setConfig).catch(() => {});
  }, [fetchOperations, fetchArchivedOperations, fetchClients]);

  const getStatus = (op: typeof operations[0]) => op.calculatedStatus || op.estatus;

  const metrics = useMemo(() => {
    const pendiente = operations.filter(op => ['PENDIENTE', 'POR VENCER', 'AL CORRIENTE'].includes(getStatus(op))).length;
    const hoy = operations.filter(op => getStatus(op) === 'HOY VENCE').length;
    const vencido = operations.filter(op => getStatus(op) === 'VENCIDO').length;
    const montoTotal = operations.filter(op => getStatus(op) !== 'PAGADO' && getStatus(op) !== 'EXCLUIDO').reduce((acc, op) => acc + (op.monto || 0), 0);
    return { pendiente, hoy, vencido, montoTotal };
  }, [operations]);

  const applyFilters = (list: typeof operations) => {
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
  };

  const filteredOps = useMemo(() => applyFilters(operations), [operations, filterStatus, searchQuery, asesor]);
  const filteredArchivedOps = useMemo(() => applyFilters(archivedOperations), [archivedOperations, filterStatus, searchQuery, asesor]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const clearFilters = () => {
    setFilterStatus('TODOS');
    setSearchQuery('');
    setAsesor('Todos');
    if (searchParams.has('cliente')) setSearchParams({});
  };

  const handleBulkPay = async () => {
    if (!confirm(`Marcar ${selectedIds.size} operaciones como pagadas?`)) return;
    for (const id of selectedIds) await markAsPaid(id);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Eliminar ${selectedIds.size} operaciones? Esta acción no se puede deshacer.`)) return;
    let errores = 0;
    for (const id of selectedIds) {
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
    if (!confirm(`Archivar ${selectedIds.size} operaciones?`)) return;
    for (const id of selectedIds) await archiveOperation(id);
    setSelectedIds(new Set());
  };

  const handleSendWA = (op: typeof operations[0]) => {
    const status = getStatus(op);
    const templateKey = status === 'VENCIDO' ? 'plantilla_vencido' : status === 'HOY VENCE' ? 'plantilla_hoy' : 'plantilla_recordatorio';
    const defaultTemplate = status === 'VENCIDO' ? DEFAULT_MSG_VENCIDO : status === 'HOY VENCE' ? DEFAULT_MSG_HOY : DEFAULT_MSG_RECORDATORIO;
    let template = config[templateKey] || defaultTemplate;
    
    const clientOps = operations.filter(o => o.clientId === op.clientId && !o.fechaPago && !o.excluir);
    const totalCalc = clientOps.reduce((s, o) => s + (Number(o.monto) || 0), 0);
    const cantidadCalc = clientOps.length;
    const fmx = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
    
    // Si la plantilla guardada no tiene {TOTAL}, forzamos el reemplazo manual del monto por el total
    if (!template.includes('{TOTAL}')) {
      if (status === 'VENCIDO') {
        template = template.replace(/saldo vencido de \*\{MONTO\}\*/g, `saldo total vencido de *${fmx(totalCalc)}* (${cantidadCalc} operaciones)`);
      } else if (status === 'HOY VENCE') {
        template = template.replace(/Saldo pendiente: \*\{MONTO\}\*/g, `Saldo pendiente: *${fmx(totalCalc)}* (${cantidadCalc} operaciones)`);
      } else {
        template = template.replace(/Saldo pendiente: \*\{MONTO\}\*/g, `Saldo pendiente: *${fmx(totalCalc)}* (${cantidadCalc} operaciones)`);
      }
    } else {
      // Si tiene {TOTAL}, reemplazarlo
      template = template.replace(/{TOTAL}/g, fmx(totalCalc)).replace(/{CANTIDAD}/g, String(cantidadCalc));
    }
    
    const message = reemplazarVariables(template, op, config, clientOps);
    const modo = config.modo || 'PRUEBA';
    const phone = modo === 'PRUEBA' ? (config.telPrueba || '') : (op.client?.telefono || '');
    if (!phone) { toast('warn', 'No hay teléfono configurado'); return; }
    window.open(buildWaUrl(phone, message), '_blank');
    LogService.create({
      clientId: op.clientId, tipo: 'WHATSAPP',
      variante: status === 'VENCIDO' ? 'VENCIDO' : status === 'HOY VENCE' ? 'HOY VENCE' : 'RECORDATORIO',
      resultado: 'ENVIADO', mensaje: message.substring(0, 500), telefono: phone, modo: modo as any,
    }).catch(() => {});
  };

  const asesores = useMemo(() =>
    ['Todos', ...Array.from(new Set(operations.map(op => op.asesor || op.client?.asesor).filter((a): a is string => !!a))).sort()],
    [operations]
  );

  const handleGeneratePDF = async (op: typeof operations[0]) => {
    const client = op.client;
    if (!client) return;
    const clientOps = operations.filter(o => o.clientId === op.clientId);
    try {
      await PdfService.downloadPDF(client, clientOps, config);
    } catch (e: any) {
      if (e.message !== 'Cancelled') {
        toast('err', 'Error al generar PDF');
      }
    }
  };

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

  const COL_COUNT = 12;

  const displayOps = activeTab === 'activas' ? filteredOps : filteredArchivedOps;
  const isAllSelected = filteredOps.length > 0 && selectedIds.size === filteredOps.length;

  const statusOptions = [
    { value: 'TODOS', label: 'Todos los estatus' },
    { value: 'VENCIDO', label: 'Vencido' },
    { value: 'HOY VENCE', label: 'Hoy Vence' },
    { value: 'POR VENCER', label: 'Por Vencer' },
    { value: 'AL CORRIENTE', label: 'Al Corriente' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'PAGADO', label: 'Pagado' },
    { value: 'EXCLUIDO', label: 'Excluido' },
  ];

  const allFiltersActive = filterStatus !== 'TODOS' || searchQuery !== '' || asesor !== 'Todos';

  return (
    <>
      <Topbar
        title="Operaciones"
        subtitle="Motor diario de cobranza"
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Button
                size="sm"
                variant="blue"
                leftIcon={<FileDown size={14} />}
                onClick={handleMasivoPDF}
                disabled={isGeneratingMasivoPDF}
                loading={isGeneratingMasivoPDF}
              >
                PDF Masivo
              </Button>
              <Button
                size="sm"
                variant="orange"
                leftIcon={<Send size={14} />}
                onClick={() => setIsMasivoOpen(true)}
              >
                WA Masivo
              </Button>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus size={14} />}
                onClick={() => setIsNewOpModalOpen(true)}
              >
                Operación
              </Button>
            </div>
            <div className="md:hidden relative">
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus size={14} />}
                onClick={() => setIsNewOpModalOpen(true)}
              >
                + Op
              </Button>
              <button
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                className="ml-1 p-2 rounded-lg bg-[var(--c-surface-raised)] border border-[var(--c-border)] hover:bg-[var(--c-surface)]"
              >
                <MoreVertical size={16} />
              </button>
              {showActionsDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => { handleMasivoPDF(); setShowActionsDropdown(false); }}
                    disabled={isGeneratingMasivoPDF}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--c-surface-raised)] disabled:opacity-50"
                  >
                    <FileDown size={16} className="text-brand-info" />
                    PDF Masivo
                  </button>
                  <button
                    onClick={() => { setIsMasivoOpen(true); setShowActionsDropdown(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--c-surface-raised)]"
                  >
                    <Send size={16} className="text-brand-warn" />
                    WA Masivo
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      />

      <div className="p-5 max-w-[1600px] mx-auto w-full flex flex-col gap-5">

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl w-fit">
          {(['activas', 'archivadas'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2
                ${activeTab === tab 
                  ? 'bg-[var(--brand-primary)] text-white shadow-md' 
                  : 'text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface-raised)]'
                }
              `}
            >
              {tab === 'activas' ? 'Activas' : 'Archivadas'}
              {tab === 'archivadas' && archivedOperations.length > 0 && (
                <span className={`
                  text-[10px] font-bold px-1.5 py-0.5 rounded-full
                  ${activeTab === tab 
                    ? 'bg-white/20 text-white' 
                    : 'bg-[var(--c-surface-raised)] text-[var(--c-text-muted)]'
                  }
                `}>
                  {archivedOperations.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        {activeTab === 'activas' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card 
              variant="glass" 
              padding="sm" 
              className={`
                cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg
                ${filterStatus === 'TODOS' ? 'ring-2 ring-[var(--brand-primary)] ring-opacity-50' : ''}
              `}
              onClick={() => setFilterStatus('TODOS')}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-[var(--brand-primary-dim)]">
                  <Clock size={12} className="text-[var(--brand-primary)]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--c-text-muted)]">Total</span>
              </div>
              <p className="text-3xl font-black text-[var(--c-text)]">{operations.filter(op => !op.archived).length}</p>
              <p className="text-[10px] mt-1 text-[var(--c-text-muted)]">operaciones</p>
            </Card>

            <Card 
              variant="glass" 
              padding="sm" 
              className={`
                cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg
                ${filterStatus === 'VENCIDO' ? 'ring-2 ring-[var(--brand-danger)] ring-opacity-50' : ''}
              `}
              onClick={() => setFilterStatus('VENCIDO')}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-red-100">
                  <AlertTriangle size={12} className="text-[var(--brand-danger)]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-danger)]">Vencidos</span>
              </div>
              <p className="text-3xl font-black text-[var(--brand-danger)]">{metrics.vencido}</p>
            </Card>

            <Card 
              variant="glass" 
              padding="sm" 
              className={`
                cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg
                ${filterStatus === 'HOY VENCE' ? 'ring-2 ring-[var(--brand-warn)] ring-opacity-50' : ''}
              `}
              onClick={() => setFilterStatus('HOY VENCE')}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-100">
                  <Clock size={12} className="text-[var(--brand-warn)]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-warn)]">Hoy Vence</span>
              </div>
              <p className="text-3xl font-black text-[var(--brand-warn)]">{metrics.hoy}</p>
            </Card>

            <Card 
              variant="glass" 
              padding="sm" 
              className={`
                cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg
                ${filterStatus === 'PENDIENTE' ? 'ring-2 ring-[var(--brand-info)] ring-opacity-50' : ''}
              `}
              onClick={() => setFilterStatus('PENDIENTE')}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-100">
                  <DollarSign size={12} className="text-[var(--brand-info)]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-info)]">Pendientes</span>
              </div>
              <p className="text-3xl font-black text-[var(--brand-info)]">{metrics.pendiente}</p>
            </Card>

            <Card 
              variant="glass" 
              padding="sm" 
              className="cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              onClick={() => setFilterStatus('PAGADO')}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-green-100">
                  <Check size={12} className="text-[var(--brand-success)]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-success)]">Pagados</span>
              </div>
              <p className="text-3xl font-black text-[var(--brand-success)]">{operations.filter(op => getStatus(op) === 'PAGADO').length}</p>
            </Card>

            <Card 
              variant="glass" 
              padding="sm" 
              className="col-span-2 sm:col-span-1 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              onClick={() => setFilterStatus('TODOS')}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-[var(--brand-gold-dim)]">
                  <Wallet size={12} className="text-[var(--brand-gold)]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--c-text-muted)]">X Cobrar</span>
              </div>
              <p className="text-base font-black font-mono leading-tight text-[var(--brand-gold)]">
                {formatCurrency(metrics.montoTotal)}
              </p>
            </Card>
          </div>
        )}

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="
            flex items-center gap-3 px-4 py-3 rounded-xl
            bg-blue-50 border border-blue-200
            animate-in slide-in-from-top-2 fade-in duration-200
          ">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-[var(--brand-primary)]">
                {selectedIds.size} seleccionados
              </span>
            </div>
            <div className="flex-1" />
            <Button size="sm" variant="green" onClick={handleBulkPay}>
              Marcar como pagado
            </Button>
            <Button size="sm" variant="gray" onClick={handleBulkArchive}>
              Archivar
            </Button>
            <Button size="sm" variant="red" onClick={handleBulkDelete}>
              Eliminar todo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Cancelar
            </Button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[var(--c-text-muted)]" />
            <span className="text-xs font-semibold text-[var(--c-text-muted)] uppercase tracking-wider">Filtros</span>
          </div>
          
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
            onChange={(v) => setFilterStatus(v as any)}
            size="sm"
            className="w-40"
          />
          
          <Input
            placeholder="RFC / Cliente / Concepto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
            className="w-56"
            leftIcon={<span className="text-xs">🔍</span>}
          />
          
          {allFiltersActive && (
            <Button size="sm" variant="ghost" onClick={clearFilters} leftIcon={<X size={14} />}>
              Limpiar
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden bg-[var(--c-surface)] border border-[var(--c-border)] shadow-lg">
          {isLoading ? (
            <div className="p-4">
              <SkeletonTable columns={COL_COUNT} rows={8} />
            </div>
          ) : displayOps.length === 0 ? (
            <EmptyState
              title={allFiltersActive ? "Sin resultados" : "No hay operaciones"}
              description={allFiltersActive 
                ? "No se encontraron operaciones con los filtros aplicados" 
                : "Crea tu primera operación para comenzar a gestionar cobranza"}
              icon={<FolderOpen size={48} strokeWidth={1.5} />}
              variant="centered"
              className="py-20"
              action={!allFiltersActive ? {
                label: '+ Nueva Operación',
                onClick: () => setIsNewOpModalOpen(true),
                variant: 'primary',
              } : {
                label: 'Limpiar Filtros',
                onClick: clearFilters,
                variant: 'ghost',
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-[var(--c-surface-raised)] border-b border-[var(--c-border)]">
                    <th className="px-3 py-3.5 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-[var(--c-border)]"
                        checked={isAllSelected}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(new Set(filteredOps.map(op => op.id)));
                          else setSelectedIds(new Set());
                        }}
                      />
                    </th>
                    {['Asesor', 'Cliente', 'RFC', 'Teléfono', 'Email', 'Concepto', 'Monto', 'F. Reg.', 'Vencimiento', 'Días', 'Estatus', 'Acciones'].map(h => (
                      <th key={h} className={`
                        px-4 py-3.5 text-[10px] font-black uppercase tracking-widest
                        ${h === 'Acciones' ? 'text-right' : ''}
                        ${h === 'Monto' ? 'text-[var(--brand-gold)]' : 'text-[var(--c-text-muted)]'}
                      `}>
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
                        <td className="px-4 py-3 font-bold text-sm text-[var(--c-text)]">
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
                        <td className="px-4 py-3 font-black font-mono text-sm text-[var(--brand-gold)]">
                          {formatCurrency(op.monto || 0)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold uppercase font-mono text-[var(--c-text-muted)]">
                          {op.createdAt ? new Date(op.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold uppercase font-mono text-[var(--c-text-muted)]">
                          {op.fechaVence ? new Date(op.fechaVence).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3 font-black text-xs font-mono" style={{ color: diasColor }}>
                          {diasText}
                        </td>
                        <td className="px-4 py-3">
                          <Badge status={status} size="sm" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {getStatus(op) === 'PAGADO' ? (
                              <Button
                                size="xs"
                                variant="ghost"
                                title="Desmarcar pago"
                                onClick={() => { if (confirm('¿Desmarcar pago?')) unmarkAsPaid(op.id); }}
                              >
                                <RotateCcw size={13} />
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                variant="green"
                                title="Registrar pago"
                                onClick={() => { if (confirm('¿Marcar como pagada?')) markAsPaid(op.id); }}
                              >
                                <CheckCircle2 size={13} />
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="purple"
                              title="WA"
                              onClick={() => handleSendWA(op)}
                            >
                              <MessageCircle size={13} />
                            </Button>
                            <Button
                              size="xs"
                              variant="blue"
                              title="PDF"
                              onClick={() => handleGeneratePDF(op)}
                            >
                              <FileText size={13} />
                            </Button>
                            {activeTab === 'activas' ? (
                              <Button
                                size="xs"
                                variant="gray"
                                title="Archivar"
                                onClick={() => { if (confirm('¿Archivar?')) archiveOperation(op.id); }}
                              >
                                <Archive size={13} />
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                variant="gray"
                                title="Desarchivar"
                                onClick={async () => {
                                  try {
                                    await unarchiveOperation(op.id);
                                    toast('ok', 'Operación restaurada correctamente');
                                    navigate('/');
                                  } catch (err) {
                                    toast('err', 'Error al restaurar operación');
                                  }
                                }}
                              >
                                <RotateCcw size={13} />
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant={op.excluir ? "blue" : "gray"}
                              title={op.excluir ? "Des-excluir operación" : "Excluir operación"}
                              onClick={async () => {
                                try {
                                  await toggleExclude(op.id);
                                  toast('ok', op.excluir ? 'Operación reactivada' : 'Operación excluida');
                                } catch {
                                  toast('err', 'Error al cambiar estado de exclusión');
                                }
                              }}
                            >
                              <Ban size={13} />
                            </Button>
                            <Button
                              size="xs"
                              variant="gray"
                              title="Eliminar"
                              onClick={() => { if (confirm('Eliminar esta operación?')) deleteOperation(op.id); }}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <NewOperationModal isOpen={isNewOpModalOpen} onClose={() => setIsNewOpModalOpen(false)} />
      <MasivoWAModal isOpen={isMasivoOpen} onClose={() => setIsMasivoOpen(false)} operations={operations.filter(op => !op.archived)} config={config} />
      <ToastContainer toasts={toasts} />
    </>
  );
}
