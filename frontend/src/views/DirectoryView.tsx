import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientStore } from '../stores/useClientStore';
import type { Client, ClienteEstado } from '../types';
import Topbar from '../components/Topbar';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Button, IconButton } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { Pencil, ClipboardList, Trash2, Search, UserPlus, Users } from 'lucide-react';
import { ClientService } from '../services/clientService';
import type { Column } from '../components/ui/Table';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ui/ToastContainer';

export default function DirectoryView() {
  const { clients, fetchClients, createClient, deleteClient, toggleStatus, isLoading } = useClientStore();
  const navigate = useNavigate();
  const { toasts, toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [asesorFilter, setAsesorFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Client>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null; nombre: string }>({ open: false, id: null, nombre: '' });
  const [confirmToggle, setConfirmToggle] = useState<{ open: boolean; id: string | null; nombre: string; current: string }>({ open: false, id: null, nombre: '', current: 'ACTIVO' });

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const asesores = useMemo(() => {
    const set = new Set(clients.map(c => c.asesor).filter((a): a is string => !!a));
    return Array.from(set).sort();
  }, [clients]);

  const filteredClients = useMemo(() => clients.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.rfc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === '' || c.estado === statusFilter;
    const matchAsesor = asesorFilter === '' || c.asesor === asesorFilter;
    return matchSearch && matchStatus && matchAsesor;
  }), [clients, searchQuery, statusFilter, asesorFilter]);

  const handleToggleStatus = (id: string, nombre: string, current: string) => {
    setConfirmToggle({ open: true, id, nombre, current });
  };

  const handleDelete = (id: string, nombre: string) => {
    setConfirmDelete({ open: true, id, nombre });
  };

  const handleViewOps = (rfc: string) => navigate(`/?cliente=${encodeURIComponent(rfc)}`);

  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setIsSavingEdit(true);
    try {
      await ClientService.update(editingClient.id, editFormData);
      await fetchClients();
      setEditingClient(null);
      setEditFormData({});
      toast('ok', 'Cliente actualizado correctamente');
    } catch (err: any) {
      toast('err', err.message || 'Error al guardar los cambios');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.nombre && formData.rfc) {
      createClient({ ...formData, estado: 'ACTIVO', categoria: 'General' });
      setIsModalOpen(false);
      setFormData({});
    }
  };

  const columns: Column<Client>[] = [
    { key: 'rfc', header: 'RFC', width: '140px', render: (c) => <span className="font-mono text-xs tracking-wider">{c.rfc}</span> },
    { key: 'nombre', header: 'Cliente', render: (c) => <span className="font-semibold">{c.nombre}</span> },
    { key: 'email', header: 'Correo', render: (c) => <span className="text-sm">{c.email || '—'}</span> },
    { key: 'telefono', header: 'Teléfono', width: '130px', render: (c) => <span className="font-mono text-xs">{c.telefono || '—'}</span> },
    { key: 'regimen', header: 'Régimen', width: '100px', render: (c) => <span className="text-xs uppercase">{c.regimen || '—'}</span> },
    { key: 'asesor', header: 'Asesor', width: '120px', render: (c) => <span className="text-xs tracking-wide">{c.asesor || '—'}</span> },
    { key: 'categoria', header: 'Categoría', width: '100px', render: (c) => <span className="text-xs font-bold uppercase">{c.categoria || 'GENERAL'}</span> },
    { key: 'createdAt', header: 'Alta', width: '100px', render: (c) => <span className="font-mono text-xs">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span> },
    { key: 'estado', header: 'Estado', width: '120px', render: (c) => (
      <span title={c.estado === 'ACTIVO' ? 'Click para suspender' : 'Click para reactivar'}>
        <Badge 
          status={c.estado} 
          onClick={() => handleToggleStatus(c.id, c.nombre, c.estado)}
        />
      </span>
    )},
    { key: 'acciones', header: '', width: '120px', align: 'right', render: (c) => (
      <div className="flex items-center justify-end gap-1">
        <IconButton icon={<Pencil size={13} />} variant="blue" size="sm" label="Editar" onClick={() => { setEditingClient(c); setEditFormData({ ...c }); }} />
        <IconButton icon={<ClipboardList size={13} />} variant="blue" size="sm" label="Ver operaciones" onClick={() => handleViewOps(c.rfc)} />
        <IconButton icon={<Trash2 size={13} />} variant="gray" size="sm" label="Eliminar" onClick={() => handleDelete(c.id, c.nombre)} />
      </div>
    )},
  ];

  return (
    <>
      <Topbar
        title="Directorio"
        subtitle="Base maestra de clientes"
        actions={
          <Button leftIcon={<UserPlus size={16} />} onClick={() => setIsModalOpen(true)}>+ Cliente</Button>
        }
      />

      <div className="p-5 max-w-7xl mx-auto w-full flex flex-col gap-5">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <div className="w-64">
            <Input
              placeholder="RFC / Nombre / Correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>
          <div className="w-40">
            <Select
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'ACTIVO', label: 'Activos' },
                { value: 'SUSPENDIDO', label: 'Suspendidos' },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as string)}
            />
          </div>
          <div className="w-48">
            <Select
              options={[
                { value: '', label: 'Todos los asesores' },
                ...asesores.map(a => ({ value: a, label: a })),
              ]}
              value={asesorFilter}
              onChange={(val) => setAsesorFilter(val as string)}
            />
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={filteredClients}
          keyExtractor={(c) => c.id}
          loading={isLoading}
          loadingRows={6}
          emptyMessage={searchQuery || statusFilter || asesorFilter 
            ? "No se encontraron clientes con los filtros aplicados" 
            : "No hay clientes registrados"}
          emptyIcon={<Users size={32} strokeWidth={1.5} />}
          hoverable
          striped
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        title={editingClient ? `Editar Cliente — ${editingClient.rfc}` : 'Editar Cliente'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingClient(null)} disabled={isSavingEdit}>Cancelar</Button>
            <Button
              loading={isSavingEdit}
              disabled={isSavingEdit}
              onClick={() => handleEditSubmit({ preventDefault: () => {} } as unknown as React.FormEvent)}
            >
              {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="RFC" value={editFormData.rfc || ''} readOnly disabled className="opacity-60" />
            <Select
              label="Estado"
              options={[
                { value: 'ACTIVO', label: 'ACTIVO' },
                { value: 'SUSPENDIDO', label: 'SUSPENDIDO' },
              ]}
              value={editFormData.estado || 'ACTIVO'}
              onChange={(val) => setEditFormData(p => ({ ...p, estado: val as ClienteEstado }))}
            />
          </div>
          <Input
            label="Nombre / Razón Social"
            value={editFormData.nombre || ''}
            onChange={(e) => setEditFormData(p => ({ ...p, nombre: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              value={editFormData.telefono || ''}
              onChange={(e) => setEditFormData(p => ({ ...p, telefono: e.target.value }))}
              className="font-mono"
            />
            <Input
              label="Email"
              type="email"
              value={editFormData.email || ''}
              onChange={(e) => setEditFormData(p => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Régimen"
              value={editFormData.regimen || ''}
              onChange={(e) => setEditFormData(p => ({ ...p, regimen: e.target.value }))}
            />
            <Input
              label="Asesor"
              value={editFormData.asesor || ''}
              onChange={(e) => setEditFormData(p => ({ ...p, asesor: e.target.value.toUpperCase() }))}
              className="font-mono uppercase"
            />
          </div>
          <Input
            label="Categoría"
            placeholder="VIP, DEUDOR CRÓNICO, PAGADOR PUNTUAL..."
            value={editFormData.categoria || ''}
            onChange={(e) => setEditFormData(p => ({ ...p, categoria: e.target.value }))}
            helperText="VIP, DEUDOR CRÓNICO, PAGADOR PUNTUAL..."
          />
          <Textarea
            label="Notas"
            value={editFormData.notas || ''}
            onChange={(e) => setEditFormData(p => ({ ...p, notas: e.target.value }))}
            rows={3}
          />
        </form>
      </Modal>

      {/* New Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Cliente"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => handleSubmit({ preventDefault: () => {} } as unknown as React.FormEvent)}>Guardar Cliente</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="RFC"
            required
            className="font-mono uppercase"
            value={formData.rfc || ''}
            onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
          />
          <Input
            label="Nombre / Razón Social"
            required
            value={formData.nombre || ''}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          />
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null, nombre: '' })}
        onConfirm={async () => { 
          if (confirmDelete.id) {
            try {
              await deleteClient(confirmDelete.id);
            } catch (err) {
              console.error('Error al eliminar cliente:', err);
            }
          }
        }}
        title="Eliminar cliente"
        message={`¿Estás seguro de eliminar a "${confirmDelete.nombre}" y todas sus operaciones? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />

      <ConfirmModal
        isOpen={confirmToggle.open}
        onClose={() => setConfirmToggle({ open: false, id: null, nombre: '', current: 'ACTIVO' })}
        onConfirm={() => { if (confirmToggle.id) toggleStatus(confirmToggle.id); }}
        title={confirmToggle.current === 'ACTIVO' ? 'Suspender cliente' : 'Reactivar cliente'}
        message={confirmToggle.current === 'ACTIVO' 
          ? `¿Suspender a "${confirmToggle.nombre}"? No podrá recibir recordatorios de cobranza.` 
          : `¿Reactivar a "${confirmToggle.nombre}"?`}
        confirmText={confirmToggle.current === 'ACTIVO' ? 'Suspender' : 'Reactivar'}
        variant="warning"
      />
      <ToastContainer toasts={toasts} />
    </>
  );
}
