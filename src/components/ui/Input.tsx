/**
 * Input Component
 * Reusable input and select components for dark theme.
 */
import React from 'react';

type InputAccent = 'amber' | 'cyan' | 'emerald' | 'violet';
type InputVariant = 'default' | 'large';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  accent?: InputAccent;
  variant?: InputVariant;
  label?: string;
  error?: string;
}

const accentFocusClasses: Record<InputAccent, string> = {
  amber: 'focus:border-accent',
  cyan: 'focus:border-cyan-500',
  emerald: 'focus:border-emerald-500',
  violet: 'focus:border-violet-500',
};

const variantClasses: Record<InputVariant, string> = {
  default: 'px-4 py-2 rounded-lg',
  large: 'px-5 py-3 rounded-xl',
};

export function Input({
  accent = 'amber',
  variant = 'default',
  label,
  error,
  className = '',
  id,
  ...props
}: InputProps): React.ReactElement {
  const inputId = id || props.name;
  const baseClasses = 'w-full bg-surface-raised/50 border border-border-theme text-text-theme-primary placeholder-text-theme-secondary focus:outline-none transition-colors';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm text-text-theme-secondary mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`${baseClasses} ${variantClasses[variant]} ${accentFocusClasses[accent]} ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  accent?: InputAccent;
  label?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function Select({
  accent = 'amber',
  label,
  options,
  placeholder,
  className = '',
  id,
  ...props
}: SelectProps): React.ReactElement {
  const selectId = id || props.name;
  const baseClasses = 'w-full bg-surface-raised/50 border border-border-theme rounded-lg px-4 py-2 text-text-theme-primary focus:outline-none transition-colors';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm text-text-theme-secondary mb-1">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`${baseClasses} ${accentFocusClasses[accent]} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Textarea component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  accent?: InputAccent;
  label?: string;
  error?: string;
}

export function Textarea({
  accent = 'amber',
  label,
  error,
  className = '',
  id,
  ...props
}: TextareaProps): React.ReactElement {
  const textareaId = id || props.name;
  const baseClasses = 'w-full bg-surface-raised/50 border border-border-theme text-text-theme-primary placeholder-text-theme-secondary focus:outline-none transition-colors rounded-lg px-4 py-2.5 resize-none';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm text-text-theme-secondary mb-1">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`${baseClasses} ${accentFocusClasses[accent]} ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

// Search input with icon
interface SearchInputProps extends Omit<InputProps, 'type'> {
  onClear?: () => void;
}

export function SearchInput({
  onClear,
  value,
  ...props
}: SearchInputProps): React.ReactElement {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-text-theme-secondary">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <Input
        type="text"
        value={value}
        className="pl-10 pr-10"
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-theme-secondary hover:text-text-theme-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default Input;

