import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ui/ToastContainer';
import Topbar from '../components/Topbar';
import { FileSpreadsheet, FileText, Database, UploadCloud, Target, Users, Archive, History, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ExportService } from '../services/exportService';
import { api } from '../services/api';
import { pdf } from '@react-pdf/renderer';
import ReporteCxCPDF from '../pdf-templates/ReporteCxCPDF';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ConfirmModal } from '../components/ui/ConfirmModal';

const StatCard = ({ icon: Icon, value, label, color }: { icon: any, value: number, label: string, color: string }) => (
  <Card variant="glass" padding="normal" hoverable className="transition-transform hover:scale-[1.02]">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-xl" style={{ background: `${color}15`, color }}>
        <Icon size={22} />
      </div>
      <div>
        <h4 className="text-2xl font-black leading-none" style={{ color: 'var(--c-text)' }}>{value}</h4>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--c-text-muted)' }}>{label}</p>
      </div>
    </div>
  </Card>
);

const ExportBlock = ({ title, desc, action, btnClass, icon: Icon, iconColor, onClick, isLoading, badge }: any) => (
  <Card 
    variant="glass" 
    padding="normal" 
    hoverable 
    className="transition-all hover:-translate-y-1 cursor-pointer min-h-[160px] flex flex-col"
  >
    <div className="flex-1">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl" style={{ background: iconColor + '15', color: iconColor }}>
          <Icon size={20} />
        </div>
        {badge && <Badge status={badge} size="sm" />}
      </div>
      <h3 className="font-bold mb-1.5 leading-tight text-sm" style={{ color: 'var(--c-text)' }}>{title}</h3>
      <p className="text-[10px] font-bold uppercase tracking-wide leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>{desc}</p>
    </div>
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`btn btn-sm mt-4 w-full justify-center gap-2 ${btnClass} disabled:opacity-50`}
    >
      {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
      {isLoading ? 'Procesando...' : action}
    </button>
  </Card>
);

