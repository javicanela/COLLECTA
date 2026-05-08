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
  label?: string;
}> = {
  'PAGADO':       { cssClass: 'badge-pagado',      label: 'Pagado' },
  'VENCIDO':      { cssClass: 'badge-vencido',     label: 'Vencido' },
  'HOY VENCE':    { cssClass: 'badge-hoy',         label: 'Hoy vence' },
  'POR VENCER':   { cssClass: 'badge-porvencer',   label: 'Por vencer' },
  'AL CORRIENTE': { cssClass: 'badge-alcorriente', label: 'Al corriente' },
  'PENDIENTE':    { cssClass: 'badge-pendiente',   label: 'Pendiente' },
  'EXCLUIDO':     { cssClass: 'badge-excluido',    label: 'Excluido' },
  'ACTIVO':       { cssClass: 'badge-activo',      label: 'Activo' },
  'SUSPENDIDO':   { cssClass: 'badge-suspendido',  label: 'Suspendido' },
  'ARCHIVADO':    { cssClass: 'badge-archivado',   label: 'Archivado' },
  'ENVIADO':      { cssClass: 'badge-pagado',      label: 'Enviado' },
  'BLOQUEADO':    { cssClass: 'badge-suspendido',  label: 'Bloqueado' },
  'ERROR':        { cssClass: 'badge-vencido',     label: 'Error' },
  'PRUEBA':       { cssClass: 'badge-porvencer',   label: 'Prueba' },
  'PRODUCCION':   { cssClass: 'badge-activo',      label: 'Produccion' },
  'PRODUCCIÓN':   { cssClass: 'badge-activo',      label: 'Produccion' },
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
  const activateFromKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const config = statusConfig[status] ?? { 
    cssClass: 'badge-excluido', 
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
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={activateFromKeyboard}
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
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={activateFromKeyboard}
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
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={activateFromKeyboard}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
    >
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
    'PRODUCCION': '#10B77D',
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
