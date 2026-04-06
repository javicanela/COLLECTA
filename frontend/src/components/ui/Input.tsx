import React from 'react';

type InputSize = 'sm' | 'normal' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: InputSize;
  fullWidth?: boolean;
  mono?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  size = 'normal',
  fullWidth = true,
  mono = false,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const sizeClasses: Record<InputSize, string> = {
    sm: 'input-sm',
    normal: '',
    lg: 'input-lg',
  };

  const hasError = Boolean(error);
  const hasLeftIcon = Boolean(leftIcon);
  const hasRightIcon = Boolean(rightIcon);

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="label"
        >
          {label}
          {props.required && <span className="label-required" />}
        </label>
      )}
      
      <div className="relative">
        {hasLeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-muted)]">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helperId}
          className={`
            input-base
            ${sizeClasses[size]}
            ${hasLeftIcon ? 'input-icon' : ''}
            ${hasRightIcon ? 'pr-10' : ''}
            ${hasError ? 'error' : ''}
            ${mono ? 'font-mono' : ''}
            ${className}
          `}
          {...props}
        />
        
        {hasRightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text-muted)]">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <span id={errorId} className="form-error" role="alert">{error}</span>
      )}
      
      {helperText && !error && (
        <span id={helperId} className="form-hint">{helperText}</span>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  fullWidth = true,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const hasError = Boolean(error);

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="label"
        >
          {label}
          {props.required && <span className="label-required" />}
        </label>
      )}

      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : helperId}
        className={`
          input-base
          min-h-[100px]
          resize-y
          ${error ? 'error' : ''}
          ${className}
        `}
        {...props}
      />

      {error && (
        <span id={errorId} className="form-error" role="alert">{error}</span>
      )}

      {helperText && !error && (
        <span id={helperId} className="form-hint">{helperText}</span>
      )}
    </div>
  );
});
