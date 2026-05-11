import { useMemo } from 'react';
import { AlertTriangle, Clock, DollarSign, Check, Wallet } from 'lucide-react';
import { Metric } from '../ui/Metric';
import type { OperationEstatus } from '../../types';

type PortfolioStatusFilter = OperationEstatus | 'TODOS';

export interface PortfolioMetrics {
  total: number;
  vencido: number;
  hoy: number;
  pendiente: number;
  pagado: number;
  montoTotal: number;
}

export interface PortfolioMetricsStripProps {
  metrics: PortfolioMetrics;
  activeFilter: PortfolioStatusFilter;
  onFilterChange: (filter: PortfolioStatusFilter) => void;
  formatCurrency: (amount: number) => string;
}

export function PortfolioMetricsStrip({
  metrics,
  activeFilter,
  onFilterChange,
  formatCurrency,
}: PortfolioMetricsStripProps) {
  const items = useMemo(() => [
    { label: 'Total', value: metrics.total, tone: 'primary' as const, filter: 'TODOS' as const, icon: <Clock size={14} /> },
    { label: 'Vencidas', value: metrics.vencido, tone: 'danger' as const, filter: 'VENCIDO' as const, icon: <AlertTriangle size={14} /> },
    { label: 'Hoy', value: metrics.hoy, tone: 'warning' as const, filter: 'HOY VENCE' as const, icon: <Clock size={14} /> },
    { label: 'Pendientes', value: metrics.pendiente, tone: 'info' as const, filter: 'PENDIENTE' as const, icon: <DollarSign size={14} /> },
    { label: 'Pagadas', value: metrics.pagado, tone: 'success' as const, filter: 'PAGADO' as const, icon: <Check size={14} /> },
    { label: 'Por cobrar', value: formatCurrency(metrics.montoTotal), tone: 'gold' as const, filter: 'TODOS' as const, icon: <Wallet size={14} />, mono: true },
  ], [metrics, formatCurrency]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(item => (
        <Metric
          key={item.label}
          label={item.label}
          value={item.value}
          tone={item.tone}
          icon={item.icon}
          mono={item.mono}
          active={activeFilter === item.filter && item.label !== 'Por cobrar'}
          interactive
          onClick={() => onFilterChange(item.filter)}
        />
      ))}
    </div>
  );
}
