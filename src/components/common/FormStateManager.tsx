/**
 * Form State Manager - Comprehensive form state management with validation
 * Implements the documented UI consistency patterns
 */

import React, { useState, useCallback, useEffect, useReducer } from 'react'
import { ValidationResult } from './ControlledInput'

export interface FormField<T = any> {
  value: T
  validation?: (value: T) => ValidationResult
  isDirty: boolean
  isTouched: boolean
  error?: string
  warning?: string
}

export interface FormState<T extends Record<string, any>> {
  fields: { [K in keyof T]: FormField<T[K]> }
  isDirty: boolean
  isValid: boolean
  isSubmitting: boolean
  isSubmitted: boolean
  errors: string[]
  warnings: string[]
}

export type FormAction<T> = 
  | { type: 'SET_FIELD_VALUE'; payload: { field: keyof T; value: T[keyof T] } }
  | { type: 'SET_FIELD_TOUCHED'; payload: { field: keyof T; touched: boolean } }
  | { type: 'SET_FIELD_DIRTY'; payload: { field: keyof T; dirty: boolean } }
  | { type: 'SET_FIELD_ERROR'; payload: { field: keyof T; error?: string; warning?: string } }
  | { type: 'RESET_FIELD'; payload: { field: keyof T; initialValue: T[keyof T] } }
  | { type: 'RESET_FORM'; payload: T }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_SUBMITTED'; payload: boolean }
  | { type: 'VALIDATE_FIELD'; payload: { field: keyof T } }
  | { type: 'VALIDATE_ALL' }

// CRITICAL: Form reducer for immutable state updates
function formReducer<T extends Record<string, any>>(
  state: FormState<T>,
  action: FormAction<T>
): FormState<T> {
  switch (action.type) {
    case 'SET_FIELD_VALUE': {
      const { field, value } = action.payload
      const fieldState = state.fields[field]
      const validation = fieldState.validation
      
      let error: string | undefined
      let warning: string | undefined
      
      if (validation) {
        const result = validation(value)
        error = result.error
        warning = result.warning
      }
      
      return {
        ...state,
        fields: {
          ...state.fields,
          [field]: {
            ...fieldState,
            value,
            error,
            warning,
            isDirty: true
          }
        },
        isDirty: true
      }
    }
    
    case 'SET_FIELD_TOUCHED': {
      const { field, touched } = action.payload
      const fieldState = state.fields[field]
      
      return {
        ...state,
        fields: {
          ...state.fields,
          [field]: {
            ...fieldState,
            isTouched: touched
          }
        }
      }
    }
    
    case 'SET_FIELD_DIRTY': {
      const { field, dirty } = action.payload
      const fieldState = state.fields[field]
      
      return {
        ...state,
        fields: {
          ...state.fields,
          [field]: {
            ...fieldState,
            isDirty: dirty
          }
        },
        isDirty: dirty || Object.values(state.fields).some(f => f.isDirty)
      }
    }
    
    case 'SET_FIELD_ERROR': {
      const { field, error, warning } = action.payload
      const fieldState = state.fields[field]
      
      return {
        ...state,
        fields: {
          ...state.fields,
          [field]: {
            ...fieldState,
            error,
            warning
          }
        }
      }
    }
    
    case 'RESET_FIELD': {
      const { field, initialValue } = action.payload
      const fieldState = state.fields[field]
      
      return {
        ...state,
        fields: {
          ...state.fields,
          [field]: {
            ...fieldState,
            value: initialValue,
            error: undefined,
            warning: undefined,
            isDirty: false,
            isTouched: false
          }
        }
      }
    }
    
    case 'RESET_FORM': {
      const initialValues = action.payload
      const fields: { [K in keyof T]: FormField<T[K]> } = {} as any
      
      for (const [key, value] of Object.entries(initialValues)) {
        fields[key as keyof T] = {
          value,
          validation: state.fields[key as keyof T]?.validation,
          isDirty: false,
          isTouched: false
        }
      }
      
      return {
        ...state,
        fields,
        isDirty: false,
        isValid: true,
        isSubmitting: false,
        isSubmitted: false,
        errors: [],
        warnings: []
      }
    }
    
    case 'SET_SUBMITTING': {
      return {
        ...state,
        isSubmitting: action.payload
      }
    }
    
    case 'SET_SUBMITTED': {
      return {
        ...state,
        isSubmitted: action.payload
      }
    }
    
    case 'VALIDATE_FIELD': {
      const { field } = action.payload
      const fieldState = state.fields[field]
      const validation = fieldState.validation
      
      if (!validation) return state
      
      const result = validation(fieldState.value)
      
      return {
        ...state,
        fields: {
          ...state.fields,
          [field]: {
            ...fieldState,
            error: result.error,
            warning: result.warning
          }
        }
      }
    }
    
    case 'VALIDATE_ALL': {
      const fields = { ...state.fields }
      const errors: string[] = []
      const warnings: string[] = []
      
      for (const [key, field] of Object.entries(fields)) {
        if (field.validation) {
          const result = field.validation(field.value)
          if (result.error) {
            errors.push(result.error)
          }
          if (result.warning) {
            warnings.push(result.warning)
          }
          
          fields[key as keyof T] = {
            ...field,
            error: result.error,
            warning: result.warning
          }
        }
      }
      
      return {
        ...state,
        fields,
        errors,
        warnings,
        isValid: errors.length === 0
      }
    }
    
    default:
      return state
  }
}

