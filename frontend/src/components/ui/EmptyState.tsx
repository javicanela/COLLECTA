import React from 'react';
import { motion } from 'framer-motion';
import { FileX, Search, Inbox, Receipt, Settings, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export type EmptyStateVariant = 'default' | 'search' | 'inbox' | 'table' | 'settings' | 'alert';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: EmptyStateVariant | React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'green' | 'red' | 'blue' | 'ghost';
  };
  variant?: 'centered' | 'inline';
  className?: string;
}

const variantIcons: Record<EmptyStateVariant, React.ReactNode> = {
  default: <FileX size={48} strokeWidth={1.5} />,
  search: <Search size={48} strokeWidth={1.5} />,
  inbox: <Inbox size={48} strokeWidth={1.5} />,
  table: <Receipt size={48} strokeWidth={1.5} />,
  settings: <Settings size={48} strokeWidth={1.5} />,
  alert: <AlertCircle size={48} strokeWidth={1.5} />,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  variant = 'centered',
  className = '',
}) => {
  const iconNode = React.isValidElement(icon) 
    ? icon 
    : (icon ? variantIcons[icon as EmptyStateVariant] : variantIcons.default);

  const containerClasses = variant === 'centered'
    ? 'flex flex-col items-center justify-center py-16 px-4 text-center'
    : 'flex items-start gap-4 py-8 px-4';

  return (
    <motion.div
      className={`${containerClasses} ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="mb-4 p-4 rounded-full"
        style={{ 
          background: 'var(--c-surface-raised)',
          color: 'var(--c-text-muted)',
        }}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        {iconNode}
      </motion.div>
      
      <h3 
        className="text-base font-semibold mb-2"
        style={{ color: 'var(--c-text-2)' }}
      >
        {title}
      </h3>
      
      {description && (
        <p 
          className="text-sm max-w-sm mb-6"
          style={{ color: 'var(--c-text-muted)' }}
        >
          {description}
        </p>
      )}
      
      {action && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
};

interface EmptyStateWithListProps {
  items: Array<{
    title: string;
    description?: string;
  }>;
  className?: string;
}

export const EmptyStateWithList: React.FC<EmptyStateWithListProps> = ({
  items,
  className = '',
}) => (
  <div className={`py-8 px-4 ${className}`}>
    {items.map((item, index) => (
      <motion.div
        key={index}
        className="flex items-start gap-3 py-3"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
      >
        <div 
          className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: 'var(--c-text-muted)' }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--c-text-2)' }}>
            {item.title}
          </p>
          {item.description && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
              {item.description}
            </p>
          )}
        </div>
      </motion.div>
    ))}
  </div>
);

export default EmptyState;
