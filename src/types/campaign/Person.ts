/**
 * Person Interface - Campaign personnel management
 *
 * Extends the pilot concept with campaign-specific fields for tracking
 * personnel status, roles, experience, injuries, skills, and attributes.
 *
 * @module campaign/Person
 */

import { PersonnelStatus, CampaignPersonnelRole } from './enums';
import { IAttributes, ISkill } from './skills';
import type { IPilot, IPilotSkills, PilotStatus } from '../pilot/PilotInterfaces';

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
// Person Identity
// =============================================================================

/**
 * Personal identity information for a campaign person.
 */
export interface IPersonIdentity {
  /** Display name (first and last) */
  readonly name: string;

  /** Callsign/nickname (optional) */
  readonly callsign?: string;

  /** Given name (first name) */
  readonly givenName?: string;

  /** Surname (family name) */
  readonly surname?: string;

  /** Pre-nominal title (e.g., 'Dr.', 'Sir') */
  readonly preNominal?: string;

  /** Post-nominal title (e.g., 'Jr.', 'III') */
  readonly postNominal?: string;

  /** Gender */
  readonly gender?: 'male' | 'female' | 'other' | 'unknown';

  /** Blood type */
  readonly bloodType?: string;
}

// =============================================================================
// Person Background
// =============================================================================

/**
 * Background and origin information for a campaign person.
 */
export interface IPersonBackground {
  /** Faction/house affiliation */
  readonly affiliation?: string;

  /** Origin planet */
  readonly originPlanet?: string;

  /** Origin faction (may differ from current affiliation) */
  readonly originFaction?: string;

  /** Biography/background notes */
  readonly biography?: string;

  /** Portrait image URL or identifier */
  readonly portrait?: string;

  /** Phenotype (for Clan characters) */
  readonly phenotype?: string;

  /** Bloodname (for Clan characters) */
  readonly bloodname?: string;
}

// =============================================================================
// Person Career
// =============================================================================

/**
 * Career and service record for a campaign person.
 */
export interface IPersonCareer {
  /** Current rank title */
  readonly rank: string;

  /** Rank level (numeric for sorting) */
  readonly rankLevel?: number;

  /** Date joined the campaign/unit */
  readonly recruitmentDate: Date;

  /** Date of death (if deceased) */
  readonly deathDate?: Date;

  /** Date of retirement (if retired) */
  readonly retirementDate?: Date;

  /** Date of last rank change */
  readonly lastRankChangeDate?: Date;

  /** Total missions completed */
  readonly missionsCompleted: number;

  /** Total kills across all missions */
  readonly totalKills: number;

  /** Awards earned */
  readonly awards?: readonly string[];

  /** Date of last promotion (for turnover recent promotion modifier) */
  readonly lastPromotionDate?: Date;

  /** End date of service contract (for turnover service contract modifier) */
  readonly serviceContractEndDate?: Date;

  /** Date when person departed the unit */
  readonly departureDate?: Date;

  /** Reason for departure (e.g., 'retired', 'deserted', 'contract ended') */
  readonly departureReason?: string;
}

// =============================================================================
// Person Experience
// =============================================================================

/**
 * Experience and progression tracking for a campaign person.
 */
export interface IPersonExperience {
  /** Current XP pool (available for spending) */
  readonly xp: number;

  /** Total XP ever earned */
  readonly totalXpEarned: number;

  /** XP spent on skills and abilities */
  readonly xpSpent: number;
}

// =============================================================================
// Person Combat State
// =============================================================================

/**
 * Current combat state and health for a campaign person.
 */
export interface IPersonCombatState {
  /** Current wounds (0-6, 6 = death threshold) */
  readonly hits: number;

  /** Wounds from previous engagement (for tracking) */
  readonly hitsPrior?: number;

  /** Active injuries */
  readonly injuries: readonly IInjury[];

  /** Days remaining until fully healed */
  readonly daysToWaitForHealing: number;

  /** Edge points used this round (for combat tracking) */
  readonly edgeUsedThisRound?: number;
}

// =============================================================================
// Person Assignment
// =============================================================================

/**
 * Unit and role assignment for a campaign person.
 */
export interface IPersonAssignment {
  /** ID of assigned unit (mech, vehicle, etc.) */
  readonly unitId?: string;

  /** ID of assigned doctor (if wounded) */
  readonly doctorId?: string;

  /** IDs of units this person maintains (if tech) */
  readonly techUnitIds?: readonly string[];

  /** ID of assigned force/lance */
  readonly forceId?: string;
}

// =============================================================================
// Main Person Interface
// =============================================================================

