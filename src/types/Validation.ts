/**
 * Validation.ts
 * Shared validation primitives leveraged by editors, services, and UI warnings.
 */

export enum Severity {
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor',
  WARNING = 'warning',
}

export interface IValidationError {
  readonly id: string;
  readonly category: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly location?: string;
  readonly field?: string;
  readonly severity?: Severity;
}

export interface IValidationResult {
  readonly isValid: boolean;
  readonly errors: IValidationError[];
  readonly warnings: IValidationError[];
  readonly timestamp?: Date;
}

export interface IValidationRule {
  readonly name: string;
  readonly category: 'warning' | 'error';
  readonly validator: (data: unknown) => boolean;
  readonly message: string;
  readonly field?: string;
}

export type ValidationError = IValidationError;
export type ValidationResult = IValidationResult;