// CRITICAL: Hook for form state management
export function useFormState<T extends Record<string, any>>(
  initialValues: T,
  fieldValidations?: { [K in keyof T]?: (value: T[K]) => ValidationResult }
) {
  // CRITICAL: Initialize form state
  const createInitialState = useCallback((): FormState<T> => {
    const fields: { [K in keyof T]: FormField<T[K]> } = {} as any
    
    for (const [key, value] of Object.entries(initialValues)) {
      fields[key as keyof T] = {
        value,
        validation: fieldValidations?.[key as keyof T],
        isDirty: false,
        isTouched: false
      }
    }
    
    return {
      fields,
      isDirty: false,
      isValid: true,
      isSubmitting: false,
      isSubmitted: false,
      errors: [],
      warnings: []
    }
  }, [initialValues, fieldValidations])
  
  const [state, dispatch] = useReducer(formReducer<T>, createInitialState())
  
  // CRITICAL: Set field value
  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    dispatch({ type: 'SET_FIELD_VALUE', payload: { field, value } })
  }, [])
  
  // CRITICAL: Set field touched
  const setFieldTouched = useCallback(<K extends keyof T>(field: K, touched: boolean = true) => {
    dispatch({ type: 'SET_FIELD_TOUCHED', payload: { field, touched } })
  }, [])
  
  // CRITICAL: Set field dirty
  const setFieldDirty = useCallback(<K extends keyof T>(field: K, dirty: boolean = true) => {
    dispatch({ type: 'SET_FIELD_DIRTY', payload: { field, dirty } })
  }, [])
  
  // CRITICAL: Reset field
  const resetField = useCallback(<K extends keyof T>(field: K) => {
    dispatch({ type: 'RESET_FIELD', payload: { field, initialValue: initialValues[field] } })
  }, [initialValues])
  
  // CRITICAL: Reset form
  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM', payload: initialValues })
  }, [initialValues])
  
  // CRITICAL: Validate field
  const validateField = useCallback(<K extends keyof T>(field: K) => {
    dispatch({ type: 'VALIDATE_FIELD', payload: { field } })
  }, [])
  
  // CRITICAL: Validate all fields
  const validateAll = useCallback(() => {
    dispatch({ type: 'VALIDATE_ALL' })
  }, [])
  
  // CRITICAL: Set submitting state
  const setSubmitting = useCallback((submitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', payload: submitting })
  }, [])
  
  // CRITICAL: Set submitted state
  const setSubmitted = useCallback((submitted: boolean) => {
    dispatch({ type: 'SET_SUBMITTED', payload: submitted })
  }, [])
  
  // CRITICAL: Get current values
  const getValues = useCallback((): T => {
    const values: Partial<T> = {}
    for (const [key, field] of Object.entries(state.fields)) {
      values[key as keyof T] = field.value
    }
    return values as T
  }, [state.fields])
  
  // CRITICAL: Set multiple values
  const setValues = useCallback((values: Partial<T>) => {
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined) {
        setFieldValue(key as keyof T, value)
      }
    }
  }, [setFieldValue])
  
  // CRITICAL: Handle form submission
  const handleSubmit = useCallback(async (
    onSubmit: (values: T) => Promise<void> | void
  ) => {
    validateAll()
    
    if (!state.isValid) {
      return
    }
    
    setSubmitting(true)
    
    try {
      const values = getValues()
      await onSubmit(values)
      setSubmitted(true)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setSubmitting(false)
    }
  }, [state.isValid, validateAll, setSubmitting, getValues, setSubmitted])
  
  // CRITICAL: Get field props for controlled inputs
  const getFieldProps = useCallback(<K extends keyof T>(field: K) => {
    const fieldState = state.fields[field]
    
    return {
      value: fieldState.value,
      onChange: (value: T[K]) => setFieldValue(field, value),
      onBlur: () => setFieldTouched(field, true),
      onFocus: () => setFieldTouched(field, false),
      error: fieldState.error,
      warning: fieldState.warning,
      isDirty: fieldState.isDirty,
      isTouched: fieldState.isTouched,
      validation: fieldState.validation
    }
  }, [state.fields, setFieldValue, setFieldTouched])
  
  return {
    // State
    state,
    fields: state.fields,
    isDirty: state.isDirty,
    isValid: state.isValid,
    isSubmitting: state.isSubmitting,
    isSubmitted: state.isSubmitted,
    errors: state.errors,
    warnings: state.warnings,
    
    // Actions
    setFieldValue,
    setFieldTouched,
    setFieldDirty,
    resetField,
    resetForm,
    validateField,
    validateAll,
    setSubmitting,
    setSubmitted,
    getValues,
    setValues,
    handleSubmit,
    getFieldProps
  }
}

// CRITICAL: Form component with built-in state management
export interface FormProps<T extends Record<string, any>> {
  initialValues: T
  fieldValidations?: { [K in keyof T]?: (value: T[K]) => ValidationResult }
  onSubmit: (values: T) => Promise<void> | void
  children: (formProps: ReturnType<typeof useFormState<T>>) => React.ReactNode
  className?: string
}

export function Form<T extends Record<string, any>>({
  initialValues,
  fieldValidations,
  onSubmit,
  children,
  className = ''
}: FormProps<T>) {
  const formProps = useFormState(initialValues, fieldValidations)
  
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    await formProps.handleSubmit(onSubmit)
  }, [formProps, onSubmit])
  
  return (
    <form onSubmit={handleSubmit} className={className}>
      {children(formProps)}
    </form>
  )
}

// CRITICAL: Field component for easy form field management
export interface FormFieldProps<T extends Record<string, any>, K extends keyof T> {
  form: ReturnType<typeof useFormState<T>>
  field: K
  children: (fieldProps: ReturnType<typeof useFormState<T>>['getFieldProps'] extends (field: K) => infer R ? R : never) => React.ReactNode
}

export function FormField<T extends Record<string, any>, K extends keyof T>({
  form,
  field,
  children
}: FormFieldProps<T, K>) {
  const fieldProps = form.getFieldProps(field)
  return <>{children(fieldProps as any)}</>
} 