/**
 * Complete campaign person entity.
 *
 * Represents a character in the campaign system with full tracking of
 * identity, status, roles, skills, attributes, injuries, and career.
 *
 * Designed to be backwards compatible with IPilot while adding
 * campaign-specific functionality.
 *
 * @example
 * const person: IPerson = {
 *   id: 'person-001',
 *   name: 'John Smith',
 *   callsign: 'Hammer',
 *   status: PersonnelStatus.ACTIVE,
 *   primaryRole: CampaignPersonnelRole.PILOT,
 *   secondaryRole: CampaignPersonnelRole.TECH,
 *   rank: 'Lieutenant',
 *   xp: 500,
 *   totalXpEarned: 1500,
 *   xpSpent: 1000,
 *   hits: 0,
 *   injuries: [],
 *   skills: { gunnery: { level: 4, bonus: 0, xpProgress: 0, typeId: 'gunnery' } },
 *   attributes: { STR: 5, BOD: 5, REF: 6, DEX: 7, INT: 5, WIL: 5, CHA: 5, Edge: 2 },
 *   pilotSkills: { gunnery: 4, piloting: 5 },
 *   recruitmentDate: new Date('2024-01-01'),
 *   missionsCompleted: 12,
 *   totalKills: 8,
 *   daysToWaitForHealing: 0,
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2025-01-25T00:00:00Z'
 * };
 */
export interface IPerson extends IPersonIdentity, IPersonBackground {
  // =========================================================================
  // Core Identity (from IEntity pattern)
  // =========================================================================

  /** Unique identifier */
  readonly id: string;

  /** Creation timestamp (ISO 8601) */
  readonly createdAt: string;

  /** Last update timestamp (ISO 8601) */
  readonly updatedAt: string;

  // =========================================================================
  // Status and Roles
  // =========================================================================

  /** Current personnel status */
  readonly status: PersonnelStatus;

  /** Primary role in the unit */
  readonly primaryRole: CampaignPersonnelRole;

  /** Secondary role (optional) */
  readonly secondaryRole?: CampaignPersonnelRole;

  // =========================================================================
  // Career (from IPersonCareer)
  // =========================================================================

  /** Current rank title */
  readonly rank: string;

  /** Rank level (numeric for sorting) */
  readonly rankLevel?: number;

  /** Date joined the campaign/unit */
  readonly recruitmentDate: Date;

  /** Date of death (if deceased) */
  readonly deathDate?: Date;

  /** Date of retirement (if retired) */
  readonly retirementDate?: Date;

  /** Date of last rank change */
  readonly lastRankChangeDate?: Date;

  /** Total missions completed */
  readonly missionsCompleted: number;

  /** Total kills across all missions */
  readonly totalKills: number;

  /** Awards earned (award IDs) */
  readonly awards?: readonly string[];

  /** Date of last promotion (for turnover recent promotion modifier) */
  readonly lastPromotionDate?: Date;

  /** End date of service contract (for turnover service contract modifier) */
  readonly serviceContractEndDate?: Date;

  /** Date when person departed the unit */
  readonly departureDate?: Date;

  /** Reason for departure (e.g., 'retired', 'deserted', 'contract ended') */
  readonly departureReason?: string;

  // =========================================================================
  // Experience (from IPersonExperience)
  // =========================================================================

  /** Current XP pool (available for spending) */
  readonly xp: number;

  /** Total XP ever earned */
  readonly totalXpEarned: number;

  /** XP spent on skills and abilities */
  readonly xpSpent: number;

  // =========================================================================
  // Combat State (from IPersonCombatState)
  // =========================================================================

  /** Current wounds (0-6, 6 = death threshold) */
  readonly hits: number;

  /** Wounds from previous engagement */
  readonly hitsPrior?: number;

  /** Active injuries */
  readonly injuries: readonly IInjury[];

  /** Days remaining until fully healed */
  readonly daysToWaitForHealing: number;

  /** Edge points used this round */
  readonly edgeUsedThisRound?: number;

  // =========================================================================
  // Skills and Attributes
  // =========================================================================

  /**
   * Campaign skills (detailed skill system).
   * Record of skill ID to ISkill instance.
   */
  readonly skills: Record<string, ISkill>;

  /** Character attributes (STR, BOD, REF, DEX, INT, WIL, CHA, Edge) */
  readonly attributes: IAttributes;

  /**
   * Pilot combat skills (gunnery/piloting).
   * Separate from campaign skills for backwards compatibility with IPilot.
   */
  readonly pilotSkills: IPilotSkills;

  // =========================================================================
  // Assignment (from IPersonAssignment)
  // =========================================================================

  /** ID of assigned unit (mech, vehicle, etc.) */
  readonly unitId?: string;

