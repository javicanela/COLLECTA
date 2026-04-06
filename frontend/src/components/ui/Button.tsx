import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'green' | 'ghost' | 'red' | 'blue' | 'orange' | 'purple' | 'gold' | 'gray' | 'white';
type ButtonSize = 'xs' | 'sm' | 'normal' | 'lg' | 'xl';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  title?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'normal',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses: Record<ButtonSize, string> = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    normal: '',
    lg: 'btn-lg',
    xl: 'btn-xl',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    green: 'btn-green',
    ghost: 'btn-ghost',
    red: 'btn-red',
    blue: 'btn-blue',
    orange: 'btn-orange',
    purple: 'btn-purple',
    gold: 'btn-gold',
    gray: 'btn-gray',
    white: 'btn-white',
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      className={`
        btn 
        ${sizeClasses[size]} 
        ${variantClasses[variant]} 
        ${fullWidth ? 'w-full' : ''}
        ${loading ? 'relative' : ''}
        ${className}
      `}
      disabled={isDisabled}
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {!loading && leftIcon && (
        <span className="flex-shrink-0">{leftIcon}</span>
      )}
      <span className={loading ? 'opacity-80' : ''}>
        {children}
      </span>
      {!loading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </motion.button>
  );
};

interface IconButtonProps {
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: 'xs' | 'sm' | 'normal' | 'lg';
  label?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'normal',
  label,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const sizeClasses = {
    xs: 'btn-icon btn-xs',
    sm: 'btn-icon btn-sm',
    normal: 'btn-icon',
    lg: 'btn-icon btn-lg',
  };

  const isDisabled = disabled;
  const buttonId = `iconbtn-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <motion.button
      id={buttonId}
      type={type}
      className={`btn ${sizeClasses[size]} ${variant === 'primary' ? 'btn-primary' : variant === 'green' ? 'btn-green' : variant === 'red' ? 'btn-red' : variant === 'blue' ? 'btn-blue' : variant === 'orange' ? 'btn-orange' : variant === 'purple' ? 'btn-purple' : variant === 'gold' ? 'btn-gold' : 'btn-ghost'} ${className}`}
      title={label}
      aria-label={label}
      aria-describedby={label ? `${buttonId}-desc` : undefined}
      disabled={isDisabled}
      whileHover={{ scale: isDisabled ? 1 : 1.08 }}
      whileTap={{ scale: isDisabled ? 1 : 0.92 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {icon}
    </motion.button>
  );
};
