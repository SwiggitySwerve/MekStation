/**
 * Campaign Aggregate - Root entity for campaign management
 *
 * Aggregates personnel, forces, missions, and finances into a single
 * campaign entity. References MekStation units via their IDs (does not
 * duplicate unit data).
 *
 * @module campaign/Campaign
 */

import { IPerson, isActive } from './Person';
import { IForce, getAllUnits as getForceUnits } from './Force';
import { IFinances } from './IFinances';
import { Money } from './Money';
import { MissionStatus, PersonnelStatus } from './enums';

// =============================================================================
// Mission Interface (Stub)
// =============================================================================

/**
 * Stub interface for missions.
 *
 * This is a minimal interface for MVP. Full mission system will be
 * implemented in a future task.
 *
 * @example
 * const mission: IMission = {
 *   id: 'mission-001',
 *   name: 'Raid on Hesperus II',
 *   status: MissionStatus.ACTIVE,
 *   description: 'Raid enemy supply depot',
 *   startDate: new Date('3025-06-15'),
 *   createdAt: '2026-01-26T10:00:00Z',
 *   updatedAt: '2026-01-26T10:00:00Z',
 * };
 */
export interface IMission {
  /** Unique identifier */
  readonly id: string;

  /** Mission name */
  readonly name: string;

  /** Current mission status */
  readonly status: MissionStatus;

  /** Mission description (optional) */
  readonly description?: string;

  /** Mission start date (optional) */
  readonly startDate?: Date;

  /** Mission end date (optional) */
  readonly endDate?: Date;

  /** Employer faction ID (optional) */
  readonly employerId?: string;

  /** Target faction ID (optional) */
  readonly targetId?: string;

  /** Creation timestamp (ISO 8601) */
  readonly createdAt: string;

  /** Last update timestamp (ISO 8601) */
  readonly updatedAt: string;
}

// =============================================================================
// Campaign Options Interface
// =============================================================================

/**
 * Campaign options for customizing campaign behavior.
 *
 * Contains 40 essential options (of 200+ in MekHQ) organized by category:
 * - Personnel options (~10)
 * - Financial options (~10)
 * - Combat options (~8)
 * - Force options (~6)
 * - General options (~6)
 *
 * @example
 * const options: ICampaignOptions = {
 *   // Personnel
 *   healingRateMultiplier: 1.0,
 *   salaryMultiplier: 1.0,
 *   retirementAge: 65,
 *   // ... more options
 * };
 */
export interface ICampaignOptions {
  // =========================================================================
  // Personnel Options (~10)
  // =========================================================================

  /** Multiplier for natural healing rate (1.0 = normal) */
  readonly healingRateMultiplier: number;

  /** Multiplier for all salaries (1.0 = normal) */
  readonly salaryMultiplier: number;

  /** Age at which personnel may retire */
  readonly retirementAge: number;

  /** Days to wait between healing checks */
  readonly healingWaitingPeriod: number;

  /** Whether to use advanced medical system */
  readonly useAdvancedMedical: boolean;

  /** Maximum patients per doctor */
  readonly maxPatientsPerDoctor: number;

  /** XP awarded per mission */
  readonly xpPerMission: number;

  /** XP awarded per kill */
  readonly xpPerKill: number;

  /** Whether to track time in service */
  readonly trackTimeInService: boolean;

  /** Whether to use edge points */
  readonly useEdge: boolean;

  // =========================================================================
  // Financial Options (~10)
  // =========================================================================

  /** Starting funds in C-bills */
  readonly startingFunds: number;

  /** Multiplier for maintenance costs (1.0 = normal) */
  readonly maintenanceCostMultiplier: number;

  /** Multiplier for repair costs (1.0 = normal) */
  readonly repairCostMultiplier: number;

  /** Multiplier for part acquisition costs (1.0 = normal) */
  readonly acquisitionCostMultiplier: number;

  /** Whether to pay for unit maintenance */
  readonly payForMaintenance: boolean;

  /** Whether to pay for repairs */
  readonly payForRepairs: boolean;

  /** Whether to pay salaries */
  readonly payForSalaries: boolean;

  /** Whether to pay for ammunition */
  readonly payForAmmunition: boolean;

  /** Days between maintenance cycles */
  readonly maintenanceCycleDays: number;

  /** Whether to use loan system */
  readonly useLoanSystem: boolean;

  // =========================================================================
  // Combat Options (~8)
  // =========================================================================

