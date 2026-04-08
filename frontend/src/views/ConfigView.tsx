import { useToast } from '../hooks/useToast';
import type { ToastType } from '../hooks/useToast';
import ToastContainer from '../components/ui/ToastContainer';
import { useState, useEffect, useRef, useCallback } from 'react';
import Topbar from '../components/Topbar';
import { Settings, Bot, Briefcase, MessageSquare, Users, FileImage, Eye, EyeOff, FileText, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { reemplazarVariables } from '../utils/whatsapp';
import type { Operation } from '../types';
import { pdf } from '@react-pdf/renderer';
import EstadoCuentaPDF from '../pdf-templates/EstadoCuentaPDF';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PlantillaModal } from '../components/modals/PlantillaModal';

// ─── Dummy data for PDF preview ──────────────────────────────────────────────
const DUMMY_CLIENT = {
  id: 'preview', rfc: 'XAXX010101000', nombre: 'Colegio de Anestesiologos',
  estado: 'ACTIVO' as const, regimen: 'Persona Moral', asesor: 'ASESOR DEMO',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};
const DUMMY_OPS: Operation[] = [
  {
    id: 'op1', clientId: 'preview', tipo: 'FISCAL',
    descripcion: 'Declaracion Anual 2024', monto: 2100,
    fechaVence: new Date(Date.now() - 12 * 86400000).toISOString(),
    estatus: 'VENCIDO', calculatedStatus: 'VENCIDO', diasRestantes: -12,
    excluir: false, archived: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'op2', clientId: 'preview', tipo: 'NOMINA',
    descripcion: 'Nomina Febrero 2025', monto: 1500,
    fechaVence: new Date(Date.now() + 3 * 86400000).toISOString(),
    estatus: 'POR VENCER', calculatedStatus: 'POR VENCER', diasRestantes: 3,
    excluir: false, archived: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'op3', clientId: 'preview', tipo: 'FISCAL',
    descripcion: 'IVA Enero 2025', monto: 850,
    fechaVence: new Date(Date.now() - 30 * 86400000).toISOString(),
    fechaPago: new Date(Date.now() - 28 * 86400000).toISOString(),
    estatus: 'PAGADO', calculatedStatus: 'PAGADO', diasRestantes: 0,
    excluir: false, archived: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

// ─── PdfPreviewButton ─────────────────────────────────────────────────────────
function PdfPreviewButton({ config, toast }: { config: Record<string, string>; toast: (type: ToastType, msg: string) => void }) {
  const [generating, setGenerating] = useState(false);

  const handlePreview = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
        <EstadoCuentaPDF
          client={DUMMY_CLIENT}
          operations={DUMMY_OPS}
          config={config}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Revoke after a delay to allow the tab to load the PDF
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('PDF preview error:', err);
      toast('err', 'Error al generar el preview. Revisa la consola.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePreview}
      disabled={generating}
      className="btn btn-blue px-4 py-2.5 font-bold flex items-center gap-2 text-sm disabled:opacity-50 shrink-0"
    >
      <FileText size={16} />
      {generating ? 'Generando...' : 'Generar preview PDF'}
    </button>
  );
}

const AccordionHeader = ({ id, icon: Icon, title, openAccordion, toggleAccordion }: { id: string, icon: LucideIcon, title: string, openAccordion: string, toggleAccordion: (id: string) => void }) => {
  const isOpen = openAccordion === id;
  return (
    <button
      onClick={() => toggleAccordion(id)}
      className="w-full flex items-center justify-between px-5 py-4 transition-all duration-200 focus:outline-none"
      style={{ 
        background: isOpen ? 'rgba(59,79,232,0.04)' : 'var(--c-surface-raised)', 
        borderBottom: '1px solid var(--c-border)', 
        color: 'var(--c-text)' 
      }}
    >
      <div className="flex items-center gap-3 font-bold text-sm">
        <Icon size={17} style={{ color: isOpen ? 'var(--brand-primary)' : 'var(--c-text-muted)' }} />
        {title}
      </div>
      <motion.span 
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ color: 'var(--c-text-muted)' }}
      >
        <ChevronDown size={18} />
      </motion.span>
    </button>
  );
};

const WA_VARIABLES = [
  '{NOMBRE_DESPACHO}', '{CLIENTE}', '{MONTO}', '{CONCEPTO}', '{FECHA}', '{DIAS}',
  '{BENEFICIARIO}', '{BANCO}', '{CLABE}', '{DEPTO}', '{TEL_DESPACHO}', '{EMAIL_DESPACHO}'
];

