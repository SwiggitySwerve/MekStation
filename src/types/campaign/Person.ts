/**
 * Injury types for campaign personnel.
 *
 * After the legacy person god-type was deleted in
 * `wire-iperson-hard-cutover` PR5, this module shrank to just the
 * injury value-type plus its factory. Both are consumed by the
 * medical helpers and the campaign roster entry
 * (`ICampaignRosterEntry.injuries`), neither of which needs anything
 * beyond IInjury / createInjury.
 *
 * @module campaign/Person
 */

// =============================================================================
// Injury Interface
// =============================================================================

/**
 * Represents a physical injury sustained by a person.
 *
 * Injuries track healing progress, permanence, and location/type.
 * Used for advanced medical tracking in campaign mode.
 *
 * @example
 * const injury: IInjury = {
 *   id: 'inj-001',
 *   type: 'Broken Arm',
 *   location: 'Left Arm',
 *   severity: 2,
 *   daysToHeal: 14,
 *   permanent: false,
 *   acquired: new Date('2025-01-15'),
 *   description: 'Fractured radius from mech ejection'
 * };
 */
export interface IInjury {
  /** Unique identifier for this injury */
  readonly id: string;

  /** Type of injury (e.g., 'Broken Bone', 'Burn', 'Concussion') */
  readonly type: string;

  /** Body location of the injury (e.g., 'Left Arm', 'Torso', 'Head') */
  readonly location: string;

  /** Severity level (1-5, higher = more severe) */
  readonly severity: number;

  /** Days remaining until healed (0 = healed) */
  readonly daysToHeal: number;

  /** Whether this injury is permanent (cannot heal naturally) */
  readonly permanent: boolean;

  /** Date when the injury was acquired */
  readonly acquired: Date;

  /** Optional description of how the injury occurred */
  readonly description?: string;

  /** Optional modifier to skill checks while injured */
  readonly skillModifier?: number;

  /** Optional modifier to attribute checks while injured */
  readonly attributeModifier?: number;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a new injury instance.
 *
 * @param params - Injury parameters
 * @returns A new IInjury instance
 */
export function createInjury(params: {
  id: string;
  type: string;
  location: string;
  severity: number;
  daysToHeal: number;
  permanent?: boolean;
  acquired?: Date;
  description?: string;
  skillModifier?: number;
  attributeModifier?: number;
}): IInjury {
  return {
    id: params.id,
    type: params.type,
    location: params.location,
    severity: params.severity,
    daysToHeal: params.daysToHeal,
    permanent: params.permanent ?? false,
    acquired: params.acquired ?? new Date(),
    description: params.description,
    skillModifier: params.skillModifier,
    attributeModifier: params.attributeModifier,
  };
}
