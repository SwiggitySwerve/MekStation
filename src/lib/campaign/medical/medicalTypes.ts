/**
 * Medical System Types - Campaign medical mechanics
 *
 * Defines the core types for the medical system including:
 * - MedicalSystem enum (STANDARD, ADVANCED, ALTERNATE)
 * - IMedicalCheckResult interface for medical checks
 * - ISurgeryResult interface for surgical procedures
 *
 * @module campaign/medical/medicalTypes
 */

// =============================================================================
// Medical System Enum
// =============================================================================

/**
 * Enumeration of available medical systems in the campaign.
 *
 * - STANDARD: Basic medical system with simple healing mechanics
 * - ADVANCED: Advanced medical system with detailed medical checks
 * - ALTERNATE: Alternate medical system with different mechanics
 *
 * @example
 * const system = MedicalSystem.STANDARD;
 */
export enum MedicalSystem {
  STANDARD = 'standard',
  ADVANCED = 'advanced',
  ALTERNATE = 'alternate',
}

// =============================================================================
// Medical Check Result Interface
// =============================================================================

/**
 * Represents the result of a medical check on an injured person.
 *
 * Medical checks determine healing progress, complications, and outcomes
 * for injuries. Results track the roll, modifiers, and healing impact.
 *
 * @example
 * const result: IMedicalCheckResult = {
 *   patientId: 'person-001',
 *   doctorId: 'person-002',
 *   system: MedicalSystem.STANDARD,
 *   roll: 8,
 *   targetNumber: 6,
 *   margin: 2,
 *   outcome: 'healed',
 *   injuryId: 'inj-001',
 *   healingDaysReduced: 7,
 *   modifiers: [
 *     { name: 'Doctor Skill', value: 2 },
 *     { name: 'Injury Severity', value: -1 }
 *   ]
 * };
 */
export interface IMedicalCheckResult {
  /** ID of the patient being treated */
  readonly patientId: string;

  /** ID of the doctor performing the check (optional) */
  readonly doctorId?: string;

  /** Medical system used for this check */
  readonly system: MedicalSystem;

  /** The dice roll result */
  readonly roll: number;

  /** Target number for the check */
  readonly targetNumber: number;

  /** Margin of success/failure (positive = success, negative = failure) */
  readonly margin: number;

  /** Outcome of the medical check */
  readonly outcome:
    | 'healed'
    | 'no_change'
    | 'worsened'
    | 'permanent_healed'
    | 'critical_success'
    | 'fumble';

  /** ID of the injury being treated */
  readonly injuryId: string;

  /** Number of healing days reduced by this check */
  readonly healingDaysReduced: number;

  /** Modifiers applied to this check */
  readonly modifiers: readonly { name: string; value: number }[];
}

// =============================================================================
// Surgery Result Interface
// =============================================================================

/**
 * Represents the result of a surgical procedure on an injured person.
 *
 * Surgery results extend medical check results with additional outcomes
 * specific to surgical procedures (permanent injury removal, prosthetics).
 *
 * @example
 * const result: ISurgeryResult = {
 *   patientId: 'person-001',
 *   doctorId: 'person-002',
 *   system: MedicalSystem.ADVANCED,
 *   roll: 10,
 *   targetNumber: 8,
 *   margin: 2,
 *   outcome: 'permanent_healed',
 *   injuryId: 'inj-001',
 *   healingDaysReduced: 30,
 *   modifiers: [
 *     { name: 'Surgical Facility', value: 2 }
 *   ],
 *   permanentRemoved: true,
 *   prostheticInstalled: false
 * };
 */
export interface ISurgeryResult extends IMedicalCheckResult {
  /** Whether a permanent injury was removed by surgery */
  readonly permanentRemoved: boolean;

  /** Whether a prosthetic was installed during surgery */
  readonly prostheticInstalled: boolean;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a valid MedicalSystem.
 *
 * @param value - The value to check
 * @returns true if the value is a valid MedicalSystem
 *
 * @example
 * if (isMedicalSystem(value)) {
 *   logger.debug(`System: ${value}`);
 * }
 */
export function isMedicalSystem(value: unknown): value is MedicalSystem {
  return (
    value === MedicalSystem.STANDARD ||
    value === MedicalSystem.ADVANCED ||
    value === MedicalSystem.ALTERNATE
  );
}

/**
 * Type guard to check if an object is an IMedicalCheckResult.
 *
 * @param value - The value to check
 * @returns true if the value is an IMedicalCheckResult
 *
 * @example
 * if (isMedicalCheckResult(obj)) {
 *   logger.debug(`Patient: ${obj.patientId}`);
 * }
 */
export function isMedicalCheckResult(
  value: unknown,
): value is IMedicalCheckResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as IMedicalCheckResult;
  return (
    typeof result.patientId === 'string' &&
    (result.doctorId === undefined || typeof result.doctorId === 'string') &&
    isMedicalSystem(result.system) &&
    typeof result.roll === 'number' &&
    typeof result.targetNumber === 'number' &&
    typeof result.margin === 'number' &&
    [
      'healed',
      'no_change',
      'worsened',
      'permanent_healed',
      'critical_success',
      'fumble',
    ].includes(result.outcome) &&
    typeof result.injuryId === 'string' &&
    typeof result.healingDaysReduced === 'number' &&
    Array.isArray(result.modifiers)
  );
}

/**
 * Type guard to check if an object is an ISurgeryResult.
 *
 * @param value - The value to check
 * @returns true if the value is an ISurgeryResult
 *
 * @example
 * if (isSurgeryResult(obj)) {
 *   logger.debug(`Permanent removed: ${obj.permanentRemoved}`);
 * }
 */
export function isSurgeryResult(value: unknown): value is ISurgeryResult {
  if (!isMedicalCheckResult(value)) return false;
  const result = value as ISurgeryResult;
  return (
    typeof result.permanentRemoved === 'boolean' &&
    typeof result.prostheticInstalled === 'boolean'
  );
}