  /** Whether to use auto-resolve for battles */
  readonly useAutoResolve: boolean;

  /** Casualty rate multiplier for auto-resolve (1.0 = normal) */
  readonly autoResolveCasualtyRate: number;

  /** Whether pilots can be captured */
  readonly allowPilotCapture: boolean;

  /** Whether to use random pilot injuries */
  readonly useRandomInjuries: boolean;

  /** Chance of pilot death on mech destruction (0.0-1.0) */
  readonly pilotDeathChance: number;

  /** Whether ejection is automatic on destruction */
  readonly autoEject: boolean;

  /** Whether to track ammunition usage */
  readonly trackAmmunition: boolean;

  /** Whether to use quirks system */
  readonly useQuirks: boolean;

  // =========================================================================
  // Force Options (~6)
  // =========================================================================

  /** Maximum units per lance */
  readonly maxUnitsPerLance: number;

  /** Maximum lances per company */
  readonly maxLancesPerCompany: number;

  /** Whether to enforce formation rules */
  readonly enforceFormationRules: boolean;

  /** Whether to allow mixed unit types in formations */
  readonly allowMixedFormations: boolean;

  /** Whether to require commanders for forces */
  readonly requireForceCommanders: boolean;

  /** Whether to use combat teams (AtB) */
  readonly useCombatTeams: boolean;

  // =========================================================================
  // General Options (~6)
  // =========================================================================

  /** Date format for display (e.g., 'yyyy-MM-dd') */
  readonly dateFormat: string;

  /** Whether to use faction-specific rules */
  readonly useFactionRules: boolean;

  /** Tech level limit (0=Intro, 1=Standard, 2=Advanced, 3=Experimental) */
  readonly techLevel: number;

  /** Whether to limit equipment by year */
  readonly limitByYear: boolean;

  /** Whether to allow Clan equipment for IS factions */
  readonly allowClanEquipment: boolean;

  /** Whether to use random events */
  readonly useRandomEvents: boolean;
}

// =============================================================================
// Campaign Interface
// =============================================================================

/**
 * Root campaign aggregate entity.
 *
 * The campaign is the top-level entity that owns all other campaign entities:
 * - Personnel (Map<string, IPerson>)
 * - Forces (Map<string, IForce>)
 * - Missions (Map<string, IMission>)
 * - Finances (IFinances)
 *
 * Units are referenced by ID (string[]) in forces, not duplicated here.
 * Unit data lives in MekStation's unit stores.
 *
 * @example
 * const campaign: ICampaign = {
 *   id: 'campaign-001',
 *   name: "Wolf's Dragoons",
 *   currentDate: new Date('3025-01-01'),
 *   factionId: 'mercenary',
 *   personnel: new Map(),
 *   forces: new Map(),
 *   rootForceId: 'force-root',
 *   missions: new Map(),
 *   finances: { transactions: [], balance: Money.ZERO },
 *   options: createDefaultCampaignOptions(),
 *   createdAt: '2026-01-26T10:00:00Z',
 *   updatedAt: '2026-01-26T10:00:00Z',
 * };
 */
export interface ICampaign {
  /** Unique identifier */
  readonly id: string;

  /** Campaign name */
  readonly name: string;

  /** Current in-game date */
  readonly currentDate: Date;

  /** Player's faction ID (e.g., 'davion', 'steiner', 'mercenary') */
  readonly factionId: string;

  /** All personnel in the campaign */
  readonly personnel: Map<string, IPerson>;

  /** All forces in the campaign (hierarchical tree) */
  readonly forces: Map<string, IForce>;

  /** ID of the root force (top of hierarchy) */
  readonly rootForceId: string;

  /** All missions in the campaign */
  readonly missions: Map<string, IMission>;

  /** Campaign finances */
  readonly finances: IFinances;

  /** Campaign options */
  readonly options: ICampaignOptions;

  /** Campaign start date (when campaign was created in-game) */
  readonly campaignStartDate?: Date;

  /** Campaign description (optional) */
  readonly description?: string;

  /** Campaign icon/logo URL (optional) */
  readonly iconUrl?: string;

  /** Creation timestamp (ISO 8601) */
  readonly createdAt: string;

