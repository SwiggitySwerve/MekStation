/**
 * Controlled Input Component - Real-time validation and state management
 * Implements the documented UI consistency patterns
 */
import React from 'react';

import { SvgIcon } from '@/components/ui/SvgIcon';

import type { ValidationResult } from './ControlledInput.types';

const BASE_INPUT_CLASSES =
  'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors';

const DEFAULT_INPUT_CLASSES =
  'border-border-theme focus:border-accent focus:ring-accent';

interface InputClassNameOptions {
  readonly className: string;
  readonly disabled: boolean;
  readonly errorClassName: string;
  readonly isDirty: boolean;
  readonly showValidation: boolean;
  readonly successClassName: string;
  readonly validationResult: ValidationResult;
  readonly warningClassName: string;
}

function getControlledInputClassName({
  className,
  disabled,
  errorClassName,
  isDirty,
  showValidation,
  successClassName,
  validationResult,
  warningClassName,
}: InputClassNameOptions): string {
  if (disabled) {
    return `${BASE_INPUT_CLASSES} bg-surface-raised text-text-theme-muted cursor-not-allowed`;
  }

  if (!showValidation || !isDirty) {
    return `${BASE_INPUT_CLASSES} ${DEFAULT_INPUT_CLASSES} ${className}`;
  }

  if (!validationResult.isValid) {
    return `${BASE_INPUT_CLASSES} ${errorClassName} ${className}`;
  }

  if (validationResult.warning) {
    return `${BASE_INPUT_CLASSES} ${warningClassName} ${className}`;
  }

  return `${BASE_INPUT_CLASSES} ${successClassName} ${className}`;
}

function getValidationMessage(
  showValidation: boolean,
  isDirty: boolean,
  validationResult: ValidationResult,
): string | null {
  if (!showValidation || !isDirty) return null;

  if (!validationResult.isValid && validationResult.error) {
    return validationResult.error;
  }

  return validationResult.warning || null;
}

function getValidationMessageClassName(
  validationResult: ValidationResult,
): string {
  if (!validationResult.isValid) return 'text-red-600';

  return validationResult.warning ? 'text-yellow-600' : 'text-green-600';
}

function getValidationIcon(
  showValidation: boolean,
  isDirty: boolean,
  validationResult: ValidationResult,
): React.ReactElement | null {
  if (!showValidation || !isDirty) return null;

  if (!validationResult.isValid) {
    return <ValidationWarningIcon className="h-5 w-5 text-red-500" />;
  }

  if (validationResult.warning) {
    return <ValidationWarningIcon className="h-5 w-5 text-yellow-500" />;
  }

  return <ValidationSuccessIcon />;
}

function ValidationWarningIcon({
  className,
}: {
  readonly className: string;
}): React.ReactElement {
  return (
    <SvgIcon
      size="control"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </SvgIcon>
  );
}

function ValidationSuccessIcon(): React.ReactElement {
  return (
    <SvgIcon
      size="control"
      className="h-5 w-5 text-green-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </SvgIcon>
  );
}

export {
  getControlledInputClassName,
  getValidationMessage,
  getValidationMessageClassName,
  getValidationIcon,
};
