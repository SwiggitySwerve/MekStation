/**
 * Pilot Repository — shared types
 *
 * Leaf module that holds the result types shared between PilotRepository
 * and its career-operation helpers. Extracting these breaks the
 * PilotRepository ↔ PilotRepository.career circular import without
 * changing the public API (both names continue to be re-exported from
 * PilotRepository.ts and from the pilots barrel index).
 */

export enum PilotErrorCode {
  NotFound = 'NOT_FOUND',
  DuplicateName = 'DUPLICATE_NAME',
  ValidationError = 'VALIDATION_ERROR',
  DatabaseError = 'DATABASE_ERROR',
  InsufficientXp = 'INSUFFICIENT_XP',
}

export interface IPilotOperationResult {
  readonly success: boolean;
  readonly id?: string;
  readonly error?: string;
  readonly errorCode?: PilotErrorCode;
}