const SAMPLE_OP: Operation = {
  id: 'sample', clientId: 'sample', tipo: 'FISCAL',
  descripcion: 'Declaracion Anual 2024', monto: 2100,
  fechaVence: new Date(Date.now() - 12 * 86400000).toISOString(),
  estatus: 'VENCIDO', excluir: false, archived: false,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  client: { id: 'sample', rfc: 'COL860301H52', nombre: 'Colegio de Anestesiologos', estado: 'ACTIVO', createdAt: '', updatedAt: '' },
};

interface TemplateEditorProps {
  label: string;
  configKey: string;
  defaultTemplate: string;
  value: string;
  onChange: (val: string) => void;
  config: Record<string, string>;
}

function TemplateEditor({ label, value, onChange, config, defaultTemplate }: TemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isModified = value !== defaultTemplate;

  const handleRestore = () => {
    if (isModified && confirm('¿Restaurar la plantilla por defecto? Se perderán los cambios no guardados.')) {
      onChange(defaultTemplate);
    }
  };

  const insertVariable = useCallback((variable: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = value.substring(0, start) + variable + value.substring(end);
    onChange(newVal);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + variable.length;
    }, 0);
  }, [value, onChange]);

  const preview = reemplazarVariables(value || defaultTemplate, SAMPLE_OP, {
    nombre_despacho: config.nombre_despacho || 'Collecta',
    beneficiario: config.beneficiario || 'Juan Perez',
    banco: config.banco || 'BBVA',
    clabe: config.clabe || '012345678901234567',
    depto: config.depto || 'Depto. Cobranza',
    tel: config.tel || '6641234567',
    email: config.email || 'cobranza@collecta.mx',
    ...config,
  });

  return (
    <div className="space-y-4 p-4 rounded-xl" style={{ background: 'var(--c-surface-raised)', border: '1px solid var(--c-border)' }}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-2)' }}>{label}</label>
        {isModified && (
          <button
            type="button"
            onClick={handleRestore}
            className="text-xs font-semibold px-2 py-1 rounded-full transition-colors hover:bg-amber-100"
            style={{ color: '#e07820', background: 'rgba(224,120,32,0.1)' }}
          >
            ↺ Restaurar default
          </button>
        )}
      </div>
      {/* Variable chips */}
      <div className="flex flex-wrap gap-1.5">
        {WA_VARIABLES.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => insertVariable(v)}
            className="px-2 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer hover:scale-105"
            style={{ background: 'rgba(59,130,246,0.10)', color: 'var(--brand-info)', border: '1px solid rgba(59,130,246,0.20)' }}
          >
            {v}
          </button>
        ))}
      </div>
      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultTemplate}
        className="font-mono text-sm"
      />
      {/* WA preview */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        <div className="px-4 py-2 text-[10px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-2" style={{ background: '#075e54' }}>
          <MessageSquare size={12} />
          Vista previa WhatsApp
        </div>
        <div className="p-4 min-h-[80px]" style={{ background: '#e5ddd5' }}>
          <div className="rounded-lg px-4 py-3 max-w-[85%] ml-auto shadow-sm" style={{ background: '#dcf8c6' }}>
            <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">{preview}</p>
            <p className="text-[10px] text-slate-400 text-right mt-1">12:00 PM ✓✓</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_MSG_VENCIDO = `*{NOMBRE_DESPACHO}* - Recordatorio de Pago Vencido
Estimado *{CLIENTE}*, Su cuenta presenta un saldo total vencido de *{TOTAL}* ({CANTIDAD} operaciones pendientes)
Detalle de la operacion mas urgente: {MONTO} - {CONCEPTO} | Vence: {FECHA} (*{DIAS} dias de retraso*)
Datos para Transferencia: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}
{DEPTO} | {TEL_DESPACHO} | {EMAIL_DESPACHO}`;

const DEFAULT_MSG_HOY = `*{NOMBRE_DESPACHO}* - Vencimiento Hoy
Estimado *{CLIENTE}*, Su cuenta tiene un saldo pendiente de *{TOTAL}* ({CANTIDAD} operaciones pendientes)
La operacion que vence hoy: *{MONTO}* - {CONCEPTO}
Datos para Transferencia: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}
{DEPTO} | {TEL_DESPACHO}`;

const DEFAULT_MSG_RECORDATORIO = `*{NOMBRE_DESPACHO}* - Recordatorio de Pago
Estimado *{CLIENTE}*, Le informamos que su saldo pendiente es de *{TOTAL}* ({CANTIDAD} operaciones pendientes)
Proxima operacion a vencer: {MONTO} - {CONCEPTO} | Vence: {FECHA} ({DIAS} dias restantes)
Datos para Transferencia: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}
{DEPTO} | {TEL_DESPACHO}`;

// ────────────────────────────────────────────────────────────────────────────────
// AI Provider types
// ────────────────────────────────────────────────────────────────────────────────
type ProviderKey = 'gemini' | 'groq' | 'openrouter';
type ProviderStatus = 'idle' | 'testing' | 'ok' | 'error' | 'nokey';

interface ProviderInfo {
  id: ProviderKey;
  label: string;
  configKey: string;
  model: string;
  placeholder: string;
}

const PROVIDERS: ProviderInfo[] = [
  { id: 'gemini', label: 'Gemini Flash', configKey: 'gemini_api_key', model: 'gemini-1.5-flash', placeholder: 'AIza...' },
  { id: 'groq', label: 'Groq Llama', configKey: 'groq_api_key', model: 'llama-3.1-8b-instant', placeholder: 'gsk_...' },
  { id: 'openrouter', label: 'OpenRouter Mistral', configKey: 'openrouter_api_key', model: 'mistral-7b-instruct', placeholder: 'sk-or-...' },
];

// ────────────────────────────────────────────────────────────────────────────────
// ProviderRow — single row for a provider with key input + test button
// ────────────────────────────────────────────────────────────────────────────────
interface ProviderRowProps {
  info: ProviderInfo;
  value: string;
  onChange: (val: string) => void;
  isLastProvider: boolean;
}

function ProviderRow({ info, value, onChange, isLastProvider }: ProviderRowProps) {
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<ProviderStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('Probando...');

  const handleTest = async () => {
    setStatus('testing');
    setStatusMsg('Probando...');
    try {
      const result = await api.post<{ success: boolean; provider: string; message: string; hasKey: boolean }>(
        '/extract/test-provider',
        { provider: info.id }
      );
      if (!result.hasKey) {
        setStatus('nokey');
        setStatusMsg('Sin API key');
      } else if (result.success) {
        setStatus('ok');
        setStatusMsg('Activo');
      } else {
        setStatus('error');
        setStatusMsg(result.message || 'Error');
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err.message || 'Error de red');
    }
  };

  const getStatusBadge = () => {
    if (status === 'testing') return <span className="text-xs font-bold animate-pulse" style={{ color: 'var(--c-text-muted)' }}>{statusMsg}</span>;
    if (status === 'ok') return <Badge status="ACTIVO" size="sm" />;
    if (status === 'nokey') return <span className="text-xs font-bold" style={{ color: 'var(--c-text-muted)' }}>{statusMsg}</span>;
    if (status === 'error') return <span className="text-xs font-bold" style={{ color: 'var(--brand-danger)' }} title={statusMsg}>✗ {statusMsg}</span>;
    return null;
  };

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--c-surface-raised)', border: '1px solid var(--c-border)' }}>
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm" style={{ color: 'var(--c-text)' }}>{info.label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--c-text-muted)', background: 'var(--c-surface)' }}>{info.model}</span>
          {isLastProvider && (
            <Badge status="AL CORRIENTE" size="sm" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <Button variant="blue" size="sm" onClick={handleTest} disabled={status === 'testing'}>
            Probar
          </Button>
        </div>
      </div>

      {/* Key input */}
      <div className="relative">
        <Input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={value ? '••••••••••••••••••••' : info.placeholder}
          className="font-mono pr-10"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="focus:outline-none"
              tabIndex={-1}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />
      </div>
      {value && (
        <p className="text-[10px] font-medium" style={{ color: 'var(--c-text-muted)' }}>
          Guardada en Config (base de datos). Tiene prioridad sobre el archivo .env del servidor.
        </p>
      )}
    </div>
  );
}

export default function ConfigView() {
  const [openAccordion, setOpenAccordion] = useState<string>('sistema');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toasts, toast } = useToast();
  const [asesoresList, setAsesoresList] = useState<string[]>([]);
  const [nuevoAsesor, setNuevoAsesor] = useState('');

  // AI generic test state
  const [aiTesting, setAiTesting] = useState(false);
  const [aiResult, setAiResult] = useState<{ success: boolean; message: string } | null>(null);
  // Last provider used (from Config)
  const [lastProvider, setLastProvider] = useState<string | null>(null);

  // Plantillas personalizadas
  const [customPlantillas, setCustomPlantillas] = useState<{key: string; nombre: string; valor: string}[]>([]);
  const [isPlantillaModalOpen, setIsPlantillaModalOpen] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<{key: string; nombre: string; valor: string} | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Claves que se guardan por separado y deben excluirse del bulk save
  const BULK_EXCLUDE_KEYS = ['pdf_template_image'];

  useEffect(() => {
    api.get<Record<string, string>>('/config')
      .then(data => {
        setConfig(data);
        try {
          const lista = JSON.parse(data['asesores_lista'] || '[]');
          setAsesoresList(Array.isArray(lista) ? lista : []);
        } catch { setAsesoresList([]); }

        // Cargar plantillas personalizadas
        const plantillasKeys = Object.keys(data).filter(k => k.startsWith('plantilla_') && 
          !['plantilla_vencido', 'plantilla_hoy', 'plantilla_recordatorio'].includes(k));
        const plantillasList = plantillasKeys.map(k => ({ 
          key: k, 
          nombre: k.replace('plantilla_', '').replace(/_/g, ' ').toUpperCase(), 
          valor: data[k] || '' 
        }));
        setCustomPlantillas(plantillasList);
      })
      .catch(err => console.error('Error fetching config:', err));

    // Fetch provider status to know last provider used
    api.get<{ lastProvider: string | null }>('/extract/provider-status')
      .then(data => setLastProvider(data.lastProvider))
      .catch(() => { /* non-critical */ });
  }, []);

  const updateConfig = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const entries = Object.entries(config)
        .filter(([key, value]) => !BULK_EXCLUDE_KEYS.includes(key) && value != null)
        .map(([key, value]) => ({ key, value }));
      await api.post('/config/bulk', entries);
      
      // Sincronizar modo con MainLayout via localStorage
      const modoEntry = entries.find(e => e.key === 'modo');
      if (modoEntry) {
        localStorage.setItem('sys_modo', modoEntry.value);
        window.dispatchEvent(new CustomEvent('modo-changed', { detail: modoEntry.value }));
      }
      
      setIsDirty(false);
      toast('ok', 'Configuracion guardada correctamente.');
    } catch (err: any) {
      toast('err', err.message || 'Error al guardar la configuracion.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAI = async () => {
    setAiTesting(true);
    setAiResult(null);
    try {
      const result = await api.post<{ success: boolean; provider?: string; message?: string; error?: string }>('/extract/test', {});
      setAiResult({ success: result.success, message: result.message || `Conectado via ${result.provider}` });
      if (result.provider) setLastProvider(result.provider);
    } catch (err: any) {
      setAiResult({ success: false, message: err.message || 'Error de conexion' });
    } finally {
      setAiTesting(false);
    }
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordion(prev => prev === id ? '' : id);
  };

  const handleSaveAsesores = async (nueva: string[]) => {
    await api.put('/config/asesores_lista', { value: JSON.stringify(nueva) });
    setAsesoresList(nueva);
  };

  return (
    <>
      <Topbar
        title="Configuracion"
        subtitle="Datos del despacho y sistema"
      />

      <div className="p-5 max-w-7xl mx-auto w-full flex flex-col gap-3 pb-24">
        {/* Sistema */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow-sm)' }}>
          <AccordionHeader id="sistema" icon={Settings} title="Sistema" openAccordion={openAccordion} toggleAccordion={toggleAccordion} />
          <AnimatePresence>
            {openAccordion === 'sistema' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5" style={{ background: 'var(--c-surface)' }}>
                  <div>
                    <label className="label">Modo del Sistema</label>
                    <select 
                      className="input-base"
                      value={config.modo === 'PRODUCCION' ? 'PRODUCCION' : 'PRUEBA'}
                      onChange={(e) => {
                        const val = e.target.value;
                        const modoActual = config.modo === 'PRODUCCION' ? 'PRODUCCION' : 'PRUEBA';
                        if (val === 'PRODUCCION' && modoActual !== 'PRODUCCION') {
                          if (!confirm('⚠️ ¿Estás seguro de activar MODO PRODUCCIÓN?\n\nLos mensajes de WhatsApp se enviarán directamente a los clientes. Esta acción no se puede deshacer.')) {
                            return;
                          }
                        }
                        updateConfig('modo', val);
                      }}
                    >
                      <option value="PRUEBA">🟢 PRUEBA — Mensajes redirigen al numero de prueba</option>
                      <option value="PRODUCCION">🔴 PRODUCCION — Mensajes directos al cliente</option>
                    </select>
                  </div>
                  <Input
                    label="Numero de Prueba WhatsApp"
                    placeholder="+526641234567 o 6641234567"
                    value={config.telPrueba || ''}
                    onChange={(e) => updateConfig('telPrueba', e.target.value)}
                    helperText="Nacional, 10 digitos"
                    className="font-mono"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Datos del Despacho */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow-sm)' }}>
          <AccordionHeader id="despacho" icon={Briefcase} title="Datos del Despacho" openAccordion={openAccordion} toggleAccordion={toggleAccordion} />
          <AnimatePresence>
            {openAccordion === 'despacho' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5" style={{ background: 'var(--c-surface)' }}>
                  <Input
                    label="Nombre del Despacho"
                    value={config.nombre_despacho || ''}
                    onChange={(e) => updateConfig('nombre_despacho', e.target.value)}
                    placeholder="Collecta"
                  />
                  <Input
                    label="Departamento"
                    value={config.depto || ''}
                    onChange={(e) => updateConfig('depto', e.target.value)}
                    placeholder="Depto. Cobranza"
                  />
                  <Input
                    label="Telefono"
                    value={config.tel || ''}
                    onChange={(e) => updateConfig('tel', e.target.value)}
                    placeholder="6641234567"
                    className="font-mono"
                  />
                  <Input
                    label="Email"
                    value={config.email || ''}
                    onChange={(e) => updateConfig('email', e.target.value)}
                    placeholder="cobranza@despacho.mx"
                  />
                  <Input
                    label="Beneficiario"
                    value={config.beneficiario || ''}
                    onChange={(e) => updateConfig('beneficiario', e.target.value)}
                  />
                  <Input
                    label="Banco"
                    value={config.banco || ''}
                    onChange={(e) => updateConfig('banco', e.target.value)}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="CLABE Interbancaria"
                      value={config.clabe || ''}
                      onChange={(e) => updateConfig('clabe', e.target.value.replace(/\D/g, '').slice(0, 18))}
                      placeholder="18 digitos"
                      className="font-mono tracking-widest"
                      maxLength={18}
                      error={config.clabe && config.clabe.length > 0 && config.clabe.length !== 18 ? `${config.clabe.length}/18 digitos` : undefined}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* APIs de IA */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow-sm)' }}>
          <AccordionHeader id="ai" icon={Bot} title="APIs de Inteligencia Artificial" openAccordion={openAccordion} toggleAccordion={toggleAccordion} />
          <AnimatePresence>
            {openAccordion === 'ai' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="p-5 space-y-5" style={{ background: 'var(--c-surface)' }}>
                  {/* Description */}
                  <div className="flex items-start gap-3 rounded-lg px-4 py-3" style={{ background: 'var(--c-surface-raised)', border: '1px solid var(--c-border)' }}>
                    <Bot size={16} className="text-bt-navy mt-0.5 shrink-0" />
                    <div className="text-xs space-y-1" style={{ color: 'var(--c-text-2)' }}>
                      <p className="font-bold" style={{ color: 'var(--c-text)' }}>Cascada de 4 niveles: Gemini Flash → Groq Llama → OpenRouter Mistral → Regex fallback</p>
                      <p>Las keys guardadas aqui tienen prioridad sobre el archivo <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">backend/.env</code>. Guarda la configuracion con el boton verde para persistir los cambios.</p>
                    </div>
                  </div>

                  {/* Last provider used */}
                  {lastProvider && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--brand-success)' }}></span>
                      Ultimo provider utilizado en extraccion:
                      <span className="font-bold text-slate-700 uppercase">{lastProvider}</span>
                    </div>
                  )}

                  {/* Provider rows */}
                  <div className="space-y-3">
                    {PROVIDERS.map(p => (
                      <ProviderRow
                        key={p.id}
                        info={p}
                        value={config[p.configKey] || ''}
                        onChange={val => updateConfig(p.configKey, val)}
                        isLastProvider={lastProvider === p.id}
                      />
                    ))}
                  </div>

                  {/* Generic cascade test */}
                  <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--c-border)' }}>
                    <Button
                      variant="blue"
                      onClick={handleTestAI}
                      disabled={aiTesting}
                    >
                      {aiTesting ? 'Probando cascada...' : 'Probar cascada completa'}
                    </Button>
                    {aiResult && (
                      <span className={`text-sm font-bold ${aiResult.success ? 'text-bt-green' : 'text-bt-red'}`}>
                        {aiResult.success ? '✓' : '✕'} {aiResult.message}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] font-medium" style={{ color: 'var(--c-text-muted)' }}>
                    Nota: el boton "Probar cascada" usa todos los providers en orden hasta encontrar uno que funcione. Usa "Probar" en cada row para testear un provider especifico.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Plantillas WA */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow-sm)' }}>
          <AccordionHeader id="wa" icon={MessageSquare} title="Plantillas de Mensajes WhatsApp" openAccordion={openAccordion} toggleAccordion={toggleAccordion} />
          <AnimatePresence>
            {openAccordion === 'wa' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="p-5 space-y-6" style={{ background: 'var(--c-surface)' }}>
                  <TemplateEditor
                    label="Mensaje — VENCIDO"
                    configKey="plantilla_vencido"
                    defaultTemplate={DEFAULT_MSG_VENCIDO}
                    value={config.plantilla_vencido || DEFAULT_MSG_VENCIDO}
                    onChange={(val) => updateConfig('plantilla_vencido', val)}
                    config={config}
                  />
                  <TemplateEditor
                    label="Mensaje — HOY VENCE"
                    configKey="plantilla_hoy"
                    defaultTemplate={DEFAULT_MSG_HOY}
                    value={config.plantilla_hoy || DEFAULT_MSG_HOY}
                    onChange={(val) => updateConfig('plantilla_hoy', val)}
                    config={config}
                  />
                  <TemplateEditor
                    label="Mensaje — RECORDATORIO (Por Vencer)"
                    configKey="plantilla_recordatorio"
                    defaultTemplate={DEFAULT_MSG_RECORDATORIO}
                    value={config.plantilla_recordatorio || DEFAULT_MSG_RECORDATORIO}
                    onChange={(val) => updateConfig('plantilla_recordatorio', val)}
                    config={config}
                  />

                  {/* Plantillas personalizadas adicionales */}
                  <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--c-border)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                        Plantillas Personalizadas
                      </h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { setEditingPlantilla(null); setIsPlantillaModalOpen(true); }}
                      >
                        + Nueva Plantilla
                      </Button>
                    </div>
                    
                    {customPlantillas.length === 0 ? (
                      <p className="text-sm py-3" style={{ color: 'var(--c-text-muted)' }}>
                        No hay plantillas personalizadas. Crea una para usar en tus mensajes.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {customPlantillas.map(p => (
                          <div 
                            key={p.key} 
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{ background: 'var(--c-surface-raised)', border: '1px solid var(--c-border)' }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate" style={{ color: 'var(--c-text)' }}>
                                {p.nombre}
                              </p>
                              <p className="text-xs truncate" style={{ color: 'var(--c-text-muted)' }}>
                                {p.valor.substring(0, 60)}...
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button 
                                onClick={() => { setEditingPlantilla(p); setIsPlantillaModalOpen(true); }}
                                className="p-1.5 rounded hover:bg-violet-100 text-violet-600"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm(`¿Eliminar plantilla "${p.nombre}"?`)) {
                                    api.del(`/config/${p.key}`).then(() => {
                                      setCustomPlantillas(prev => prev.filter(x => x.key !== p.key));
                                      toast('ok', 'Plantilla eliminada');
                                    });
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-red-100 text-red-600"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Estado de Cuenta PDF */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow-sm)' }}>
          <AccordionHeader id="pdf" icon={FileImage} title="Estado de Cuenta PDF" openAccordion={openAccordion} toggleAccordion={toggleAccordion} />
          <AnimatePresence>
            {openAccordion === 'pdf' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="p-5 space-y-6" style={{ background: 'var(--c-surface)' }}>

                  {/* Indicador de modo actual + boton preview */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border font-semibold text-sm
                      ${config['pdf_template_mode'] === 'imagen'
                        ? 'bg-green-50 border-green-200 text-bt-green'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                      <FileImage size={18} />
                      {config['pdf_template_mode'] === 'imagen'
                        ? '✓ Usando plantilla personalizada'
                        : 'Usando formato estandar (sin imagen)'}
                    </div>
                    <PdfPreviewButton config={config} toast={toast} />
                  </div>

                  {/* Colores */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--c-text-muted)' }}>Colores</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Header',          key: 'color_header',      fallback: '#0c2340' },
                        { label: 'Banda cliente',   key: 'color_client_band', fallback: '#102440' },
                        { label: 'Bloque bancario', key: 'color_bank_block',  fallback: '#0c2340' },
                        { label: 'Fondo tabla',     key: 'color_table_bg',    fallback: '#f1f5f9' },
                        { label: 'Texto cuerpo',    key: 'color_body_text',   fallback: '#334155' },
                        { label: 'Acento',          key: 'color_accent',      fallback: '#3dba4e' },
                      ].map(({ label, key, fallback }) => (
                        <div key={key} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: 'var(--c-surface-raised)', border: '1px solid var(--c-border)' }}>
                          <input
                            type="color"
                            value={config[`pdf_param_${key}`] || fallback}
                            onChange={e => updateConfig(`pdf_param_${key}`, e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0"
                            title={label}
                          />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider leading-none mb-0.5" style={{ color: 'var(--c-text-muted)' }}>{label}</p>
                            <p className="text-xs font-mono" style={{ color: 'var(--c-text)' }}>{config[`pdf_param_${key}`] || fallback}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fuentes */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--c-text-muted)' }}>Fuentes</p>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Tamano titulo (pt)', key: 'font_size_title', fallback: '14', min: 10, max: 24 },
                        { label: 'Tamano datos (pt)',  key: 'font_size_data',  fallback: '8',  min: 6,  max: 14 },
                      ].map(({ label, key, fallback, min, max }) => (
                        <div key={key} className="space-y-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>
                            {label} — <span className="text-bt-blue">{config[`pdf_param_${key}`] || fallback}pt</span>
                          </label>
                          <input
                            type="range"
                            min={min}
                            max={max}
                            value={Number(config[`pdf_param_${key}`] || fallback)}
                            onChange={e => updateConfig(`pdf_param_${key}`, e.target.value)}
                            className="w-full accent-bt-blue"
                          />
                          <div className="flex justify-between text-[10px]" style={{ color: 'var(--c-text-muted)' }}>
                            <span>{min}pt</span><span>{max}pt</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Margenes */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--c-text-muted)' }}>Margenes (puntos pt)</p>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Superior', key: 'margin_top',    fallback: '30' },
                        { label: 'Inferior', key: 'margin_bottom', fallback: '30' },
                        { label: 'Laterales', key: 'margin_side',  fallback: '30' },
                      ].map(({ label, key, fallback }) => (
                        <div key={key} className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>{label}</label>
                          <Input
                            type="number"
                            min={10}
                            max={80}
                            value={config[`pdf_param_${key}`] || fallback}
                            onChange={(e) => updateConfig(`pdf_param_${key}`, e.target.value)}
                            className="font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Secciones visibles */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--c-text-muted)' }}>Mostrar / Ocultar secciones</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Logo / imagen',        key: 'show_logo',         fallback: 'false' },
                        { label: 'Bloque bancario',       key: 'show_bank_block',   fallback: 'true'  },
                        { label: 'Historial de pagos',    key: 'show_pay_history',  fallback: 'true'  },
                        { label: 'Footer',                key: 'show_footer',       fallback: 'true'  },
                      ].map(({ label, key, fallback }) => {
                        const isOn = (config[`pdf_param_${key}`] ?? fallback) === 'true';
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => updateConfig(`pdf_param_${key}`, isOn ? 'false' : 'true')}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-colors
                              ${isOn
                                ? 'bg-bt-green/10 border-bt-green/30 text-bt-green'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                          >
                            <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${isOn ? 'bg-bt-green border-bt-green' : 'border-slate-300'}`} />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Textos personalizados */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--c-text-muted)' }}>Textos del documento</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Titulo del documento"
                        placeholder="ESTADO DE CUENTA"
                        value={config['pdf_param_doc_title'] || ''}
                        onChange={(e) => updateConfig('pdf_param_doc_title', e.target.value)}
                        helperText="Default: ESTADO DE CUENTA"
                      />
                      <Input
                        label="Leyenda legal / pie"
                        placeholder="Documento generado por Collecta"
                        value={config['pdf_param_legal_text'] || ''}
                        onChange={(e) => updateConfig('pdf_param_legal_text', e.target.value)}
                        helperText="Aparece al final del documento"
                      />
                    </div>
                  </div>

                  {/* Imagen de plantilla */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--c-text-muted)' }}>Imagen de fondo / plantilla</p>

                    {config['pdf_template_image'] && (
                      <div className="space-y-3 mb-4">
                        <div className="border rounded-lg overflow-hidden w-fit shadow-sm" style={{ borderColor: 'var(--c-border)' }}>
                          <img
                            src={config['pdf_template_image']}
                            alt="Plantilla PDF"
                            className="max-h-48 max-w-xs object-contain"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            if (!confirm('¿Eliminar la plantilla personalizada? El PDF volvera al formato estandar.')) return;
                            await api.put('/config/pdf_template_image', { value: '' });
                            await api.put('/config/pdf_template_mode', { value: 'default' });
                            setConfig(prev => ({ ...prev, pdf_template_image: '', pdf_template_mode: 'default' }));
                            toast('ok', 'Plantilla eliminada. Se usara formato estandar.');
                          }}
                          className="text-bt-red"
                        >
                          Eliminar plantilla
                        </Button>
                      </div>
                    )}

                    <p className="text-xs mb-3" style={{ color: 'var(--c-text-muted)' }}>
                      Sube una imagen PNG o JPG (tamano carta recomendado: 2550x3300px). Maximo 500 KB. Se usara como fondo/cabecera de cada pagina del estado de cuenta.
                    </p>
                    <label className="btn btn-ghost bg-slate-50 border border-slate-300 text-slate-700 hover:border-bt-blue hover:text-bt-blue font-bold px-5 py-3 cursor-pointer flex items-center gap-2 w-fit">
                      <FileImage size={18} />
                      {config['pdf_template_image'] ? 'Reemplazar imagen' : 'Seleccionar imagen (PNG / JPG)'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            toast('warn', `La imagen supera el limite de 2 MB (${(file.size / 1024 / 1024).toFixed(1)} MB). Comprime antes de subir.`);
                            e.target.value = '';
                            return;
                          }
                          if (file.size > 500 * 1024) {
                            if (!confirm(`La imagen pesa ${(file.size / 1024).toFixed(0)} KB (recomendado < 500 KB). Puede afectar el rendimiento del PDF. ¿Continuar de todas formas?`)) {
                              e.target.value = '';
                              return;
                            }
                          }
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const base64 = ev.target?.result as string;
                            try {
                              await api.put('/config/pdf_template_image', { value: base64 });
                              await api.put('/config/pdf_template_mode', { value: 'imagen' });
                              setConfig(prev => ({ ...prev, pdf_template_image: base64, pdf_template_mode: 'imagen' }));
                              toast('ok', 'Imagen de plantilla guardada.');
                            } catch {
                              toast('err', 'Error al guardar la imagen. Intenta de nuevo.');
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Asesores */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow-sm)' }}>
          <AccordionHeader id="asesores" icon={Users} title="Asesores del Despacho" openAccordion={openAccordion} toggleAccordion={toggleAccordion} />
          <AnimatePresence>
            {openAccordion === 'asesores' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="p-5" style={{ background: 'var(--c-surface)' }}>
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={nuevoAsesor}
                      onChange={(e) => setNuevoAsesor(e.target.value.toUpperCase())}
                      placeholder="Nombre del asesor"
                      className="font-mono uppercase flex-1"
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter' && nuevoAsesor.trim()) {
                          const nueva = [...asesoresList, nuevoAsesor.trim()];
                          handleSaveAsesores(nueva);
                          setNuevoAsesor('');
                        }
                      }}
                    />
                    <Button
                      variant="green"
                      onClick={() => {
                        if (!nuevoAsesor.trim()) return;
                        const nueva = [...asesoresList, nuevoAsesor.trim()];
                        handleSaveAsesores(nueva);
                        setNuevoAsesor('');
                      }}
                    >Agregar</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {asesoresList.length === 0
                      ? <p className="text-sm italic" style={{ color: 'var(--c-text-muted)' }}>No hay asesores registrados.</p>
                      : asesoresList.map((a, i) => (
                          <span key={i} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold" style={{ background: 'var(--c-surface-raised)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
                            {a}
                            <button
                              className="font-black ml-1"
                              style={{ color: 'var(--c-text-muted)' }}
                              onClick={() => {
                                if (confirm(`¿Eliminar asesor "${a}"?`)) {
                                  const nueva = asesoresList.filter((_, idx) => idx !== i);
                                  handleSaveAsesores(nueva);
                                }
                              }}
                            >×</button>
                          </span>
                        ))
                    }
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t z-50" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {isDirty ? (
            <span className="flex items-center gap-2 text-sm font-medium text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Cambios sin guardar
            </span>
          ) : (
            <span className="text-sm text-slate-400">Todo guardado</span>
          )}
          <Button
            variant="green"
            size="lg"
            onClick={handleSave}
            loading={isLoading}
            leftIcon={!isLoading ? <Settings size={18} /> : undefined}
          >
            {isLoading ? 'Guardando...' : 'Guardar Configuracion'}
          </Button>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
      
      <PlantillaModal
        isOpen={isPlantillaModalOpen}
        onClose={() => { setIsPlantillaModalOpen(false); setEditingPlantilla(null); }}
        plantilla={editingPlantilla}
        onSave={async (_key, nombre, valor) => {
          const configKey = `plantilla_${nombre.toLowerCase().replace(/\s+/g, '_')}`;
          try {
            await api.put(`/config/${configKey}`, { value: valor });
            updateConfig(configKey, valor);
            if (editingPlantilla) {
              setCustomPlantillas(prev => prev.filter(p => p.key !== editingPlantilla.key).concat({ key: configKey, nombre, valor }));
            } else {
              setCustomPlantillas(prev => [...prev, { key: configKey, nombre, valor }]);
            }
            toast('ok', editingPlantilla ? 'Plantilla actualizada' : 'Plantilla creada');
          } catch {
            toast('err', 'Error al guardar la plantilla');
          }
        }}
      />
    </>
  );
}
