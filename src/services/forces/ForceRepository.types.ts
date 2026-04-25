/**
 * Force Repository — shared types
 *
 * Leaf module that holds the result types shared between ForceRepository
 * and its operation helpers. Extracting these breaks the ForceRepository ↔
 * ForceRepository.operations circular import without changing the public
 * API (both names continue to be re-exported from ForceRepository.ts).
 */

export enum ForceErrorCode {
  NotFound = 'NOT_FOUND',
  DuplicateName = 'DUPLICATE_NAME',
  ValidationError = 'VALIDATION_ERROR',
  DatabaseError = 'DATABASE_ERROR',
  CircularHierarchy = 'CIRCULAR_HIERARCHY',
}

export interface IForceOperationResult {
  readonly success: boolean;
  readonly id?: string;
  readonly error?: string;
  readonly errorCode?: ForceErrorCode;
}
