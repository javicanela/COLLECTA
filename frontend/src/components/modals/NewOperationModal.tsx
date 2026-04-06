import { useState, useEffect, useRef } from 'react';
import { useClientStore } from '../../stores/useClientStore';
import { useOperationStore } from '../../stores/useOperationStore';
import type { Client } from '../../types';
import { api } from '../../services/api';

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{2,3}$/;

interface NewOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIPOS = ['FISCAL', 'DECLARACIÓN ANUAL', 'NÓMINA', 'CONTABILIDAD', 'IMSS', 'OTRO'];

export default function NewOperationModal({ isOpen, onClose }: NewOperationModalProps) {
  const { clients, fetchClients } = useClientStore();
  const { createOperation } = useOperationStore();

  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  // Nuevo cliente inline
  const [creatingNew, setCreatingNew] = useState(false);
  const [newClientRfc, setNewClientRfc] = useState('');
  const [newClientNombre, setNewClientNombre] = useState('');
  const [newClientTel, setNewClientTel] = useState('');
  const [tipo, setTipo] = useState('FISCAL');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaVence, setFechaVence] = useState('');
  const [asesor, setAsesor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [asesores, setAsesores] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && clients.length === 0) {
      fetchClients();
    }
  }, [isOpen, clients.length, fetchClients]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    api.get<Record<string, string>>('/config')
      .then(cfg => {
        try {
          const lista = JSON.parse(cfg['asesores_lista'] || '[]');
          setAsesores(Array.isArray(lista) ? lista : []);
        } catch { setAsesores([]); }
      })
      .catch(() => {});
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredClients = clientSearch.length > 0
    ? clients.filter(c =>
        c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.rfc.toLowerCase().includes(clientSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const resetForm = () => {
    setClientSearch('');
    setSelectedClient(null);
    setShowDropdown(false);
    setCreatingNew(false);
    setNewClientRfc('');
    setNewClientNombre('');
    setNewClientTel('');
    setTipo('FISCAL');
    setDescripcion('');
    setMonto('');
    setFechaVence('');
    setAsesor('');
    setError('');
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearch(`${client.nombre} (${client.rfc})`);
    setShowDropdown(false);
    if (client.asesor) setAsesor(client.asesor);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient && !creatingNew) {
      setError('Selecciona un cliente o crea uno nuevo');
      return;
    }
    if (creatingNew) {
      if (!newClientRfc.trim()) { setError('El RFC es requerido'); return; }
      if (!RFC_REGEX.test(newClientRfc.trim().toUpperCase())) { setError('RFC inválido (formato SAT)'); return; }
      if (!newClientNombre.trim()) { setError('El nombre del cliente es requerido'); return; }
    }
    if (!monto || Number(monto) <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    if (!fechaVence) {
      setError('Selecciona fecha de vencimiento');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      let clientId = selectedClient?.id;

      // Crear cliente nuevo si aplica
      if (creatingNew) {
        const { fetchClients } = useClientStore.getState();
        const newClient = await api.post<{ id: string }>('/clients', {
          rfc: newClientRfc.trim().toUpperCase(),
          nombre: newClientNombre.trim(),
          telefono: newClientTel.trim() || undefined,
          estado: 'ACTIVO',
        });
        clientId = newClient.id;
        await fetchClients(); // refrescar directorio
      }

      await createOperation({
        clientId,
        tipo,
        descripcion: descripcion || undefined,
        monto: Number(monto),
        fechaVence: new Date(fechaVence).toISOString(),
        asesor: asesor || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear operación');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] sm:max-h-none overflow-hidden flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50 rounded-t-2xl shrink-0">
          <h2 className="text-lg font-bold text-slate-900">Nueva Operación</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="relative" ref={dropdownRef}>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Cliente *</label>
            <input
              type="text"
              value={clientSearch}
              onChange={e => {
                setClientSearch(e.target.value);
                setSelectedClient(null);
                setCreatingNew(false);
                setShowDropdown(true);
              }}
              onFocus={() => clientSearch.length > 0 && setShowDropdown(true)}
              placeholder="Buscar por nombre o RFC..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-1 focus:ring-bt-blue"
            />
            {selectedClient && (
              <span className="absolute right-3 top-8 text-bt-green text-sm">✓</span>
            )}
            {creatingNew && (
              <span className="absolute right-3 top-8 text-amber-500 text-sm">+</span>
            )}
            {showDropdown && clientSearch.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredClients.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClient(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                  >
                    <span className="font-semibold text-slate-800">{c.nombre}</span>
                    <span className="ml-2 font-mono text-slate-400 text-xs">{c.rfc}</span>
                  </button>
                ))}
                {filteredClients.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingNew(true);
                      setNewClientNombre(clientSearch.trim());
                      setNewClientRfc('');
                      setNewClientTel('');
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-amber-50 text-sm text-amber-700 font-semibold flex items-center gap-2"
                  >
                    <span className="text-base">+</span>
                    Crear nuevo cliente: &quot;{clientSearch}&quot;
                  </button>
                )}
                {filteredClients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingNew(true);
                      setNewClientNombre(clientSearch.trim());
                      setNewClientRfc('');
                      setNewClientTel('');
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-amber-50 text-xs text-amber-600 border-t border-slate-100 flex items-center gap-1"
                  >
                    <span>+</span> Crear nuevo: &quot;{clientSearch}&quot;
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mini-form para nuevo cliente */}
          {creatingNew && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Nuevo cliente</span>
                <button type="button" onClick={() => { setCreatingNew(false); setClientSearch(''); }} className="text-amber-500 hover:text-amber-700 text-xs">✕ Cancelar</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-0.5 block">RFC *</label>
                  <input
                    type="text"
                    value={newClientRfc}
                    onChange={e => setNewClientRfc(e.target.value.toUpperCase())}
                    placeholder="XAXX010101000"
                    maxLength={13}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-mono uppercase outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-0.5 block">Nombre *</label>
                  <input
                    type="text"
                    value={newClientNombre}
                    onChange={e => setNewClientNombre(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-500 mb-0.5 block">Teléfono (opcional)</label>
                  <input
                    type="text"
                    value={newClientTel}
                    onChange={e => setNewClientTel(e.target.value)}
                    placeholder="6641234567"
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>
              <p className="text-[10px] text-amber-600">Se creará en el Directorio automáticamente al guardar la operación.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Tipo *</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-1 focus:ring-bt-blue">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Asesor</label>
              {asesores.length > 0 ? (
                <select
                  value={asesor}
                  onChange={e => setAsesor(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-1 focus:ring-bt-blue"
                >
                  <option value="">Sin asesor</option>
                  {asesores.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={asesor}
                  onChange={e => setAsesor(e.target.value.toUpperCase())}
                  placeholder="Nombre del asesor"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono uppercase outline-none focus:ring-1 focus:ring-bt-blue"
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Descripción</label>
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Concepto o detalle..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-1 focus:ring-bt-blue"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Monto MXN *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-1 focus:ring-bt-blue font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Fecha Vence *</label>
              <input
                type="date"
                value={fechaVence}
                onChange={e => setFechaVence(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-1 focus:ring-bt-blue font-mono"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-bt-red text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost border-slate-200 px-5 py-2 w-full sm:w-auto">Cancelar</button>
            <button type="submit" disabled={isLoading} className="btn btn-green px-5 py-2 w-full sm:w-auto">
              {isLoading ? 'Creando...' : 'Crear Operación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
