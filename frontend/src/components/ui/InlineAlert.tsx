import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { getToneClasses, type StatusTone } from './statusTone';

type InlineAlertTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface InlineAlertProps {
  tone?: InlineAlertTone;
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  role?: 'status' | 'alert' | 'note';
  className?: string;
}

const defaultIcons: Record<InlineAlertTone, ReactNode> = {
  info: <Info size={16} />,
  success: <CheckCircle2 size={16} />,
  warning: <TriangleAlert size={16} />,
  danger: <AlertCircle size={16} />,
  neutral: <Info size={16} />,
};

const toneMap: Record<InlineAlertTone, StatusTone> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'neutral',
};

export function InlineAlert({
  tone = 'info',
  title,
  children,
  icon,
  action,
  compact = false,
  role,
  className = '',
}: InlineAlertProps) {
  return (
    <div
      role={role === 'note' ? undefined : role || (tone === 'danger' ? 'alert' : 'status')}
      className={`flex items-start gap-3 rounded-md border ${compact ? 'p-3' : 'p-4'} ${getToneClasses(toneMap[tone], 'soft')} ${className}`}
    >
      <span aria-hidden="true" className="mt-0.5 flex-shrink-0">
        {icon || defaultIcons[tone]}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
