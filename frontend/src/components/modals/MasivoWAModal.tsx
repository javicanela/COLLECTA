import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { Operation, Client } from '../../types';
import { LogService } from '../../services/logService';
import { buildWaUrl, DEFAULT_MSG_VENCIDO, DEFAULT_MSG_HOY, DEFAULT_MSG_RECORDATORIO } from '../../utils/whatsapp';

const fmx = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

interface MasivoWAModalProps {
  isOpen: boolean;
  onClose: () => void;
  operations: Operation[];
  config: Record<string, string>;
}

interface SendResult {
  clientName: string;
  phone: string;
  total: number;
  status: 'ENVIADO' | 'BLOQUEADO' | 'ERROR';
  reason?: string;
}

interface CandidateGroup {
  key: string;
  client: Client;
  operations: Operation[];
  phone: string;
  total: number;
  cantidad: number;
}

type RunStatus = 'idle' | 'running' | 'paused' | 'done';

type PlantillaTipo = 'vencido' | 'hoy' | 'recordatorio';

export default function MasivoWAModal({ isOpen, onClose, operations, config }: MasivoWAModalProps) {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<SendResult[]>([]);
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaTipo>('vencido');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setExcludedKeys(new Set());
      setStatus('idle');
      setCurrentIndex(0);
      setResults([]);
    }
  }, [isOpen]);

  const modo = config.modo || 'PRUEBA';

  const candidates = useMemo((): CandidateGroup[] => {
    const grouped = new Map<string, CandidateGroup>();
    const telPrueba = config.telPrueba || config.sysTelWa || '';
    
    operations.forEach(op => {
      if (!op.client) return;
      if (op.client.estado === 'SUSPENDIDO') return;
      
      const opStatus = op.calculatedStatus || op.estatus;
      if (!['VENCIDO', 'HOY VENCE', 'POR VENCER'].includes(opStatus)) return;
      
      const phone = modo === 'PRUEBA' ? telPrueba : (op.client.telefono || '');
      if (!phone) return;
      
      const key = phone;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          client: op.client,
          operations: [],
          phone,
          total: 0,
          cantidad: 0,
        });
      }
      
      const group = grouped.get(key)!;
      group.operations.push(op);
      group.total += Number(op.monto) || 0;
      group.cantidad += 1;
    });

    return Array.from(grouped.values())
      .filter(g => !excludedKeys.has(g.key))
      .sort((a, b) => {
        const getWorstStatus = (ops: Operation[]) => {
          if (ops.some(o => (o.calculatedStatus || o.estatus) === 'VENCIDO')) return 0;
          if (ops.some(o => (o.calculatedStatus || o.estatus) === 'HOY VENCE')) return 1;
          return 2;
        };
        return getWorstStatus(a.operations) - getWorstStatus(b.operations);
      });
  }, [operations, excludedKeys, modo, config]);

  const skippedSuspendidos = operations.filter(op => op.client?.estado === 'SUSPENDIDO').length;
  const skippedSinTel = operations.filter(op => {
    if (op.client?.estado === 'SUSPENDIDO') return false;
    return !op.client?.telefono;
  }).length;

  const getTemplate = (tipo: PlantillaTipo) => {
    if (tipo === 'vencido') return config.plantilla_vencido || DEFAULT_MSG_VENCIDO;
    if (tipo === 'hoy') return config.plantilla_hoy || DEFAULT_MSG_HOY;
    return config.plantilla_recordatorio || DEFAULT_MSG_RECORDATORIO;
  };

  const getVariante = (group: CandidateGroup) => {
    const hasVencido = group.operations.some(o => (o.calculatedStatus || o.estatus) === 'VENCIDO');
    const hasHoy = group.operations.some(o => (o.calculatedStatus || o.estatus) === 'HOY VENCE');
    if (hasVencido) return 'VENCIDO';
    if (hasHoy) return 'HOY VENCE';
    return 'RECORDATORIO';
  };

  const toggleExclude = (key: string) => {
    setExcludedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sendOne = useCallback(async (group: CandidateGroup) => {
    const template = getTemplate(plantillaSeleccionada);
    const { client, operations, phone, total, cantidad } = group;
    const variante = getVariante(group);
    
    const processedTemplate = template
      .replace(/{TOTAL}/g, fmx(total))
      .replace(/{CANTIDAD}/g, String(cantidad));

    const opUrgente = operations.sort((a, b) => {
      const statusA = a.calculatedStatus || a.estatus;
      const statusB = b.calculatedStatus || b.estatus;
      const order: Record<string, number> = { 'VENCIDO': 0, 'HOY VENCE': 1, 'POR VENCER': 2, 'PENDIENTE': 3, 'AL CORRIENTE': 4 };
      return (order[statusA] ?? 5) - (order[statusB] ?? 5);
    })[0];

    const ffd = (iso: string | null | undefined) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const diasRaw = opUrgente?.fechaVence
      ? Math.ceil((new Date(opUrgente.fechaVence).getTime() - Date.now()) / 86400000)
      : 0;
    const dias = Math.abs(isNaN(diasRaw) ? 0 : diasRaw);

    const message = processedTemplate
      .replace(/{NOMBRE_DESPACHO}/g, config.nombre_despacho || 'Collecta')
      .replace(/{CLIENTE}/g, client.nombre || '')
      .replace(/{MONTO}/g, fmx(opUrgente?.monto || 0))
      .replace(/{CONCEPTO}/g, opUrgente?.descripcion || '')
      .replace(/{FECHA}/g, ffd(opUrgente?.fechaVence))
      .replace(/{DIAS}/g, String(dias))
      .replace(/{BENEFICIARIO}/g, config.beneficiario || '')
      .replace(/{BANCO}/g, config.banco || '')
      .replace(/{CLABE}/g, config.clabe || '')
      .replace(/{DEPTO}/g, config.depto || '')
      .replace(/{TEL_DESPACHO}/g, config.tel || '')
      .replace(/{EMAIL_DESPACHO}/g, config.email || '');

    if (!phone) {
      try {
        await LogService.create({
          clientId: client.id,
          tipo: 'WHATSAPP',
          variante,
          resultado: 'ERROR',
          mensaje: modo === 'PRUEBA' ? 'Teléfono de prueba no configurado' : 'Cliente sin teléfono',
          telefono: '',
          modo: modo as any,
        });
      } catch { /* silencioso */ }
      return { clientName: client.nombre || '?', phone: '', total: 0, status: 'ERROR' as const, reason: 'Sin teléfono' };
    }

    const url = buildWaUrl(phone, message);
    window.open(url, '_blank');

    try {
      await LogService.create({
        clientId: client.id,
        tipo: 'WHATSAPP',
        variante,
        resultado: 'ENVIADO',
        mensaje: message.substring(0, 500),
        telefono: phone,
        modo: modo as any,
      });
    } catch { /* log error silently */ }

    return { clientName: client.nombre || '?', phone, total, status: 'ENVIADO' as const };
  }, [config, modo, plantillaSeleccionada]);

  const startSending = () => {
    if (candidates.length === 0) return;

    if (modo === 'PRUEBA' && !config.telPrueba && !config.sysTelWa) {
      alert('Configura el teléfono de prueba en Configuración antes de iniciar el envío.');
      return;
    }

    if (modo === 'PRODUCCIÓN' || modo === 'PRODUCCION') {
      const confirmed = window.confirm(
        `¿Estás seguro de enviar ${candidates.length} mensajes de WhatsApp en modo PRODUCCIÓN?\n\n` +
        `Se enviará 1 mensaje por cliente con el TOTAL de sus operaciones pendientes.`
      );
      if (!confirmed) return;
    }

    if (candidates.length > 30) {
      const confirmed = window.confirm(
        `⚠ Se abrirán ${candidates.length} pestañas de WhatsApp.\n\n` +
        `Para evitar que el navegador se congele, no cierres las pestañas mientras el proceso avanza.\n\n` +
        `¿Continuar?`
      );
      if (!confirmed) return;
    }

    setStatus('running');
    indexRef.current = currentIndex;

    intervalRef.current = setInterval(async () => {
      const i = indexRef.current;
      if (i >= candidates.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setStatus('done');
        return;
      }

      const result = await sendOne(candidates[i]);
      setResults(prev => [...prev, result]);
      indexRef.current = i + 1;
      setCurrentIndex(i + 1);
    }, 1500);
  };

  const pauseSending = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus('paused');
  };

  const handleClose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus('idle');
    setCurrentIndex(0);
    setResults([]);
    onClose();
  };

  if (!isOpen) return null;

  const progress = candidates.length > 0 ? (currentIndex / candidates.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={status === 'idle' || status === 'done' ? handleClose : undefined}>
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-900">Envío Masivo WhatsApp</h2>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${modo === 'PRUEBA' ? 'bg-bt-orange/10 text-bt-orange border border-bt-orange/30' : 'bg-bt-green/10 text-bt-green border border-bt-green/30'}`}>
            {modo}
          </span>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {status === 'idle' && (
            <>
              {candidates.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4">
                  <p className="font-bold mb-1">Sin clientes con operaciones pendientes</p>
                  <p className="text-xs leading-relaxed">
                    No hay operaciones pendientes con teléfono válido para enviar mensajes.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm font-semibold text-slate-700">Plantilla:</label>
                <select
                  value={plantillaSeleccionada}
                  onChange={(e) => setPlantillaSeleccionada(e.target.value as PlantillaTipo)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-bt-blue/50"
                >
                  <option value="vencido">Vencido</option>
                  <option value="hoy">Hoy Vence</option>
                  <option value="recordatorio">Recordatorio</option>
                </select>
              </div>

              {candidates.length > 0 && (
                <>
                  <div className="bg-bt-blue/5 border border-bt-blue/20 rounded-xl p-4">
                    <p className="text-sm text-slate-700">
                      Se enviarán <span className="font-black text-bt-blue">{candidates.length}</span> mensajes 
                      <span className="text-slate-400 ml-1">(1 por cliente con operaciones pendientes)</span>
                    </p>
                    <div className="flex gap-4 mt-3 text-xs font-bold text-slate-500">
                      <span className="text-bt-red">⚠ {candidates.filter(g => getVariante(g) === 'VENCIDO').length} con vencido</span>
                      <span className="text-bt-orange">🔥 {candidates.filter(g => getVariante(g) === 'HOY VENCE').length} hoy vence</span>
                      <span className="text-bt-gold">⏳ {candidates.filter(g => getVariante(g) === 'RECORDATORIO').length} por vencer</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Total a cobrar: <span className="font-bold text-bt-green">{fmx(candidates.reduce((s, g) => s + g.total, 0))}</span>
                    </p>
                  </div>

                  {excludedKeys.size > 0 && (
                    <p className="text-xs text-slate-400">{excludedKeys.size} clientes excluidos manualmente</p>
                  )}

                  <div className="mt-2">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Clientes a enviar (marca para excluir):</p>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                      {candidates.map((group, idx) => (
                        <div key={group.key} className={`flex items-center gap-2 px-3 py-2 text-xs border-b border-slate-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                          <input
                            type="checkbox"
                            checked={!excludedKeys.has(group.key)}
                            onChange={() => toggleExclude(group.key)}
                            className="w-4 h-4 rounded border-slate-300 text-bt-blue focus:ring-bt-blue"
                          />
                          <span className="flex-1 truncate font-medium text-slate-700">{group.client.nombre}</span>
                          <span className="font-mono text-slate-400 text-[10px]">{group.phone}</span>
                          <span className="font-bold text-bt-green">{fmx(group.total)}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-500">
                            {group.cantidad} ops
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                            ${getVariante(group) === 'VENCIDO' ? 'bg-red-100 text-red-700' : ''}
                            ${getVariante(group) === 'HOY VENCE' ? 'bg-orange-100 text-orange-700' : ''}
                            ${getVariante(group) === 'RECORDATORIO' ? 'bg-yellow-100 text-yellow-700' : ''}
                          `}>
                            {getVariante(group)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {(status === 'running' || status === 'paused' || status === 'done') && (
            <>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div className="bg-bt-green h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-slate-500 font-semibold text-center">
                {currentIndex} / {candidates.length} enviados
                {status === 'paused' && <span className="text-bt-orange ml-2">(pausado)</span>}
                {status === 'done' && <span className="text-bt-green ml-2">✓ Completado</span>}
              </p>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 text-xs border-b border-slate-100 last:border-0 ${r.status === 'ERROR' ? 'bg-red-50' : ''}`}>
                    <span className="font-semibold text-slate-700 truncate max-w-[150px]">{r.clientName}</span>
                    <span className="font-mono text-slate-400 text-[10px]">{r.phone}</span>
                    <span className="font-bold text-bt-green">{fmx(r.total)}</span>
                    <span className={`font-bold ${r.status === 'ENVIADO' ? 'text-bt-green' : 'text-bt-red'}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-200">
          {status === 'idle' && (
            <>
              <button className="btn btn-ghost border-slate-200 px-5 py-2" onClick={handleClose}>Cancelar</button>
              <button className="btn btn-green px-5 py-2" onClick={startSending} disabled={candidates.length === 0}>
                Iniciar Envío ({candidates.length})
              </button>
            </>
          )}
          {status === 'running' && (
            <button className="btn btn-orange px-5 py-2" onClick={pauseSending}>Pausar</button>
          )}
          {status === 'paused' && (
            <>
              <button className="btn btn-ghost border-slate-200 px-5 py-2" onClick={handleClose}>Cancelar</button>
              <button className="btn btn-green px-5 py-2" onClick={startSending}>Continuar</button>
            </>
          )}
          {status === 'done' && (
            <button className="btn btn-green px-5 py-2" onClick={handleClose}>Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
}