export default function ExportView() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [stats, setStats] = useState({ operations: 0, clients: 0, logs: 0 });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDateRange, setShowDateRange] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState<{ open: boolean; type: string; message: string }>({ open: false, type: '', message: '' });
  const [pendingRestore, setPendingRestore] = useState<File | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const { toasts, toast } = useToast();

  const handleRestoreConfirm = () => {
    if (pendingRestore) {
      handleExport('restore', () => ExportService.restoreBackup(pendingRestore));
      setPendingRestore(null);
    }
  };

  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    const defaults = getDefaultDates();
    setDateRange(defaults);
  }, []);

  useEffect(() => {
    if (pendingRestore && !confirmRestore) {
      setConfirmRestore(true);
    }
  }, [pendingRestore, confirmRestore]);

  const fetchStats = async () => {
    try {
      const data = await api.get<{operations: number, clients: number, logs: number}>('/config/stats');
      setStats(data);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleExport = async (type: string, action: () => Promise<void>) => {
    setLoadingAction(type);
    try {
      await action();
      if (type === 'restore') {
        fetchStats();
        toast('ok', 'Backup restaurado con éxito. Recarga la aplicación si es necesario.');
      } else if (type.startsWith('purge')) {
        fetchStats();
        toast('ok', 'Datos eliminados con éxito.');
      }
    } catch (error) {
      toast('err', `Error: ${(error as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <>
      <Topbar
        title="Exportar / Datos"
        subtitle="Exportación, respaldos y limpieza"
        actions={
          <button
            onClick={() => handleExport('backup', () => ExportService.downloadBackup())}
            disabled={loadingAction === 'backup'}
            className="btn btn-purple btn-sm disabled:opacity-50"
          >
            {loadingAction === 'backup' ? '⏳ Guardando...' : '💾 Backup'}
          </button>
        }
      />

      <div className="p-5 max-w-7xl mx-auto w-full flex flex-col gap-8">

        {/* Export grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>Exportar Datos</h2>
            <button 
              onClick={() => setShowDateRange(!showDateRange)}
              className={`btn btn-ghost btn-sm gap-2 ${showDateRange ? 'btn-purple' : ''}`}
            >
              <RefreshCw size={14} className={showDateRange ? 'animate-spin-slow' : ''} />
              {showDateRange ? 'Ocultar filtro' : 'Filtrar por fecha'}
            </button>
          </div>

          {showDateRange && (
            <Card variant="glass" padding="normal" className="mb-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>Desde:</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="input-base text-sm py-1.5 px-3 rounded-lg"
                    style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>Hasta:</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="input-base text-sm py-1.5 px-3 rounded-lg"
                    style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
                  />
                </div>
                <button 
                  onClick={() => setDateRange(getDefaultDates())}
                  className="btn btn-ghost btn-sm"
                >
                  Últimos 30 días
                </button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExportBlock
              title="Excel Operaciones" desc="Todas las operaciones con estatus y días vencidos"
              action="Descargar" icon={FileSpreadsheet} iconColor="var(--brand-info)"
              btnClass="btn-ghost" isLoading={loadingAction === 'operaciones'}
              badge={loadingAction === 'operaciones' ? 'PENDIENTE' : undefined}
              onClick={() => handleExport('operaciones', () => ExportService.downloadExcel('operaciones'))}
            />
            <ExportBlock
              title="Excel Directorio" desc="Base maestra de clientes con clasificaciones"
              action="Descargar" icon={Users} iconColor="var(--brand-primary)"
              btnClass="btn-ghost" isLoading={loadingAction === 'directorio'}
              onClick={() => handleExport('directorio', () => ExportService.downloadExcel('directorio'))}
            />
            <ExportBlock
              title="Excel Pagos" desc="Operaciones cobradas con fecha de pago"
              action="Descargar" icon={Target} iconColor="var(--brand-success)"
              btnClass="btn-green" isLoading={loadingAction === 'pagos'}
              onClick={() => handleExport('pagos', () => ExportService.downloadExcel('pagos'))}
            />
            <ExportBlock
              title="Excel Log WA" desc="Bitácora completa de mensajes enviados"
              action="Descargar" icon={History} iconColor="var(--c-text-muted)"
              btnClass="btn-ghost" isLoading={loadingAction === 'log'}
              onClick={() => handleExport('log', () => ExportService.downloadExcel('log'))}
            />
            <ExportBlock
              title="PDF Reporte CxC" desc="Resumen ejecutivo por asesor con totales"
              action="Descargar" icon={FileText} iconColor="var(--brand-warn)"
              btnClass="btn-orange" isLoading={loadingAction === 'pdf'}
              onClick={() => handleExport('pdf', async () => {
                const [ops, cfg] = await Promise.all([
                  api.get<any[]>('/operations'),
                  api.get<Record<string, string>>('/config'),
                ]);
                const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const defaultName = `reporte_cxc_${today}.pdf`;
                const filename = prompt('Nombre del archivo:', defaultName);
                if (filename === null) return;
                const blob = await pdf(<ReporteCxCPDF operations={ops} config={cfg} />).toBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename || defaultName; a.click();
                URL.revokeObjectURL(url);
              })}
            />
            <ExportBlock
              title="Backup JSON" desc="Respaldo completo del sistema"
              action="Descargar" icon={Database} iconColor="var(--brand-violet)"
              btnClass="btn-purple" isLoading={loadingAction === 'backup_btn'}
              onClick={() => handleExport('backup_btn', () => ExportService.downloadBackup())}
            />
          </div>
        </section>

        {/* Restore */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--c-text-muted)' }}>Restaurar</h2>
          <Card variant="glass" padding="normal" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5" style={{ background: 'var(--brand-info)', transform: 'translate(30%, -30%)' }} />
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--c-text)' }}>
                  Restaurar base de datos desde un archivo .JSON generado por Collecta.
                </p>
                <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>Esta acción reemplazará la data existente.</p>
              </div>
              <label
                className="btn btn-ghost flex items-center gap-2 whitespace-nowrap cursor-pointer"
                style={{ borderColor: 'var(--brand-info)' }}
              >
                <UploadCloud size={16} /> Cargar Backup JSON
                <input
                  type="file" accept=".json" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPendingRestore(file);
                  }}
                />
              </label>
            </div>
          </Card>
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--c-text-muted)' }}>Almacenamiento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={Archive} value={stats.operations} label="Operaciones activas" color="var(--brand-info)" />
            <StatCard icon={Users} value={stats.clients} label="Clientes en directorio" color="var(--brand-primary)" />
            <StatCard icon={History} value={stats.logs} label="Mensajes en log" color="var(--brand-violet)" />
          </div>
        </section>

        {/* Danger zone */}
        <section
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'rgba(239,63,63,0.06)', border: '1px solid rgba(239,63,63,0.22)' }}
        >
          <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: 'var(--brand-danger)' }} />
          <h2 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--brand-danger)' }}>
            <AlertTriangle size={14} /> Zona de Limpieza
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setConfirmPurge({ open: true, type: 'staging', message: '¿Limpiar todas las operaciones en estatus PENDIENTE?' })}
              disabled={loadingAction === 'purge_staging'}
              className="btn btn-ghost btn-sm disabled:opacity-50 gap-2"
              style={{ borderColor: 'rgba(239,63,63,0.25)' }}
            >
              {loadingAction === 'purge_staging' && <RefreshCw size={14} className="animate-spin" />}
              {loadingAction === 'purge_staging' ? 'Limpiando...' : '🗑'} Limpiar Staging
            </button>
            <button
              onClick={() => setConfirmPurge({ open: true, type: 'logs', message: '¿Limpiar todo el historial de mensajes de WhatsApp?' })}
              disabled={loadingAction === 'purge_logs'}
              className="btn btn-ghost btn-sm disabled:opacity-50 gap-2"
              style={{ borderColor: 'rgba(239,63,63,0.25)' }}
            >
              {loadingAction === 'purge_logs' && <RefreshCw size={14} className="animate-spin" />}
              {loadingAction === 'purge_logs' ? 'Limpiando...' : '🗑'} Limpiar Log WA
            </button>
            <button
              onClick={() => setConfirmPurge({ open: true, type: 'all', message: '¡ADVERTENCIA! ¿Eliminar TODOS los datos? Esta acción es irreversible y no se puede deshacer.' })}
              disabled={loadingAction === 'purge_all'}
              className="btn btn-red btn-sm disabled:opacity-50 gap-2"
            >
              {loadingAction === 'purge_all' && <RefreshCw size={14} className="animate-spin" />}
              ⚠ {loadingAction === 'purge_all' ? 'ELIMINANDO...' : 'ELIMINAR TODO'}
            </button>
          </div>
        </section>

      </div>

      <ConfirmModal
        isOpen={confirmPurge.open}
        onClose={() => setConfirmPurge({ open: false, type: '', message: '' })}
        onConfirm={() => handleExport(`purge_${confirmPurge.type}`, () => ExportService.purgeData(confirmPurge.type as 'staging' | 'logs' | 'all'))}
        title="Confirmar limpieza"
        message={confirmPurge.message}
        confirmText="Limpiar"
        variant="danger"
        isLoading={loadingAction !== null}
      />

      <ConfirmModal
        isOpen={confirmRestore}
        onClose={() => { setConfirmRestore(false); setPendingRestore(null); }}
        onConfirm={handleRestoreConfirm}
        title="Restaurar backup"
        message={`¿Estás seguro de restaurar el backup "${pendingRestore?.name}"? Esto reemplazará todos los datos actuales.`}
        confirmText="Restaurar"
        variant="warning"
        isLoading={loadingAction !== null}
      />

      <ToastContainer toasts={toasts} />
    </>
  );
}
