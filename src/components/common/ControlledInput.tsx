/**
 * Controlled Input Component - Real-time validation and state management
 * Implements the documented UI consistency patterns
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'

export interface ValidationResult {
  isValid: boolean
  error?: string
  warning?: string
}

export interface ControlledInputProps<T = string> {
  value: T
  onChange: (value: T) => void
  validation?: (value: T) => ValidationResult
  onValidationChange?: (result: ValidationResult) => void
  debounceMs?: number
  placeholder?: string
  label?: string
  type?: 'text' | 'number' | 'email' | 'password'
  disabled?: boolean
  required?: boolean
  className?: string
  errorClassName?: string
  warningClassName?: string
  successClassName?: string
  showValidation?: boolean
  autoFocus?: boolean
  onBlur?: () => void
  onFocus?: () => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  onKeyUp?: (event: React.KeyboardEvent) => void
  onKeyPress?: (event: React.KeyboardEvent) => void
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
  const [localValue, setLocalValue] = useState<T>(value)
  const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true })
  const [isDirty, setIsDirty] = useState(false)
  const [, _setIsFocused] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // CRITICAL: Sync with external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // CRITICAL: Validate on value change
  useEffect(() => {
    if (validation) {
      const result = validation(localValue)
      setValidationResult(result)
      
      if (onValidationChange) {
        onValidationChange(result)
      }
    }
  }, [localValue, validation, onValidationChange])

  // CRITICAL: Debounced onChange handler
  const debouncedOnChange = useCallback((newValue: T) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      onChange(newValue)
    }, debounceMs)
  }, [onChange, debounceMs])

  // CRITICAL: Handle input change
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? Number(event.target.value) as T : event.target.value as T
    setLocalValue(newValue)
    setIsDirty(true)
    
    // CRITICAL: Only call onChange if validation passes or no validation
    if (!validation || validation(newValue).isValid) {
      debouncedOnChange(newValue)
    }
  }, [type, validation, debouncedOnChange])

  // CRITICAL: Handle input blur
  const handleBlur = useCallback(() => {
    _setIsFocused(false)
    
    // CRITICAL: Force validation on blur
    if (validation) {
      const result = validation(localValue)
      setValidationResult(result)
      
      if (onValidationChange) {
        onValidationChange(result)
      }
    }
    
    // CRITICAL: Call onChange on blur if value is valid
    if (!validation || validation(localValue).isValid) {
      onChange(localValue)
    }
    
    if (onBlur) {
      onBlur()
    }
  }, [localValue, validation, onValidationChange, onChange, onBlur])

  // CRITICAL: Handle input focus
  const handleFocus = useCallback(() => {
    _setIsFocused(true)
    if (onFocus) {
      onFocus()
    }
  }, [onFocus])

  // CRITICAL: Handle key events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (onKeyDown) {
      onKeyDown(event)
    }
  }, [onKeyDown])

  const handleKeyUp = useCallback((event: React.KeyboardEvent) => {
    if (onKeyUp) {
      onKeyUp(event)
    }
  }, [onKeyUp])

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (onKeyPress) {
      onKeyPress(event)
    }
  }, [onKeyPress])

  // CRITICAL: Get dynamic styling based on validation state
  const getInputClassName = useCallback((): string => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors'
    
    if (disabled) {
      return `${baseClasses} bg-gray-100 text-gray-500 cursor-not-allowed`
    }
    
    if (!showValidation || !isDirty) {
      return `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${className}`
    }
    
    if (!validationResult.isValid) {
      return `${baseClasses} ${errorClassName} ${className}`
    }
    
    if (validationResult.warning) {
      return `${baseClasses} ${warningClassName} ${className}`
    }
    
    if (isDirty && validationResult.isValid) {
      return `${baseClasses} ${successClassName} ${className}`
    }
    
    return `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${className}`
  }, [
    disabled,
    showValidation,
    isDirty,
    validationResult,
    className,
    errorClassName,
    warningClassName,
    successClassName
  ])

  // CRITICAL: Get validation message
  const getValidationMessage = useCallback((): string | null => {
    if (!showValidation || !isDirty) return null
    
    if (!validationResult.isValid && validationResult.error) {
      return validationResult.error
    }
    
    if (validationResult.warning) {
      return validationResult.warning
    }
    
    return null
  }, [showValidation, isDirty, validationResult])

  // CRITICAL: Get validation icon
  const getValidationIcon = useCallback(() => {
    if (!showValidation || !isDirty) return null
    
    if (!validationResult.isValid) {
      return (
        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }
    
    if (validationResult.warning) {
      return (
        <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }
    
    if (validationResult.isValid) {
      return (
        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
    
    return null
  }, [showValidation, isDirty, validationResult])

  // CRITICAL: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
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
          className={getInputClassName()}
          {...props}
        />
        
        {/* CRITICAL: Validation icon */}
        {getValidationIcon() && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {getValidationIcon()}
          </div>
        )}
      </div>
      
      {/* CRITICAL: Validation message */}
      {getValidationMessage() && (
        <p className={`text-sm ${
          !validationResult.isValid 
            ? 'text-red-600' 
            : validationResult.warning 
              ? 'text-yellow-600' 
              : 'text-green-600'
        }`}>
          {getValidationMessage()}
        </p>
      )}
    </div>
  )
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

export function useControlledInput<T = string>(
  initialValue: T,
  validation?: (value: T) => ValidationResult,
  _debounceMs: number = 300
): UseControlledInputReturn<T> {
  const [value, setValue] = useState<T>(initialValue)
  const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true })
  const [isDirty, setIsDirty] = useState(false)

  // CRITICAL: Validate on value change
  useEffect(() => {
    if (validation) {
      const result = validation(value)
      setValidationResult(result)
    }
  }, [value, validation])

  // CRITICAL: Handle value change
  const handleChange = useCallback((newValue: T) => {
    setValue(newValue)
    setIsDirty(true)
  }, [])

  // CRITICAL: Reset state
  const reset = useCallback(() => {
    setValue(initialValue)
    setValidationResult({ isValid: true })
    setIsDirty(false)
  }, [initialValue])

  return {
    value,
    validationResult,
    isDirty,
    handleChange,
    reset,
    isValid: validationResult.isValid,
    error: validationResult.error,
    warning: validationResult.warning
  }
}

// CRITICAL: Higher-order component for easy controlled input wrapping
export function withControlledInput<P extends { value?: any }>(
  Component: React.ComponentType<P>,
  validation?: (value: any) => ValidationResult
) {
  return function WithControlledInput(props: P) {
    const controlledProps = useControlledInput(props.value || '', validation)
    
    return (
      <Component
        {...props}
        {...controlledProps}
      />
    )
  }
} 