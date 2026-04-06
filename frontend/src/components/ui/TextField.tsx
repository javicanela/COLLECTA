import React from 'react';
import { Input } from './Input';
import type { InputProps } from './Input';
import { Search, Eye, EyeOff } from 'lucide-react';

interface TextFieldProps extends Omit<InputProps, 'id'> {
  name?: string;
  required?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  size,
  fullWidth,
  className,
  ...props
}) => {
  return (
    <Input
      label={label}
      error={error}
      helperText={helperText}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      size={size}
      fullWidth={fullWidth}
      className={className}
      {...props}
    />
  );
};

interface PasswordFieldProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showToggle?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  size,
  fullWidth,
  className,
  showToggle = true,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <Input
      label={label}
      error={error}
      helperText={helperText}
      leftIcon={leftIcon}
      rightIcon={showToggle ? (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="focus:outline-none"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      ) : undefined}
      type={showPassword ? 'text' : 'password'}
      size={size}
      fullWidth={fullWidth}
      className={className}
      {...props}
    />
  );
};

interface SearchFieldProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  label,
  error,
  helperText,
  placeholder = 'Buscar...',
  size,
  fullWidth,
  className,
  onSearch,
  ...props
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch((e.target as HTMLInputElement).value);
    }
  };

  return (
    <Input
      label={label}
      error={error}
      helperText={helperText}
      leftIcon={<Search className="w-4 h-4" />}
      type="search"
      placeholder={placeholder}
      size={size}
      fullWidth={fullWidth}
      className={className}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
};

interface PhoneFieldProps extends Omit<InputProps, 'leftIcon'> {
  countryCode?: string;
}

export const PhoneField: React.FC<PhoneFieldProps> = ({
  label,
  error,
  helperText,
  countryCode = '+52',
  size,
  fullWidth,
  className,
  ...props
}) => {
  return (
    <Input
      label={label}
      error={error}
      helperText={helperText}
      leftIcon={
        <span className="text-xs font-mono text-[var(--c-text-muted)]">
          {countryCode}
        </span>
      }
      type="tel"
      placeholder="10 1234 5678"
      size={size}
      fullWidth={fullWidth}
      className={className}
      {...props}
    />
  );
};

interface RFCFieldProps extends Omit<InputProps, 'leftIcon'> {
  formatOnBlur?: boolean;
}

export const RFCField: React.FC<RFCFieldProps> = ({
  label,
  error,
  helperText,
  formatOnBlur = true,
  size,
  fullWidth,
  className,
  onBlur,
  ...props
}) => {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target;
    if (formatOnBlur && input.value) {
      input.value = input.value.toUpperCase();
    }
    onBlur?.(e);
  };

  return (
    <Input
      label={label}
      error={error}
      helperText={helperText}
      leftIcon={
        <span className="text-[10px] font-bold text-[var(--c-text-muted)] uppercase">
          RFC
        </span>
      }
      placeholder="XAXX010101000"
      maxLength={13}
      onBlur={handleBlur}
      size={size}
      fullWidth={fullWidth}
      className={className}
      {...props}
    />
  );
};

interface MoneyFieldProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  currency?: string;
}

export const MoneyField: React.FC<MoneyFieldProps> = ({
  label,
  error,
  helperText,
  currency = 'MXN',
  size,
  fullWidth,
  className,
  ...props
}) => {
  return (
    <Input
      label={label}
      error={error}
      helperText={helperText}
      leftIcon={
        <span className="text-xs font-bold text-[var(--c-text-muted)]">
          $
        </span>
      }
      type="number"
      placeholder="0.00"
      step="0.01"
      min="0"
      size={size}
      fullWidth={fullWidth}
      className={className}
      {...props}
    />
  );
};
