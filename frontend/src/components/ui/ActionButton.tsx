import type { ReactNode } from 'react';
import { Button, IconButton } from './Button';
import type { StatusTone } from './statusTone';

type ActionButtonVariant = 'primary' | 'soft' | 'ghost' | 'outline';

export interface ActionButtonProps {
  label: string;
  icon?: ReactNode;
  tone?: StatusTone;
  variant?: ActionButtonVariant;
  size?: 'xs' | 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  pressed?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  onClick?: () => void;
  className?: string;
}

const toneToButtonVariant: Record<StatusTone, 'primary' | 'green' | 'red' | 'blue' | 'gray' | 'orange' | 'purple' | 'gold'> = {
  success: 'green',
  danger: 'red',
  warning: 'orange',
  info: 'blue',
  neutral: 'gray',
  primary: 'primary',
  violet: 'purple',
  gold: 'gold',
};

export function ActionButton({
  label,
  icon,
  tone = 'primary',
  variant = 'soft',
  size = 'sm',
  loading = false,
  disabled = false,
  iconOnly = false,
  pressed = false,
  type = 'button',
  title,
  onClick,
  className = '',
}: ActionButtonProps) {
  const buttonVariant = variant === 'ghost' || variant === 'outline'
    ? 'ghost'
    : toneToButtonVariant[tone];
  const buttonSize = size === 'md' ? 'normal' : size;
  const activeClass = pressed ? 'ring-2 ring-[var(--brand-primary)]/30' : '';

  if (iconOnly && icon) {
    return (
      <IconButton
        icon={icon}
        label={label}
        title={title || label}
        variant={buttonVariant}
        size={buttonSize}
        disabled={disabled || loading}
        onClick={onClick}
        type={type}
        className={`${variant === 'outline' ? 'border border-[var(--c-border)]' : ''} ${activeClass} ${className}`}
      />
    );
  }

  return (
    <Button
      variant={buttonVariant}
      size={buttonSize}
      loading={loading}
      disabled={disabled}
      type={type}
      onClick={onClick}
      title={title || label}
      leftIcon={icon}
      className={`${variant === 'outline' ? 'border border-[var(--c-border)] bg-transparent' : ''} ${activeClass} ${className}`}
    >
      {label}
    </Button>
  );
}
