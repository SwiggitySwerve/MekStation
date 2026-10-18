/**
 * Controlled Input Component - Real-time validation and state management
 * Implements the documented UI consistency patterns
 */
import React from 'react';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface ControlledInputProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  validation?: (value: T) => ValidationResult;
  onValidationChange?: (result: ValidationResult) => void;
  debounceMs?: number;
  placeholder?: string;
  label?: string;
  type?: 'text' | 'number' | 'email' | 'password';
  disabled?: boolean;
  required?: boolean;
  className?: string;
  errorClassName?: string;
  warningClassName?: string;
  successClassName?: string;
  showValidation?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onKeyUp?: (event: React.KeyboardEvent) => void;
  onKeyPress?: (event: React.KeyboardEvent) => void;
}

// CRITICAL: Hook for controlled input state management
interface UseControlledInputReturn<T> {
  value: T;
  validationResult: ValidationResult;
  isDirty: boolean;
  handleChange: (newValue: T) => void;
  reset: () => void;
  isValid: boolean;
  error?: string;
  warning?: string;
}

export type { UseControlledInputReturn };
