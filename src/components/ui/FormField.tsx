/**
 * Form Field Component
 *
 * Generic wrapper for form controls providing consistent layout for
 * label, hint text, error messages, and accessibility attributes.
 *
 * Unlike the Input component which renders a specific input element,
 * FormField wraps any form control passed as children, allowing use
 * with custom inputs, selects, textareas, or composite controls.
 *
 * @example
 * ```tsx
 * // Basic usage with custom input
 * <FormField label="Email" htmlFor="email" error={errors.email}>
 *   <input id="email" type="email" className={cs.dialog.input} />
 * </FormField>
 *
 * // With hint text
 * <FormField label="Password" htmlFor="password" hint="Minimum 8 characters">
 *   <input id="password" type="password" className={cs.dialog.input} />
 * </FormField>
 *
 * // With required indicator
 * <FormField label="Name" htmlFor="name" required>
 *   <input id="name" type="text" className={cs.dialog.input} />
 * </FormField>
 * ```
 */
import React from 'react';

export interface FormFieldProps {
  /** Field label text */
  label: string;
  /** ID of the form control (for label's htmlFor) */
  htmlFor: string;
  /** Form control element(s) */
  children: React.ReactNode;
  /** Error message to display below the field */
  error?: string;
  /** Hint text to display below the field */
  hint?: string;
  /** Show required indicator (*) after label */
  required?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the label */
  labelClassName?: string;
}

/**
 * Form field wrapper with label, hint, and error support.
 *
 * Features:
 * - Accessible label linking via htmlFor
 * - Optional required indicator
 * - Hint text for field guidance
 * - Error message display with aria-describedby
 * - Consistent vertical spacing
 */
export function FormField({
  label,
  htmlFor,
  children,
  error,
  hint,
  required = false,
  className = '',
  labelClassName = '',
}: FormFieldProps): React.ReactElement {
  // Generate IDs for aria-describedby
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint && !error ? `${htmlFor}-hint` : undefined;
  const describedBy = errorId || hintId;

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      <label
        htmlFor={htmlFor}
        className={`block text-sm font-medium text-text-theme-primary mb-1 ${labelClassName}`}
      >
        {label}
        {required && (
          <span className="text-red-400 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Form control with aria-describedby injected if child is a single element */}
      {describedBy && React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ 'aria-describedby'?: string }>, {
            'aria-describedby': describedBy,
          })
        : children}

      {/* Error message (takes precedence over hint) */}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Hint text (shown only when no error) */}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-text-theme-secondary">
          {hint}
        </p>
      )}
    </div>
  );
}

export default FormField;