  /** Last update timestamp (ISO 8601) */
  readonly updatedAt: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the total number of personnel in the campaign.
 *
 * @param campaign - The campaign to query
 * @returns Total personnel count
 *
 * @example
 * const total = getTotalPersonnel(campaign); // 42
 */
export function getTotalPersonnel(campaign: ICampaign): number {
  return campaign.personnel.size;
}

/**
 * Gets all active personnel in the campaign.
 *
 * Active means PersonnelStatus.ACTIVE (available for duty).
 *
 * @param campaign - The campaign to query
 * @returns Array of active personnel
 *
 * @example
 * const active = getActivePersonnel(campaign);
 * console.log(`${active.length} personnel ready for duty`);
 */
export function getActivePersonnel(campaign: ICampaign): IPerson[] {
  return Array.from(campaign.personnel.values()).filter(isActive);
}

/**
 * Gets personnel by status.
 *
 * @param campaign - The campaign to query
 * @param status - The status to filter by
 * @returns Array of personnel with the given status
 *
 * @example
 * const wounded = getPersonnelByStatus(campaign, PersonnelStatus.WOUNDED);
 */
export function getPersonnelByStatus(
  campaign: ICampaign,
  status: PersonnelStatus
): IPerson[] {
  return Array.from(campaign.personnel.values()).filter(
    (person) => person.status === status
  );
}

/**
 * Gets the total number of forces in the campaign.
 *
 * @param campaign - The campaign to query
 * @returns Total force count
 *
 * @example
 * const total = getTotalForces(campaign); // 12
 */
export function getTotalForces(campaign: ICampaign): number {
  return campaign.forces.size;
}

/**
 * Gets all unit IDs from all forces in the campaign.
 *
 * Traverses the entire force tree and collects all unit IDs.
 * Does not include duplicate IDs.
 *
 * @param campaign - The campaign to query
 * @returns Array of unique unit IDs
 *
 * @example
 * const unitIds = getAllUnits(campaign);
 * console.log(`Campaign has ${unitIds.length} units`);
 */
export function getAllUnits(campaign: ICampaign): string[] {
  const unitIds = new Set<string>();

  // Get root force
  const rootForce = campaign.forces.get(campaign.rootForceId);
  if (!rootForce) {
    return [];
  }

  // Collect all units from root force and descendants
  const allUnitIds = getForceUnits(rootForce, campaign.forces);
  allUnitIds.forEach((id) => unitIds.add(id));

  return Array.from(unitIds);
}

/**
 * Gets the current balance from campaign finances.
 *
 * @param campaign - The campaign to query
 * @returns Current balance as Money
 *
 * @example
 * const balance = getBalance(campaign);
 * console.log(`Balance: ${balance.format()}`);
 */
export function getBalance(campaign: ICampaign): Money {
  return campaign.finances.balance;
}

/**
 * Gets the total number of missions in the campaign.
 *
 * @param campaign - The campaign to query
 * @returns Total mission count
 *
 * @example
 * const total = getTotalMissions(campaign); // 5
 */
export function getTotalMissions(campaign: ICampaign): number {
  return campaign.missions.size;
}

/**
 * Gets missions by status.
 *
 * @param campaign - The campaign to query
 * @param status - The status to filter by
 * @returns Array of missions with the given status
 *
 * @example
 * const active = getMissionsByStatus(campaign, MissionStatus.ACTIVE);
 */
export function getMissionsByStatus(
  campaign: ICampaign,
  status: MissionStatus
): IMission[] {
  return Array.from(campaign.missions.values()).filter(
    (mission) => mission.status === status
  );
}

/**
 * Gets the active missions in the campaign.
 *
 * @param campaign - The campaign to query
 * @returns Array of active missions
 *
 * @example
 * const active = getActiveMissions(campaign);
 */
export function getActiveMissions(campaign: ICampaign): IMission[] {
  return getMissionsByStatus(campaign, MissionStatus.ACTIVE);
}

/**
 * Gets a person by ID.
 *
 * @param campaign - The campaign to query
 * @param personId - The person ID to find
 * @returns The person or undefined if not found
 *
 * @example
 * const person = getPersonById(campaign, 'person-001');
 */
export function getPersonById(
  campaign: ICampaign,
  personId: string
): IPerson | undefined {
  return campaign.personnel.get(personId);
}

/**
 * Gets a force by ID.
 *
 * @param campaign - The campaign to query
 * @param forceId - The force ID to find
 * @returns The force or undefined if not found
 *
 * @example
 * const force = getForceById(campaign, 'force-001');
 */
export function getForceById(
  campaign: ICampaign,
  forceId: string
): IForce | undefined {
  return campaign.forces.get(forceId);
}

/**
 * Gets a mission by ID.
 *
 * @param campaign - The campaign to query
 * @param missionId - The mission ID to find
 * @returns The mission or undefined if not found
 *
 * @example
 * const mission = getMissionById(campaign, 'mission-001');
 */
export function getMissionById(
  campaign: ICampaign,
  missionId: string
): IMission | undefined {
  return campaign.missions.get(missionId);
}

/**
 * Gets the root force of the campaign.
 *
 * @param campaign - The campaign to query
 * @returns The root force or undefined if not found
 *
 * @example
 * const rootForce = getRootForce(campaign);
 */
export function getRootForce(campaign: ICampaign): IForce | undefined {
  return campaign.forces.get(campaign.rootForceId);
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an object is an IMission.
 *
 * @param value - The value to check
 * @returns true if the value is an IMission
 *
 * @example
 * if (isMission(obj)) {
 *   console.log(obj.name);
 * }
 */
export function isMission(value: unknown): value is IMission {
  if (typeof value !== 'object' || value === null) return false;
  const mission = value as IMission;
  return (
    typeof mission.id === 'string' &&
    typeof mission.name === 'string' &&
    typeof mission.status === 'string' &&
    typeof mission.createdAt === 'string' &&
    typeof mission.updatedAt === 'string'
  );
}

/**
 * Type guard to check if an object is an ICampaignOptions.
 *
 * @param value - The value to check
 * @returns true if the value is an ICampaignOptions
 *
 * @example
 * if (isCampaignOptions(obj)) {
 *   console.log(obj.salaryMultiplier);
 * }
 */
export function isCampaignOptions(value: unknown): value is ICampaignOptions {
  if (typeof value !== 'object' || value === null) return false;
  const options = value as ICampaignOptions;
  return (
    typeof options.healingRateMultiplier === 'number' &&
    typeof options.salaryMultiplier === 'number' &&
    typeof options.retirementAge === 'number' &&
    typeof options.startingFunds === 'number' &&
    typeof options.maintenanceCostMultiplier === 'number' &&
    typeof options.useAutoResolve === 'boolean' &&
    typeof options.maxUnitsPerLance === 'number' &&
    typeof options.dateFormat === 'string'
  );
}

/**
 * Type guard to check if an object is an ICampaign.
 *
 * @param value - The value to check
 * @returns true if the value is an ICampaign
 *
 * @example
 * if (isCampaign(obj)) {
 *   console.log(obj.name);
 * }
 */
export function isCampaign(value: unknown): value is ICampaign {
  if (typeof value !== 'object' || value === null) return false;
  const campaign = value as ICampaign;
  return (
    typeof campaign.id === 'string' &&
    typeof campaign.name === 'string' &&
    campaign.currentDate instanceof Date &&
    typeof campaign.factionId === 'string' &&
    campaign.personnel instanceof Map &&
    campaign.forces instanceof Map &&
    typeof campaign.rootForceId === 'string' &&
    campaign.missions instanceof Map &&
    typeof campaign.finances === 'object' &&
    campaign.finances !== null &&
    typeof campaign.options === 'object' &&
    campaign.options !== null &&
    typeof campaign.createdAt === 'string' &&
    typeof campaign.updatedAt === 'string'
  );
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates default campaign options with sensible defaults.
 *
 * @returns Default ICampaignOptions
 *
 * @example
 * const options = createDefaultCampaignOptions();
 */
export function createDefaultCampaignOptions(): ICampaignOptions {
  return {
    // Personnel options
    healingRateMultiplier: 1.0,
    salaryMultiplier: 1.0,
    retirementAge: 65,
    healingWaitingPeriod: 1,
    useAdvancedMedical: false,
    maxPatientsPerDoctor: 25,
    xpPerMission: 1,
    xpPerKill: 1,
    trackTimeInService: true,
    useEdge: true,

    // Financial options
    startingFunds: 0,
    maintenanceCostMultiplier: 1.0,
    repairCostMultiplier: 1.0,
    acquisitionCostMultiplier: 1.0,
    payForMaintenance: true,
    payForRepairs: true,
    payForSalaries: true,
    payForAmmunition: true,
    maintenanceCycleDays: 7,
    useLoanSystem: true,

    // Combat options
    useAutoResolve: false,
    autoResolveCasualtyRate: 1.0,
    allowPilotCapture: true,
    useRandomInjuries: true,
    pilotDeathChance: 0.1,
    autoEject: true,
    trackAmmunition: true,
    useQuirks: false,

    // Force options
    maxUnitsPerLance: 4,
    maxLancesPerCompany: 3,
    enforceFormationRules: false,
    allowMixedFormations: true,
    requireForceCommanders: false,
    useCombatTeams: false,

    // General options
    dateFormat: 'yyyy-MM-dd',
    useFactionRules: false,
    techLevel: 1, // Standard
    limitByYear: true,
    allowClanEquipment: false,
    useRandomEvents: false,
  };
}

/**
 * Creates a new mission with default values.
 *
 * @param params - Mission parameters
 * @returns A new IMission instance
 *
 * @example
 * const mission = createMission({
 *   id: 'mission-001',
 *   name: 'Raid on Hesperus II',
 * });
 */
export function createMission(params: {
  id: string;
  name: string;
  status?: MissionStatus;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  employerId?: string;
  targetId?: string;
}): IMission {
  const now = new Date().toISOString();
  return {
    id: params.id,
    name: params.name,
    status: params.status ?? MissionStatus.PENDING,
    description: params.description,
    startDate: params.startDate,
    endDate: params.endDate,
    employerId: params.employerId,
    targetId: params.targetId,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a new campaign with default values.
 *
 * @param name - Campaign name
 * @param factionId - Player's faction ID
 * @param options - Optional partial campaign options (merged with defaults)
 * @returns A new ICampaign instance
 *
 * @example
 * const campaign = createCampaign("Wolf's Dragoons", 'mercenary');
 *
 * @example
 * const campaign = createCampaign("Davion Guards", 'davion', {
 *   startingFunds: 10000000,
 *   salaryMultiplier: 1.5,
 * });
 */
/**
 * Generates a unique ID with timestamp and random component.
 * @param prefix - Prefix for the ID (e.g., 'campaign', 'force')
 * @returns Unique ID string
 */
function generateUniqueId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

export function createCampaign(
  name: string,
  factionId: string,
  options?: Partial<ICampaignOptions>
): ICampaign {
  const now = new Date().toISOString();
  const defaultOptions = createDefaultCampaignOptions();
  const mergedOptions: ICampaignOptions = options
    ? { ...defaultOptions, ...options }
    : defaultOptions;

  // Create root force with unique ID
  const rootForceId = generateUniqueId('force');

  return {
    id: generateUniqueId('campaign'),
    name,
    currentDate: new Date(),
    factionId,
    personnel: new Map(),
    forces: new Map(),
    rootForceId,
    missions: new Map(),
    finances: {
      transactions: [],
      balance: new Money(mergedOptions.startingFunds),
    },
    options: mergedOptions,
    campaignStartDate: new Date(),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a campaign with pre-populated data.
 *
 * Useful for testing or loading saved campaigns.
 *
 * @param params - Full campaign parameters
 * @returns A new ICampaign instance
 *
 * @example
 * const campaign = createCampaignWithData({
 *   id: 'campaign-001',
 *   name: "Wolf's Dragoons",
 *   currentDate: new Date('3025-01-01'),
 *   factionId: 'mercenary',
 *   personnel: personnelMap,
 *   forces: forcesMap,
 *   rootForceId: 'force-root',
 *   missions: missionsMap,
 *   finances: { transactions: [], balance: new Money(1000000) },
 *   options: createDefaultCampaignOptions(),
 * });
 */
export function createCampaignWithData(params: {
  id: string;
  name: string;
  currentDate: Date;
  factionId: string;
  personnel: Map<string, IPerson>;
  forces: Map<string, IForce>;
  rootForceId: string;
  missions: Map<string, IMission>;
  finances: IFinances;
  options: ICampaignOptions;
  campaignStartDate?: Date;
  description?: string;
  iconUrl?: string;
}): ICampaign {
  const now = new Date().toISOString();
  return {
    id: params.id,
    name: params.name,
    currentDate: params.currentDate,
    factionId: params.factionId,
    personnel: params.personnel,
    forces: params.forces,
    rootForceId: params.rootForceId,
    missions: params.missions,
    finances: params.finances,
    options: params.options,
    campaignStartDate: params.campaignStartDate,
    description: params.description,
    iconUrl: params.iconUrl,
    createdAt: now,
    updatedAt: now,
  };
}
