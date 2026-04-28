import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Play, Square, Pause, RotateCcw, RefreshCw,
  CheckCircle2, XCircle, Clock, AlertTriangle,
  TrendingDown, Users, DollarSign, CalendarClock,
  ChevronDown, ChevronUp, Ban, CheckCheck, Eye,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface AgentStats {
  totalClients: number;
  totalOperations: number;
  pendingAmount: number;
  vencidas: number;
  hoyVence: number;
  porVencer: number;
  pagadasHoy: number;
}

interface PendingAction {
  id: string;
  executionId: string;
  clientId: string | null;
  clientName: string;
  action: string;
  status: string;
  scheduledAt: string;
  messagePreview?: string;
}

interface RecentAction {
  id: string;
  executionId: string;
  clientId: string | null;
  clientName: string;
  action: string;
  status: string;
  sentAt: string;
  error?: string;
}

interface ExecutionSummary {
  id: string;
  status: string;
  phase: string;
  progress: number;
  startedAt: string;
  triggeredBy: string;
}

interface Dashboard {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';
  currentExecution: ExecutionSummary | null;
  nextScheduledRun: string;
  stats: AgentStats;
  pendingActions: PendingAction[];
  recentActions: RecentAction[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const fmx = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const fDate = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const STATUS_CONFIG = {
  IDLE:    { label: 'En espera',   color: '#6B7280', glow: 'rgba(107,114,128,0.3)',  pulse: false },
  RUNNING: { label: 'Ejecutando',  color: '#10B981', glow: 'rgba(16,185,129,0.4)',  pulse: true  },
  PAUSED:  { label: 'Pausado',     color: '#F59E0B', glow: 'rgba(245,158,11,0.4)',  pulse: false },
  STOPPED: { label: 'Detenido',    color: '#EF4444', glow: 'rgba(239,68,68,0.3)',   pulse: false },
} as const;

const ACTION_LABELS: Record<string, string> = {
  WHATSAPP_MESSAGE: 'WhatsApp',
  WHATSAPP_PDF: 'PDF WA',
  FOLLOWUP: 'Seguimiento',
  EMAIL: 'Email',
};

// ─── Main Component ───────────────────────────────────────────────────────

export default function AgentView() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedExec, setExpandedExec] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const data = await api.get<Dashboard>('/agent/dashboard');
      setDashboard(data);
    } catch {
      showToast('Error cargando dashboard del agente', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000); // auto-refresh cada 15s
    return () => clearInterval(iv);
  }, [load]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get<{ executions: any[] }>('/agent/execution/history');
      setHistory(res.executions);
    } catch {
      showToast('Error cargando historial', 'err');
    } finally {
      setHistoryLoading(false);
    }
  };

  const agentAction = async (endpoint: string, label: string) => {
    setActionLoading(endpoint);
    try {
      const res = await api.post<{ message: string }>(endpoint);
      showToast(res.message || label);
      await load();
    } catch (e: any) {
      showToast(e.message || `Error: ${label}`, 'err');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelAction = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/agent/actions/cancel/${id}`);
      showToast('Acción cancelada');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Error cancelando acción', 'err');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelSelected = async () => {
    if (selected.size === 0) return;
    setActionLoading('cancel-sel');
    let ok = 0;
    for (const id of selected) {
      try { await api.post(`/agent/actions/cancel/${id}`); ok++; } catch {}
    }
    showToast(`${ok} acción(es) cancelada(s)`);
    setSelected(new Set());
    await load();
    setActionLoading(null);
  };

  const cancelAll = async () => {
    setActionLoading('cancel-all');
    try {
      const res = await api.post<{ message: string }>('/agent/actions/cancel-all');
      showToast(res.message || 'Acciones canceladas');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Error', 'err');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={28} className="animate-spin text-purple-400" />
    </div>
  );

  if (!dashboard) return (
    <div className="text-center text-white/50 py-20">No se pudo cargar el panel del agente.</div>
  );

  const sc = STATUS_CONFIG[dashboard.status] ?? STATUS_CONFIG.IDLE;
  const isRunning = dashboard.status === 'RUNNING';
  const isPaused  = dashboard.status === 'PAUSED';
  const isIdle    = dashboard.status === 'IDLE' || dashboard.status === 'STOPPED';

  return (
    <div className="space-y-6 pb-10">

      {/* ── Toast ─────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl"
            style={{ background: toast.type === 'ok' ? '#10B981' : '#EF4444', color: '#fff' }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#3B4FE8)', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl tracking-tight">Panel del Agente</h2>
            <p className="text-white/50 text-xs">Cobranza autónoma · Actualización automática cada 15s</p>
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all" title="Actualizar">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── Status Card ───────────────────────────────── */}
      <motion.div layout className="rounded-2xl p-6 border"
        style={{ background: 'rgba(255,255,255,0.04)', borderColor: sc.color + '55', boxShadow: `0 0 30px ${sc.glow}` }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="w-4 h-4 rounded-full inline-block" style={{ background: sc.color, boxShadow: `0 0 12px ${sc.glow}` }} />
              {sc.pulse && <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: sc.color }} />}
            </div>
            <div>
              <p className="text-white font-bold text-lg">{sc.label}</p>
              {dashboard.currentExecution && (
                <p className="text-white/50 text-xs mt-0.5">
                  Fase: <span className="text-white/80">{dashboard.currentExecution.phase}</span>
                  {' · '}Progreso: <span className="text-white/80">{dashboard.currentExecution.progress}%</span>
                  {' · '}Inicio: <span className="text-white/80">{fDate(dashboard.currentExecution.startedAt)}</span>
                </p>
              )}
              {!dashboard.currentExecution && (
                <p className="text-white/40 text-xs mt-0.5">
                  Próxima ejecución: <span className="text-purple-300">{fDate(dashboard.nextScheduledRun)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isIdle && (
              <CtrlBtn
                icon={<Play size={15} />} label="Ejecutar ahora" color="#10B981"
                disabled={!!actionLoading}
                loading={actionLoading === '/agent/execution/start'}
                onClick={() => agentAction('/agent/execution/start', 'Ejecución iniciada')}
              />
            )}
            {isRunning && (
              <>
                <CtrlBtn icon={<Pause size={15} />} label="Pausar" color="#F59E0B"
                  disabled={!!actionLoading} loading={actionLoading === '/agent/execution/pause'}
                  onClick={() => agentAction('/agent/execution/pause', 'Agente pausado')} />
                <CtrlBtn icon={<Square size={15} />} label="Detener" color="#EF4444"
                  disabled={!!actionLoading} loading={actionLoading === '/agent/execution/stop'}
                  onClick={() => agentAction('/agent/execution/stop', 'Agente detenido')} />
              </>
            )}
            {isPaused && (
              <>
                <CtrlBtn icon={<RotateCcw size={15} />} label="Reanudar" color="#10B981"
                  disabled={!!actionLoading} loading={actionLoading === '/agent/execution/resume'}
                  onClick={() => agentAction('/agent/execution/resume', 'Agente reanudado')} />
                <CtrlBtn icon={<Square size={15} />} label="Detener" color="#EF4444"
                  disabled={!!actionLoading} loading={actionLoading === '/agent/execution/stop'}
                  onClick={() => agentAction('/agent/execution/stop', 'Agente detenido')} />
              </>
            )}
          </div>
        </div>

        {/* Progress bar when running */}
        {dashboard.currentExecution && dashboard.currentExecution.progress > 0 && (
          <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: sc.color }}
              initial={{ width: 0 }} animate={{ width: `${dashboard.currentExecution.progress}%` }}
              transition={{ duration: 0.5 }} />
          </div>
        )}
      </motion.div>

      {/* ── Stats Grid ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Vencidas',    value: dashboard.stats.vencidas,    color: '#EF4444', icon: <AlertTriangle size={16} /> },
          { label: 'Vence hoy',   value: dashboard.stats.hoyVence,    color: '#F59E0B', icon: <Clock size={16} /> },
          { label: 'Por vencer',  value: dashboard.stats.porVencer,   color: '#8B5CF6', icon: <CalendarClock size={16} /> },
          { label: 'Pagadas hoy', value: dashboard.stats.pagadasHoy,  color: '#10B981', icon: <CheckCircle2 size={16} /> },
          { label: 'Clientes',    value: dashboard.stats.totalClients, color: '#3B82F6', icon: <Users size={16} /> },
        ].map(s => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Total pendiente */}
      <div className="rounded-2xl p-4 flex items-center gap-3 border border-white/10"
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        <DollarSign size={20} className="text-purple-400 flex-shrink-0" />
        <span className="text-white/60 text-sm">Total pendiente de cobro:</span>
        <span className="text-white font-bold text-lg ml-auto">{fmx(dashboard.stats.pendingAmount)}</span>
        <TrendingDown size={16} className="text-purple-400" />
      </div>

      {/* ── Pending Actions ───────────────────────────── */}
      <Section
        title={`Acciones pendientes (${dashboard.pendingActions.length})`}
        extra={dashboard.pendingActions.length > 0 ? (
          <div className="flex gap-2">
            {selected.size > 0 && (
              <CtrlBtn icon={<Ban size={13} />} label={`Cancelar (${selected.size})`} color="#F59E0B"
                disabled={!!actionLoading} loading={actionLoading === 'cancel-sel'}
                onClick={cancelSelected} small />
            )}
            <CtrlBtn icon={<XCircle size={13} />} label="Cancelar todo" color="#EF4444"
              disabled={!!actionLoading} loading={actionLoading === 'cancel-all'}
              onClick={cancelAll} small />
          </div>
        ) : null}
      >
        {dashboard.pendingActions.length === 0 ? (
          <EmptyState icon={<CheckCheck size={32} className="text-white/20" />} text="Sin acciones pendientes" />
        ) : (
          <div className="space-y-2">
            {dashboard.pendingActions.map(a => (
              <motion.div key={a.id} layout
                className="flex items-start gap-3 p-3 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                style={{ background: selected.has(a.id) ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)' }}
                onClick={() => toggleSelect(a.id)}
              >
                <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)}
                  className="mt-1 accent-purple-500 flex-shrink-0 w-4 h-4 cursor-pointer"
                  onClick={e => e.stopPropagation()} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm truncate">{a.clientName}</span>
                    <ActionBadge type={a.action} />
                  </div>
                  {a.messagePreview && (
                    <p className="text-white/40 text-xs mt-0.5 truncate">{a.messagePreview}</p>
                  )}
                  <p className="text-white/30 text-[11px] mt-0.5">{fDate(a.scheduledAt)}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); cancelAction(a.id); }}
                  disabled={actionLoading === a.id}
                  className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                  title="Cancelar">
                  {actionLoading === a.id ? <RefreshCw size={13} className="animate-spin" /> : <XCircle size={13} />}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Recent Actions ────────────────────────────── */}
      <Section title="Acciones recientes">
        {dashboard.recentActions.length === 0 ? (
          <EmptyState icon={<Clock size={32} className="text-white/20" />} text="Sin actividad reciente" />
        ) : (
          <div className="space-y-1.5">
            {dashboard.recentActions.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <StatusDot status={a.status} />
                <span className="text-white text-sm font-medium flex-1 truncate">{a.clientName}</span>
                <ActionBadge type={a.action} small />
                <span className="text-white/30 text-[11px] flex-shrink-0">{fDate(a.sentAt)}</span>
                {a.error && <span className="text-red-400 text-[11px] truncate max-w-[120px]" title={a.error}>⚠ {a.error}</span>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Execution History ─────────────────────────── */}
      <Section
        title="Historial de ejecuciones"
        extra={
          <button onClick={loadHistory} disabled={historyLoading}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
            {historyLoading ? <RefreshCw size={12} className="animate-spin" /> : <Eye size={12} />}
            Cargar historial
          </button>
        }
      >
        {history.length === 0 ? (
          <EmptyState icon={<CalendarClock size={32} className="text-white/20" />} text="Carga el historial con el botón de arriba" />
        ) : (
          <div className="space-y-2">
            {history.map(ex => {
              const sc2 = STATUS_CONFIG[ex.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.IDLE;
              const isExp = expandedExec === ex.id;
              return (
                <div key={ex.id} className="rounded-xl border border-white/10 overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <button onClick={() => setExpandedExec(isExp ? null : ex.id)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-all">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: sc2.color }} />
                    <span className="text-white/80 text-sm flex-1 truncate">
                      {fDate(ex.startedAt)} · {ex.triggeredBy}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border" style={{ color: sc2.color, borderColor: sc2.color + '55' }}>
                      {sc2.label}
                    </span>
                    {isExp ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                  </button>
                  <AnimatePresence>
                    {isExp && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="overflow-hidden">
                        <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          {[
                            { label: 'Fase',       val: ex.phase },
                            { label: 'Progreso',   val: `${ex.progress}%` },
                            { label: 'Completadas', val: ex.completedActions },
                            { label: 'Fallidas',   val: ex.failedActions },
                            { label: 'Canceladas', val: ex.cancelledActions },
                            { label: 'Total',      val: ex.totalActions },
                          ].map(r => (
                            <div key={r.label} className="space-y-0.5">
                              <p className="text-white/40 uppercase tracking-wider text-[10px]">{r.label}</p>
                              <p className="text-white font-semibold">{r.val}</p>
                            </div>
                          ))}
                        </div>
                        {ex.notes && <p className="px-4 pb-3 text-xs text-white/40 italic">{ex.notes}</p>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}
      className="rounded-2xl p-4 border border-white/10 flex flex-col gap-2"
      style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-between">
        <span style={{ color }} className="opacity-80">{icon}</span>
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}

function Section({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/08">
        <h3 className="text-white/80 font-semibold text-sm">{title}</h3>
        {extra}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-white/30">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}

function CtrlBtn({ icon, label, color, onClick, disabled, loading, small }: {
  icon: React.ReactNode; label: string; color: string;
  onClick: () => void; disabled?: boolean; loading?: boolean; small?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
      onClick={onClick} disabled={disabled || loading}
      className={`flex items-center gap-1.5 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
      style={{ background: color + '22', border: `1px solid ${color}55`, color }}
    >
      {loading ? <RefreshCw size={small ? 12 : 14} className="animate-spin" /> : icon}
      {label}
    </motion.button>
  );
}

function ActionBadge({ type, small }: { type: string; small?: boolean }) {
  const colors: Record<string, string> = {
    WHATSAPP_MESSAGE: '#25D366', WHATSAPP_PDF: '#128C7E',
    FOLLOWUP: '#8B5CF6', EMAIL: '#3B82F6',
  };
  const c = colors[type] || '#6B7280';
  return (
    <span className={`rounded-full font-medium flex-shrink-0 ${small ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}
      style={{ background: c + '22', color: c, border: `1px solid ${c}44` }}>
      {ACTION_LABELS[type] || type}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: '#10B981', FAILED: '#EF4444', CANCELLED: '#6B7280', PENDING: '#F59E0B', EXECUTING: '#3B82F6',
  };
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[status] || '#6B7280' }} />;
}