  /** ID of assigned doctor (if wounded) */
  readonly doctorId?: string;

  /** IDs of units this person maintains (if tech) */
  readonly techUnitIds?: readonly string[];

  /** ID of assigned force/lance */
  readonly forceId?: string;

  // =========================================================================
  // Flags
  // =========================================================================

  /** Whether this person is a founder of the unit (+1 share) */
  readonly isFounder?: boolean;

  /** Whether this person is the commander */
  readonly isCommander?: boolean;

  /** Whether this person is second in command */
  readonly isSecondInCommand?: boolean;

  /** Whether this person is immortal (cannot die) */
  readonly isImmortal?: boolean;

  /** Whether this person is a Clan character */
  readonly isClan?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a person is alive (not KIA or deceased).
 *
 * @param person - The person to check
 * @returns true if the person is alive
 *
 * @example
 * isAlive(activePerson) // true
 * isAlive(kiaPerson) // false
 */
export function isAlive(person: IPerson): boolean {
  return (
    person.status !== PersonnelStatus.KIA &&
    person.deathDate === undefined
  );
}

/**
 * Checks if a person is active and available for duty.
 *
 * Active means: alive, not MIA, not POW, not AWOL, not DESERTED,
 * not RETIRED, not WOUNDED, not ON_LEAVE, not STUDENT.
 *
 * @param person - The person to check
 * @returns true if the person is active
 *
 * @example
 * isActive(activePerson) // true
 * isActive(woundedPerson) // false
 */
export function isActive(person: IPerson): boolean {
  return person.status === PersonnelStatus.ACTIVE;
}

/**
 * Checks if a person is available for assignment.
 *
 * Available means: active or on leave (can be recalled).
 *
 * @param person - The person to check
 * @returns true if the person is available
 */
export function isAvailable(person: IPerson): boolean {
  return (
    person.status === PersonnelStatus.ACTIVE ||
    person.status === PersonnelStatus.ON_LEAVE
  );
}

/**
 * Checks if a person is wounded and recovering.
 *
 * @param person - The person to check
 * @returns true if the person is wounded
 */
export function isWounded(person: IPerson): boolean {
  return (
    person.status === PersonnelStatus.WOUNDED ||
    person.hits > 0 ||
    person.injuries.length > 0
  );
}

/**
 * Gets the total XP earned by a person.
 *
 * @param person - The person to check
 * @returns Total XP earned
 *
 * @example
 * getTotalXP(person) // 1500
 */
export function getTotalXP(person: IPerson): number {
  return person.totalXpEarned;
}

/**
 * Gets the available XP for a person (unspent).
 *
 * @param person - The person to check
 * @returns Available XP
 */
export function getAvailableXP(person: IPerson): number {
  return person.xp;
}

/**
 * Checks if a person has any permanent injuries.
 *
 * @param person - The person to check
 * @returns true if the person has permanent injuries
 */
export function hasPermanentInjuries(person: IPerson): boolean {
  return person.injuries.some((injury) => injury.permanent);
}

/**
 * Gets the total days to heal all injuries.
 *
 * @param person - The person to check
 * @returns Total days to heal (max of all injury heal times)
 */
export function getTotalHealingDays(person: IPerson): number {
  if (person.injuries.length === 0) {
    return person.daysToWaitForHealing;
  }

  const maxInjuryDays = Math.max(
    ...person.injuries
      .filter((injury) => !injury.permanent)
      .map((injury) => injury.daysToHeal)
  );

  return Math.max(person.daysToWaitForHealing, maxInjuryDays || 0);
}

/**
 * Checks if a person is a combat role (pilot, driver, soldier).
 *
 * @param person - The person to check
 * @returns true if the person has a combat role
 */
export function isCombatRole(person: IPerson): boolean {
  const combatRoles = [
    CampaignPersonnelRole.PILOT,
    CampaignPersonnelRole.AEROSPACE_PILOT,
    CampaignPersonnelRole.VEHICLE_DRIVER,
    CampaignPersonnelRole.SOLDIER,
  ];

  return combatRoles.includes(person.primaryRole);
}

/**
 * Checks if a person is a support role (tech, doctor, admin, etc.).
 *
 * @param person - The person to check
 * @returns true if the person has a support role
 */
export function isSupportRole(person: IPerson): boolean {
  const supportRoles = [
    CampaignPersonnelRole.TECH,
    CampaignPersonnelRole.DOCTOR,
    CampaignPersonnelRole.MEDIC,
    CampaignPersonnelRole.ADMIN,
    CampaignPersonnelRole.SUPPORT,
  ];

  return supportRoles.includes(person.primaryRole);
}

// =============================================================================
// Migration Helper
// =============================================================================

/**
 * Maps PilotStatus to PersonnelStatus for migration.
 */
const PILOT_STATUS_MAP: Record<string, PersonnelStatus> = {
  active: PersonnelStatus.ACTIVE,
  injured: PersonnelStatus.WOUNDED,
  mia: PersonnelStatus.MIA,
  kia: PersonnelStatus.KIA,
  retired: PersonnelStatus.RETIRED,
};

/**
 * Converts an IPilot to an IPerson for campaign use.
 *
 * This migration helper allows existing pilots to be used in the campaign
 * system while preserving their core data and adding campaign-specific fields.
 *
 * @param pilot - The pilot to convert
 * @param options - Optional additional fields to set
 * @returns A new IPerson instance
 *
 * @example
 * const person = pilotToPerson(existingPilot, {
 *   primaryRole: CampaignPersonnelRole.PILOT,
 *   rank: 'MechWarrior'
 * });
 */
export function pilotToPerson(
  pilot: IPilot,
  options?: Partial<{
    primaryRole: CampaignPersonnelRole;
    secondaryRole: CampaignPersonnelRole;
    rank: string;
    recruitmentDate: Date;
    attributes: IAttributes;
  }>
): IPerson {
  // Map pilot status to personnel status
  const status = PILOT_STATUS_MAP[pilot.status] ?? PersonnelStatus.ACTIVE;

  // Default attributes (average values)
  const defaultAttributes: IAttributes = {
    STR: 5,
    BOD: 5,
    REF: 5,
    DEX: 5,
    INT: 5,
    WIL: 5,
    CHA: 5,
    Edge: 0,
  };

  return {
    // Core identity
    id: pilot.id,
    name: pilot.name,
    callsign: pilot.callsign,
    createdAt: pilot.createdAt,
    updatedAt: pilot.updatedAt,

    // Background (from pilot)
    affiliation: pilot.affiliation,
    portrait: pilot.portrait,
    biography: pilot.background,

    // Status and roles
    status,
    primaryRole: options?.primaryRole ?? CampaignPersonnelRole.PILOT,
    secondaryRole: options?.secondaryRole,

    // Career
    rank: options?.rank ?? pilot.career?.rank ?? 'MechWarrior',
    recruitmentDate: options?.recruitmentDate ?? new Date(),
    missionsCompleted: pilot.career?.missionsCompleted ?? 0,
    totalKills: pilot.career?.totalKills ?? 0,

    // Experience
    xp: pilot.career?.xp ?? 0,
    totalXpEarned: pilot.career?.totalXpEarned ?? 0,
    xpSpent: (pilot.career?.totalXpEarned ?? 0) - (pilot.career?.xp ?? 0),

    // Combat state
    hits: pilot.wounds,
    injuries: [],
    daysToWaitForHealing: pilot.wounds > 0 ? pilot.wounds * 7 : 0,

    // Skills and attributes
    skills: {},
    attributes: options?.attributes ?? defaultAttributes,
    pilotSkills: pilot.skills,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an object is an IInjury.
 */
export function isInjury(obj: unknown): obj is IInjury {
  if (typeof obj !== 'object' || obj === null) return false;
  const injury = obj as IInjury;
  return (
    typeof injury.id === 'string' &&
    typeof injury.type === 'string' &&
    typeof injury.location === 'string' &&
    typeof injury.severity === 'number' &&
    typeof injury.daysToHeal === 'number' &&
    typeof injury.permanent === 'boolean' &&
    injury.acquired instanceof Date
  );
}

/**
 * Type guard to check if an object is an IPerson.
 */
export function isPerson(obj: unknown): obj is IPerson {
  if (typeof obj !== 'object' || obj === null) return false;
  const person = obj as IPerson;
  return (
    typeof person.id === 'string' &&
    typeof person.name === 'string' &&
    typeof person.status === 'string' &&
    typeof person.primaryRole === 'string' &&
    typeof person.rank === 'string' &&
    typeof person.xp === 'number' &&
    typeof person.totalXpEarned === 'number' &&
    typeof person.hits === 'number' &&
    Array.isArray(person.injuries) &&
    typeof person.skills === 'object' &&
    typeof person.attributes === 'object' &&
    typeof person.pilotSkills === 'object' &&
    person.recruitmentDate instanceof Date &&
    typeof person.missionsCompleted === 'number' &&
    typeof person.totalKills === 'number'
  );
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a default IAttributes object with average values.
 */
export function createDefaultAttributes(): IAttributes {
  return {
    STR: 5,
    BOD: 5,
    REF: 5,
    DEX: 5,
    INT: 5,
    WIL: 5,
    CHA: 5,
    Edge: 0,
  };
}

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
