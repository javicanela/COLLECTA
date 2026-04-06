import React from 'react';
import { motion } from 'framer-motion';

export type BadgeStatus = 
  | 'PAGADO' 
  | 'VENCIDO' 
  | 'HOY VENCE' 
  | 'POR VENCER' 
  | 'AL CORRIENTE' 
  | 'PENDIENTE' 
  | 'EXCLUIDO' 
  | 'ACTIVO' 
  | 'SUSPENDIDO'
  | 'ARCHIVADO'
  | 'ENVIADO'
  | 'BLOQUEADO'
  | 'ERROR'
  | 'PRUEBA'
  | 'PRODUCCIÓN';

export type BadgeVariant = 'default' | 'dot' | 'outline';

export type BadgeSize = 'sm' | 'normal' | 'lg';

interface BadgeProps {
  status: BadgeStatus | string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  onClick?: () => void;
  pulse?: boolean;
}

const statusConfig: Record<string, { 
  cssClass: string; 
  icon: string;
  label?: string;
}> = {
  'PAGADO':       { cssClass: 'badge-pagado',      icon: '✓', label: 'Pagado' },
  'VENCIDO':      { cssClass: 'badge-vencido',     icon: '⚠', label: 'Vencido' },
  'HOY VENCE':    { cssClass: 'badge-hoy',         icon: '!', label: 'Hoy vence' },
  'POR VENCER':   { cssClass: 'badge-porvencer',   icon: '⏳', label: 'Por vencer' },
  'AL CORRIENTE': { cssClass: 'badge-alcorriente', icon: '✓', label: 'Al corriente' },
  'PENDIENTE':    { cssClass: 'badge-pendiente',   icon: '○', label: 'Pendiente' },
  'EXCLUIDO':     { cssClass: 'badge-excluido',    icon: '⊘', label: 'Excluido' },
  'ACTIVO':       { cssClass: 'badge-activo',      icon: '●', label: 'Activo' },
  'SUSPENDIDO':   { cssClass: 'badge-suspendido',  icon: '⊘', label: 'Suspendido' },
  'ARCHIVADO':    { cssClass: 'badge-archivado',   icon: '📦', label: 'Archivado' },
  'ENVIADO':      { cssClass: 'badge-pagado',      icon: '✓', label: 'Enviado' },
  'BLOQUEADO':    { cssClass: 'badge-suspendido',  icon: '🚫', label: 'Bloqueado' },
  'ERROR':        { cssClass: 'badge-vencido',     icon: '✕', label: 'Error' },
  'PRUEBA':       { cssClass: 'badge-porvencer',   icon: '🧪', label: 'Prueba' },
  'PRODUCCIÓN':   { cssClass: 'badge-activo',      icon: '🚀', label: 'Producción' },
};

const dotStatusMap: Record<string, string> = {
  'PAGADO': 'pagado',
  'VENCIDO': 'vencido',
  'HOY VENCE': 'hoy',
  'POR VENCER': 'porvencer',
  'AL CORRIENTE': 'alcorriente',
  'EXCLUIDO': 'excluido',
  'ACTIVO': 'pagado',
  'SUSPENDIDO': 'vencido',
  'ARCHIVADO': 'excluido',
  'ENVIADO': 'pagado',
  'BLOQUEADO': 'vencido',
  'ERROR': 'vencido',
};

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant = 'default',
  size = 'normal',
  className = '',
  onClick,
  pulse = false,
}) => {
  const config = statusConfig[status] ?? { 
    cssClass: 'badge-excluido', 
    icon: '',
    label: status 
  };

  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'badge-sm',
    normal: '',
    lg: 'badge-lg',
  };

  if (variant === 'dot') {
    const DotComponent = onClick ? motion.span : 'span';
    return (
      <DotComponent
        onClick={onClick}
        className={`
          badge-dot
          ${dotStatusMap[status] || 'excluido'}
          ${onClick ? 'cursor-pointer' : ''}
          ${pulse ? 'animate-statusPulse' : ''}
          ${className}
        `}
        title={config.label || status}
        aria-label={`Estado: ${config.label || status}`}
        role={onClick ? 'button' : 'status'}
        whileHover={onClick ? { scale: 1.1 } : undefined}
        whileTap={onClick ? { scale: 0.95 } : undefined}
      />
    );
  }

  if (variant === 'outline') {
    const OutlineComponent = onClick ? motion.span : 'span';
    return (
      <OutlineComponent
        onClick={onClick}
        className={`
          badge-base
          bg-transparent
          border-current
          ${onClick ? 'cursor-pointer' : ''}
          ${className}
        `}
        style={{ 
          color: getStatusColor(status),
          borderColor: getStatusColor(status),
        }}
        aria-label={`Estado: ${config.label || status}`}
        role={onClick ? 'button' : 'status'}
        whileHover={onClick ? { scale: 1.05 } : undefined}
        whileTap={onClick ? { scale: 0.95 } : undefined}
      >
        {config.label || status}
      </OutlineComponent>
    );
  }

  const DefaultComponent = onClick ? motion.span : 'span';
  return (
    <DefaultComponent
      onClick={onClick}
      className={`
        badge-base
        ${config.cssClass}
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer' : ''}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
      aria-label={`Estado: ${config.label || status}`}
      role={onClick ? 'button' : 'status'}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
    >
      {config.icon && <span aria-hidden="true">{config.icon}</span>}
      {config.label || status}
    </DefaultComponent>
  );
};

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'PAGADO': '#10B77D',
    'VENCIDO': '#EF3F3F',
    'HOY VENCE': '#F59E0B',
    'POR VENCER': '#D97706',
    'AL CORRIENTE': '#3B82F6',
    'PENDIENTE': '#3B82F6',
    'EXCLUIDO': '#64748B',
    'ACTIVO': '#10B77D',
    'SUSPENDIDO': '#EF3F3F',
    'ARCHIVADO': '#64748B',
    'ENVIADO': '#10B77D',
    'BLOQUEADO': '#EF3F3F',
    'ERROR': '#EF3F3F',
    'PRUEBA': '#D97706',
    'PRODUCCIÓN': '#10B77D',
  };
  return colors[status] || '#64748B';
}

interface BadgeGroupProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'row' | 'column';
}

export const BadgeGroup: React.FC<BadgeGroupProps> = ({
  children,
  className = '',
  direction = 'row',
}) => {
  return (
    <div 
      className={`
        flex flex-${direction === 'row' ? 'row' : 'col'} gap-1.5 flex-wrap
        ${className}
      `}
    >
      {children}
    </div>
  );
};
