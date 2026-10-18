/**
 * Controlled Input Component - Real-time validation and state management
 * Implements the documented UI consistency patterns
 */
import React, { useState, useCallback, useEffect } from 'react';

import type {
  ValidationResult,
  UseControlledInputReturn,
} from './ControlledInput.types';

export function useControlledInput<T = string>(
  initialValue: T,
  validation?: (value: T) => ValidationResult,
  _debounceMs: number = 300,
): UseControlledInputReturn<T> {
  const [value, setValue] = useState<T>(initialValue);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
  });
  const [isDirty, setIsDirty] = useState(false);

  // CRITICAL: Validate on value change
  useEffect(() => {
    if (validation) {
      const result = validation(value);
      setValidationResult(result);
    }
  }, [value, validation]);

  // CRITICAL: Handle value change
  const handleChange = useCallback((newValue: T) => {
    setValue(newValue);
    setIsDirty(true);
  }, []);

  // CRITICAL: Reset state
  const reset = useCallback(() => {
    setValue(initialValue);
    setValidationResult({ isValid: true });
    setIsDirty(false);
  }, [initialValue]);

  return {
    value,
    validationResult,
    isDirty,
    handleChange,
    reset,
    isValid: validationResult.isValid,
    error: validationResult.error,
    warning: validationResult.warning,
  };
}

// CRITICAL: Higher-order component for easy controlled input wrapping
export function withControlledInput<P extends { value?: string | number }>(
  Component: React.ComponentType<P>,
  validation?: (value: string | number) => ValidationResult,
) {
  return function WithControlledInput(props: P): React.ReactElement {
    const controlledProps = useControlledInput(props.value || '', validation);

    return <Component {...props} {...controlledProps} />;
  };
}
