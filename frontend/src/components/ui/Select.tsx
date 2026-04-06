import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'normal' | 'lg';
  className?: string;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  multiple = false,
  searchable = false,
  disabled = false,
  fullWidth = true,
  size = 'normal',
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  const selectedValue = multiple 
    ? (Array.isArray(value) ? value : [])
    : (value || '');

  const selectedLabels = multiple
    ? options.filter(opt => selectedValue.includes(opt.value)).map(opt => opt.label)
    : options.find(opt => opt.value === selectedValue)?.label || '';

  const filteredOptions = searchable && search
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) &&
        (!multiple || !selectedValue.includes(opt.value))
      )
    : options.filter(opt => 
        !multiple || !selectedValue.includes(opt.value)
      );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    if (disabled) return;

    if (multiple && Array.isArray(selectedValue)) {
      const newValue = selectedValue.includes(optionValue)
        ? selectedValue.filter((v: string) => v !== optionValue)
        : [...selectedValue, optionValue];
      onChange?.(newValue);
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (Array.isArray(selectedValue)) {
      onChange?.(selectedValue.filter((v: string) => v !== optionValue));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const sizeClasses = {
    sm: 'text-sm py-1.5 px-3',
    normal: 'text-sm py-2 px-3',
    lg: 'text-base py-2.5 px-4',
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {label && (
        <label id={`${selectId}-label`} htmlFor={`${selectId}-trigger`} className="label">
          {label}
        </label>
      )}

      <div
        id={`${selectId}-trigger`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${selectId}-listbox`}
        aria-labelledby={label ? `${selectId}-label` : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : helperId}
        aria-disabled={disabled}
        className={`
          input-base
          ${sizeClasses[size]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${error ? 'error' : ''}
          flex items-center justify-between gap-2
          min-h-[42px]
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
      >
        <div className="flex items-center gap-1 flex-1 overflow-hidden">
          {multiple && selectedValue.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {options
                .filter(opt => selectedValue.includes(opt.value))
                .map(opt => (
                  <span
                    key={opt.value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--brand-primary-dim)] text-[var(--brand-primary)] text-xs rounded-full"
                  >
                    {opt.label}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-[var(--brand-danger)]"
                      onClick={(e) => handleRemove(opt.value, e)}
                    />
                  </span>
                ))}
            </div>
          ) : (
            <span className={selectedValue ? '' : 'text-[var(--c-text-muted)]'}>
              {selectedLabels || placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[var(--c-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {isOpen && (
        <div 
          ref={listboxRef}
          id={`${selectId}-listbox`}
          role="listbox"
          aria-multiselectable={multiple}
          className="absolute z-[var(--z-dropdown)] w-full mt-1 py-1 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-lg shadow-[var(--c-shadow-lg)] max-h-60 overflow-auto"
        >
          {searchable && (
            <div className="px-3 py-2 border-b border-[var(--c-border)]">
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm text-[var(--c-text)] placeholder:text-[var(--c-text-muted)]"
                onClick={(e) => e.stopPropagation()}
                aria-label="Buscar opciones"
              />
            </div>
          )}
          
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-[var(--c-text-muted)] text-center" role="status">
              No hay opciones disponibles
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = multiple
                ? selectedValue.includes(option.value)
                : selectedValue === option.value;

              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  className={`
                    px-3 py-2 cursor-pointer flex items-center justify-between
                    ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--c-surface-raised)]'}
                    ${isSelected ? 'text-[var(--brand-primary)]' : 'text-[var(--c-text)]'}
                  `}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      !option.disabled && handleSelect(option.value);
                    }
                  }}
                >
                  <span className="text-sm">{option.label}</span>
                  {isSelected && <Check className="w-4 h-4" aria-hidden="true" />}
                </div>
              );
            })
          )}
        </div>
      )}

      {error && <span id={errorId} className="form-error" role="alert">{error}</span>}
      {helperText && !error && <span id={helperId} className="form-hint">{helperText}</span>}
    </div>
  );
};
