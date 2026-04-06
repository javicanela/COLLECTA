import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, RefreshCw, History } from 'lucide-react';
import Topbar from '../components/Topbar';
import { LogService } from '../services/logService';
import type { LogEntry } from '../types';
import { Table } from '../components/ui/Table';
import type { Column } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

const ffd = (iso: string | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function LogView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResultado, setFilterResultado] = useState<string>('all');
  const [filterModo, setFilterModo] = useState<string>('all');

  const fetchLogs = () => {
    setIsLoading(true);
    LogService.getAll()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchQuery || 
        log.client?.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.client?.rfc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.mensaje?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.telefono?.includes(searchQuery);
      
      const matchesResultado = filterResultado === 'all' || log.resultado === filterResultado;
      const matchesModo = filterModo === 'all' || log.modo === filterModo;
      
      return matchesSearch && matchesResultado && matchesModo;
    });
  }, [logs, searchQuery, filterResultado, filterModo]);

  const columns: Column<LogEntry>[] = useMemo(() => [
    {
      key: 'createdAt',
      header: 'Fecha/Hora',
      width: '160px',
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: 'var(--c-text-muted)' }}>
          {ffd(row.createdAt)}
        </span>
      )
    },
    {
      key: 'client',
      header: 'Cliente',
      width: '180px',
      render: (row) => (
        <span className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>
          {row.client?.nombre || '—'}
        </span>
      )
    },
    {
      key: 'rfc',
      header: 'RFC',
      width: '120px',
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: 'var(--c-text-2)' }}>
          {row.client?.rfc || '—'}
        </span>
      )
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      width: '130px',
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: 'var(--c-text-2)' }}>
          {row.telefono || '—'}
        </span>
      )
    },
    {
      key: 'tipo',
      header: 'Tipo',
      width: '100px',
      render: (row) => (
        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--c-text-2)' }}>
          {row.tipo}
        </span>
      )
    },
    {
      key: 'variante',
      header: 'Variante',
      width: '120px',
      render: (row) => (
        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--c-text-2)' }}>
          {row.variante || '—'}
        </span>
      )
    },
    {
      key: 'modo',
      header: 'Modo',
      width: '110px',
      render: (row) => (
        <Badge 
          status={row.modo === 'PRODUCCIÓN' ? 'PRODUCCIÓN' : 'PRUEBA'} 
          size="sm" 
        />
      )
    },
    {
      key: 'resultado',
      header: 'Resultado',
      width: '110px',
      render: (row) => (
        <Badge 
          status={row.resultado as any} 
          size="sm" 
        />
      )
    },
    {
      key: 'mensaje',
      header: 'Mensaje',
      render: (row) => (
        <span className="text-xs max-w-[280px] truncate block" style={{ color: 'var(--c-text-muted)' }}>
          {row.mensaje || '—'}
        </span>
      )
    }
  ], []);

  return (
    <>
      <Topbar 
        title="Log de Envíos WA" 
        subtitle="Bitácora de mensajes enviados"
        actions={
          <button 
            onClick={fetchLogs}
            disabled={isLoading}
            className="btn btn-ghost btn-sm gap-2"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        }
      />

      <div className="p-5 max-w-7xl mx-auto w-full flex flex-col gap-4">
        {/* Filters */}
        <Card variant="glass" padding="normal">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search size={16} className="text-[var(--c-text-muted)]" />
              <input
                type="text"
                placeholder="Buscar por cliente, RFC, teléfono o mensaje..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--c-text)' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="h-6 w-px" style={{ background: 'var(--c-border)' }} />
            <div className="flex items-center gap-2">
              <Filter size={14} style={{ color: 'var(--c-text-muted)' }} />
              <select
                value={filterResultado}
                onChange={(e) => setFilterResultado(e.target.value)}
                className="input-base text-sm py-1.5 px-3 rounded-lg"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
              >
                <option value="all">Todos los resultados</option>
                <option value="ENVIADO">Enviado</option>
                <option value="BLOQUEADO">Bloqueado</option>
                <option value="ERROR">Error</option>
              </select>
              <select
                value={filterModo}
                onChange={(e) => setFilterModo(e.target.value)}
                className="input-base text-sm py-1.5 px-3 rounded-lg"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
              >
                <option value="all">Todos los modos</option>
                <option value="PRUEBA">Prueba</option>
                <option value="PRODUCCIÓN">Producción</option>
              </select>
            </div>
            {(searchQuery || filterResultado !== 'all' || filterModo !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterResultado('all');
                  setFilterModo('all');
                }}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--brand-danger)' }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </Card>

        {/* Stats summary */}
        <div className="flex gap-4 text-xs">
          <span style={{ color: 'var(--c-text-muted)' }}>
            Total: <strong style={{ color: 'var(--c-text)' }}>{logs.length}</strong> registros
          </span>
          <span style={{ color: 'var(--brand-success)' }}>
            • <strong>{logs.filter(l => l.resultado === 'ENVIADO').length}</strong> enviados
          </span>
          <span style={{ color: 'var(--brand-warn)' }}>
            • <strong>{logs.filter(l => l.resultado === 'BLOQUEADO').length}</strong> bloqueados
          </span>
          <span style={{ color: 'var(--brand-danger)' }}>
            • <strong>{logs.filter(l => l.resultado === 'ERROR').length}</strong> errores
          </span>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={filteredLogs}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          loadingRows={8}
          emptyMessage="No hay registros de envíos"
          emptyIcon={<History size={40} />}
          striped
          hoverable
          stickyHeader
        />
      </div>
    </>
  );
}
