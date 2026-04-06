import React from 'react';
import { motion } from 'framer-motion';

type CardVariant = 'solid' | 'glass' | 'glass-heavy';
type CardPadding = 'none' | 'sm' | 'normal' | 'lg' | 'xl';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  onClick?: () => void;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  variant = 'solid',
  padding = 'normal',
  hoverable = false,
  onClick,
  headerAction,
}) => {
  const variantClasses: Record<CardVariant, string> = {
    solid: 'surface-card',
    glass: 'glass-card',
    'glass-heavy': 'glass-heavy',
  };

  const paddingClasses: Record<CardPadding, string> = {
    none: '',
    sm: 'p-3',
    normal: 'p-5',
    lg: 'p-6',
    xl: 'p-8',
  };

  const isInteractive = hoverable || onClick;

  return (
    <motion.div
      className={`
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hoverable ? 'surface-interactive' : ''}
        ${onClick ? 'text-left w-full cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      whileHover={isInteractive ? { y: -2, transition: { duration: 0.15 } } : undefined}
      whileTap={onClick ? { scale: 0.99, transition: { duration: 0.1 } } : undefined}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-[var(--c-text)]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-[var(--c-text-muted)] mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">{headerAction}</div>
          )}
        </div>
      )}
      {children}
    </motion.div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`pb-4 border-b border-[var(--c-border-subtle)] ${className}`}>
      {children}
    </div>
  );
};

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = '',
}) => {
  return <div className={className}>{children}</div>;
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
  align = 'right',
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`pt-4 mt-4 border-t border-[var(--c-border-subtle)] flex ${alignClasses[align]} gap-3 ${className}`}>
      {children}
    </div>
  );
};
