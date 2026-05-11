import { useId, type ReactNode } from 'react';
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
  disabledReason?: string;
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
  disabledReason,
  iconOnly = false,
  pressed = false,
  type = 'button',
  title,
  onClick,
  className = '',
}: ActionButtonProps) {
  const generatedId = useId();
  const buttonVariant = variant === 'ghost' || variant === 'outline'
    ? 'ghost'
    : toneToButtonVariant[tone];
  const buttonSize = size === 'md' ? 'normal' : size;
  const activeClass = pressed ? 'ring-2 ring-[var(--brand-primary)]/30' : '';
  const helperId = disabled && disabledReason
    ? `${generatedId}-disabled-reason`
    : undefined;
  const commonA11yProps = {
    'aria-disabled': disabled || loading ? true : undefined,
    'aria-describedby': helperId,
  };
  const disabledReasonNode = helperId ? (
    <span id={helperId} className="sr-only">
      {disabledReason}
    </span>
  ) : null;

  if (iconOnly && icon) {
    return (
      <>
        <IconButton
          icon={icon}
          label={label}
          title={title || disabledReason || label}
          variant={buttonVariant}
          size={buttonSize}
          disabled={disabled || loading}
          onClick={onClick}
          type={type}
          className={`${variant === 'outline' ? 'border border-[var(--c-border)]' : ''} ${activeClass} ${className}`}
          {...commonA11yProps}
        />
        {disabledReasonNode}
      </>
    );
  }

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        loading={loading}
        disabled={disabled}
        type={type}
        onClick={onClick}
        title={title || disabledReason || label}
        leftIcon={icon}
        className={`${variant === 'outline' ? 'border border-[var(--c-border)] bg-transparent' : ''} ${activeClass} ${className}`}
        {...commonA11yProps}
      >
        {label}
      </Button>
      {disabledReasonNode}
    </>
  );
}
