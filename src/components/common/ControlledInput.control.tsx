/**
 * Controlled Input Component - Real-time validation and state management
 * Implements the documented UI consistency patterns
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';

import type {
  ControlledInputProps,
  ValidationResult,
} from './ControlledInput.types';

import {
  getControlledInputClassName,
  getValidationMessage,
  getValidationIcon,
  getValidationMessageClassName,
} from './ControlledInput.validation';

function clearInputTimeout(timeout: NodeJS.Timeout | null): void {
  if (timeout) {
    clearTimeout(timeout);
  }
}

export function ControlledInput<T = string>({
  value,
  onChange,
  validation,
  onValidationChange,
  debounceMs = 300,
  placeholder,
  label,
  type = 'text',
  disabled = false,
  required = false,
  className = '',
  errorClassName = 'border-red-500 focus:border-red-500 focus:ring-red-500',
  warningClassName = 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500',
  successClassName = 'border-green-500 focus:border-green-500 focus:ring-green-500',
  showValidation = true,
  autoFocus = false,
  onBlur,
  onFocus,
  onKeyDown,
  onKeyUp,
  onKeyPress,
  ...props
}: ControlledInputProps<T>): React.ReactElement {
  const [localValue, setLocalValue] = useState<T>(value);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [, _setIsFocused] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // CRITICAL: Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // CRITICAL: Validate on value change
  useEffect(() => {
    if (validation) {
      const result = validation(localValue);
      setValidationResult(result);
      onValidationChange?.(result);
    }
  }, [localValue, validation, onValidationChange]);

  // CRITICAL: Debounced onChange handler
  const debouncedOnChange = useCallback(
    (newValue: T) => {
      clearInputTimeout(debounceTimeoutRef.current);

      debounceTimeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs],
  );

  // CRITICAL: Handle input change
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue =
        type === 'number'
          ? (Number(event.target.value) as T)
          : (event.target.value as T);
      setLocalValue(newValue);
      setIsDirty(true);

      // CRITICAL: Only call onChange if validation passes or no validation
      if (!validation || validation(newValue).isValid) {
        debouncedOnChange(newValue);
      }
    },
    [type, validation, debouncedOnChange],
  );

  // CRITICAL: Handle input blur
  const handleBlur = useCallback(() => {
    _setIsFocused(false);

    // CRITICAL: Force validation on blur
    if (validation) {
      const result = validation(localValue);
      setValidationResult(result);
      onValidationChange?.(result);
    }

    // CRITICAL: Call onChange on blur if value is valid
    if (!validation || validation(localValue).isValid) {
      onChange(localValue);
    }

    onBlur?.();
  }, [localValue, validation, onValidationChange, onChange, onBlur]);

  // CRITICAL: Handle input focus
  const handleFocus = useCallback(() => {
    _setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  // CRITICAL: Handle key events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      onKeyDown?.(event);
    },
    [onKeyDown],
  );

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent) => {
      onKeyUp?.(event);
    },
    [onKeyUp],
  );

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      onKeyPress?.(event);
    },
    [onKeyPress],
  );

  // CRITICAL: Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInputTimeout(debounceTimeoutRef.current);
    };
  }, []);

  const inputClassName = getControlledInputClassName({
    className,
    disabled,
    errorClassName,
    isDirty,
    showValidation,
    successClassName,
    validationResult,
    warningClassName,
  });
  const validationMessage = getValidationMessage(
    showValidation,
    isDirty,
    validationResult,
  );
  const validationIcon = getValidationIcon(
    showValidation,
    isDirty,
    validationResult,
  );

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-text-theme-primary block text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          value={localValue as string}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          className={inputClassName}
          {...props}
        />

        {/* CRITICAL: Validation icon */}
        {validationIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            {validationIcon}
          </div>
        )}
      </div>

      {/* CRITICAL: Validation message */}
      {validationMessage && (
        <p
          className={`text-sm ${getValidationMessageClassName(validationResult)}`}
        >
          {validationMessage}
        </p>
      )}
    </div>
  );
}
