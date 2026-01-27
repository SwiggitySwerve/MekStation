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
import type { IFactionStanding } from './factionStanding/IFactionStanding';
import type { IShoppingList } from './acquisition/acquisitionTypes';
import type { ICombatTeam } from './scenario/scenarioTypes';
import {
  IMission,
  IContract,
  isMission as isMissionGuard,
  isContract,
  createMission as createMissionEntity,
  createContract,
} from './Mission';
import type { SalvageRights, CommandRights } from './Mission';
import { MedicalSystem } from '../../lib/campaign/medical/medicalTypes';
import type { IAutoAwardConfig } from './awards/autoAwardTypes';
import { PersonnelMarketStyle } from './markets/marketTypes';
import { CampaignType } from './CampaignType';

// Re-export Mission types for backwards compatibility
export type { IMission, IContract, SalvageRights, CommandRights };
export { isContract, createContract };

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
export type TurnoverFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'never';

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

   /** Medical system to use (STANDARD, ADVANCED, ALTERNATE) */
   readonly medicalSystem: MedicalSystem;

   /** Maximum patients per doctor */
   readonly maxPatientsPerDoctor: number;

   /** Whether doctors use administration skill to increase capacity */
   readonly doctorsUseAdministration: boolean;

   /** XP awarded per mission */
   readonly xpPerMission: number;

   /** XP awarded per kill */
   readonly xpPerKill: number;

   /** Multiplier for skill improvement XP costs (1.0 = normal) */
   readonly xpCostMultiplier: number;

   /** Whether to track time in service */
   readonly trackTimeInService: boolean;

    /** Whether to use edge points */
    readonly useEdge: boolean;

    // =========================================================================
    // XP Progression Options (~14)
    // =========================================================================

    /** XP awarded per scenario participation (default 1) */
    readonly scenarioXP?: number;

    /** XP awarded per kill (default 1) */
    readonly killXPAward?: number;

    /** Number of kills required to earn killXPAward (default 1) */
    readonly killsForXP?: number;

    /** XP awarded per task completion (default 1) */
    readonly taskXP?: number;

    /** Number of tasks required to earn taskXP (default 1) */
    readonly nTasksXP?: number;

    /** XP awarded per successful vocational training check (default 1) */
    readonly vocationalXP?: number;

    /** Target number for vocational training 2d6 roll (default 7) */
    readonly vocationalXPTargetNumber?: number;

    /** Days between vocational training checks (default 30) */
    readonly vocationalXPCheckFrequency?: number;

    /** XP awarded for administrative duties (default 0) */
    readonly adminXP?: number;

    /** Days between admin XP awards (default 7) */
    readonly adminXPPeriod?: number;

    /** XP awarded for mission failure (default 1) */
    readonly missionFailXP?: number;

    /** XP awarded for mission success (default 3) */
    readonly missionSuccessXP?: number;

    /** XP awarded for mission outstanding success (default 5) */
    readonly missionOutstandingXP?: number;

    /** Whether to apply aging effects (attribute decay, trait application) (default true) */
    readonly useAgingEffects?: boolean;

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

    /** Whether to use tax system */
    readonly useTaxes: boolean;

    /** Tax rate as percentage (e.g., 10 = 10%) */
    readonly taxRate: number;

    /** Overhead percentage of salary (e.g., 5 = 5%) */
    readonly overheadPercent: number;

     /** Whether to use role-based salary system (monthly via financialProcessor) */
     readonly useRoleBasedSalaries: boolean;

     /** Whether to pay for secondary role assignments */
     readonly payForSecondaryRole: boolean;

     /** Maximum loan as percentage of total assets (e.g., 50 = 50%) */
     readonly maxLoanPercent: number;

     /** Default annual loan interest rate (e.g., 5 = 5%) */
     readonly defaultLoanRate: number;

     /** Tax payment frequency */
     readonly taxFrequency: 'monthly' | 'quarterly' | 'annually';

     /** Whether to use food and housing costs */
     readonly useFoodAndHousing: boolean;

     /** Price multiplier for clan equipment (e.g., 2.0 = 200%) */
     readonly clanPriceMultiplier: number;

     /** Price multiplier for mixed tech equipment (e.g., 1.5 = 150%) */
     readonly mixedTechPriceMultiplier: number;

     /** Price multiplier for used equipment (e.g., 0.5 = 50%) */
     readonly usedEquipmentMultiplier: number;

     /** Price multiplier for damaged equipment (e.g., 0.33 = 33%) */
     readonly damagedEquipmentMultiplier: number;

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

    /** Whether to use AtB dynamic scenario generation (optional, defaults to false) */
    readonly useAtBScenarios?: boolean;

    /** Difficulty multiplier for OpFor BV calculation (0.5 easy to 2.0 hard, defaults to 1.0) */
    readonly difficultyMultiplier?: number;

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

   // =========================================================================
   // Acquisition Options (~4)
   // =========================================================================

   /** Whether to use the acquisition/procurement system */
   readonly useAcquisitionSystem?: boolean;

   /** Whether to apply planetary availability modifiers */
   readonly usePlanetaryModifiers?: boolean;

   /** Time unit for acquisition transit (day, week, or month) */
   readonly acquisitionTransitUnit?: 'day' | 'week' | 'month';

   /** Whether to apply penalty for Clan parts in IS factions */
   readonly clanPartsPenalty?: boolean;

  /** Whether to limit equipment by year */
  readonly limitByYear: boolean;

  /** Whether to allow Clan equipment for IS factions */
  readonly allowClanEquipment: boolean;

  /** Whether to use random events */
  readonly useRandomEvents: boolean;

  /** Whether to use prisoner random events */
  readonly usePrisonerEvents?: boolean;

  /** Whether to use life random events */
  readonly useLifeEvents?: boolean;

  /** Whether to use contract random events */
  readonly useContractEvents?: boolean;

  /** Whether to simulate Gray Monday historical event */
  readonly simulateGrayMonday?: boolean;

  /** Whether to show day report notifications after advancing */
  readonly enableDayReportNotifications: boolean;

  // =========================================================================
  // Turnover Options (~8)
  // =========================================================================

  readonly useTurnover: boolean;
  readonly turnoverFixedTargetNumber: number;
  readonly turnoverCheckFrequency: TurnoverFrequency;
  readonly turnoverCommanderImmune: boolean;
  readonly turnoverPayoutMultiplier: number;
  readonly turnoverUseSkillModifiers: boolean;
   readonly turnoverUseAgeModifiers: boolean;
   readonly turnoverUseMissionStatusModifiers: boolean;

   // =========================================================================
   // Faction Standing Options (~2)
   // =========================================================================

    /** Whether to track faction standing */
    readonly trackFactionStanding: boolean;

    /** Multiplier for regard changes (1.0 = normal) */
    readonly regardChangeMultiplier: number;

    // =========================================================================
    // Auto-Award Options
    // =========================================================================

    /** Auto-award system configuration (optional, defaults to all enabled) */
    readonly autoAwardConfig?: IAutoAwardConfig;

    // =========================================================================
    // Rank System Options
    // =========================================================================

    /** Code of the active rank system (e.g., 'MERC', 'SLDF', 'CLAN', 'COMSTAR', 'HOUSE') */
    readonly rankSystemCode?: string;

    // =========================================================================
    // Market Options
    // =========================================================================

    /** Unit market generation method ('none' = disabled, 'atb_monthly' = AtB monthly refresh) */
    readonly unitMarketMethod?: 'none' | 'atb_monthly';

    /** Personnel market generation style */
    readonly personnelMarketStyle?: PersonnelMarketStyle;

    /** Contract market generation method */
    readonly contractMarketMethod?: 'none' | 'atb_monthly' | 'cam_ops';
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

    /** Faction standings (regard tracking) */
    readonly factionStandings: Record<string, IFactionStanding>;

    /** Shopping list for acquisition system */
    readonly shoppingList?: IShoppingList;

    /** Combat teams for AtB scenario generation (optional) */
    readonly combatTeams?: readonly ICombatTeam[];

     /** Campaign options */
     readonly options: ICampaignOptions;

  /** Campaign type classification */
  readonly campaignType: CampaignType;

  /** Active preset used at creation (optional, existing campaigns default to CUSTOM) */
  readonly activePreset?: string;

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
 * Delegates to Mission.ts isMission type guard.
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
  return isMissionGuard(value);
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
     typeof options.dateFormat === 'string' &&
     typeof options.doctorsUseAdministration === 'boolean'
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
    typeof campaign.campaignType === 'string' &&
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
      medicalSystem: MedicalSystem.STANDARD,
      maxPatientsPerDoctor: 25,
      doctorsUseAdministration: false,
      xpPerMission: 1,
      xpPerKill: 1,
      xpCostMultiplier: 1.0,
      trackTimeInService: true,
      useEdge: true,

      // XP Progression options
      scenarioXP: 1,
      killXPAward: 1,
      killsForXP: 1,
      taskXP: 1,
      nTasksXP: 1,
      vocationalXP: 1,
      vocationalXPTargetNumber: 7,
      vocationalXPCheckFrequency: 30,
      adminXP: 0,
      adminXPPeriod: 7,
      missionFailXP: 1,
      missionSuccessXP: 3,
      missionOutstandingXP: 5,
      useAgingEffects: true,

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
       useTaxes: true,
       taxRate: 10,
       overheadPercent: 5,
       useRoleBasedSalaries: false,
       payForSecondaryRole: true,
       maxLoanPercent: 50,
       defaultLoanRate: 5,
       taxFrequency: 'annually',
       useFoodAndHousing: true,
       clanPriceMultiplier: 2.0,
       mixedTechPriceMultiplier: 1.5,
       usedEquipmentMultiplier: 0.5,
       damagedEquipmentMultiplier: 0.33,

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
    usePrisonerEvents: true,
    useLifeEvents: true,
    useContractEvents: true,
    simulateGrayMonday: false,
    enableDayReportNotifications: true,

     // Turnover options
     useTurnover: true,
     turnoverFixedTargetNumber: 3,
     turnoverCheckFrequency: 'monthly',
     turnoverCommanderImmune: true,
     turnoverPayoutMultiplier: 12,
     turnoverUseSkillModifiers: true,
     turnoverUseAgeModifiers: true,
     turnoverUseMissionStatusModifiers: true,

      // Faction standing options
      trackFactionStanding: true,
      regardChangeMultiplier: 1.0,

      // Acquisition options
      useAcquisitionSystem: false,
      usePlanetaryModifiers: true,
      acquisitionTransitUnit: 'month',
      clanPartsPenalty: true,

      // Rank system
      rankSystemCode: 'MERC',

      // Market options
      unitMarketMethod: 'none',
      personnelMarketStyle: PersonnelMarketStyle.DISABLED,
      contractMarketMethod: 'atb_monthly',
    };
}

/**
 * Creates a new mission with default values.
 *
 * Delegates to Mission.ts createMission factory.
 * Accepts Date objects for startDate/endDate for backwards compatibility
 * (converts to ISO strings internally).
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
  startDate?: Date | string;
  endDate?: Date | string;
  employerId?: string;
  targetId?: string;
  systemId?: string;
  scenarioIds?: string[];
  briefing?: string;
}): IMission {
  return createMissionEntity({
    id: params.id,
    name: params.name,
    status: params.status,
    description: params.description,
    startDate: params.startDate instanceof Date
      ? params.startDate.toISOString()
      : params.startDate,
    endDate: params.endDate instanceof Date
      ? params.endDate.toISOString()
      : params.endDate,
    systemId: params.systemId,
    scenarioIds: params.scenarioIds,
    briefing: params.briefing,
  });
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
  options?: Partial<ICampaignOptions>,
  campaignType: CampaignType = CampaignType.MERCENARY,
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
      factionStandings: {},
      shoppingList: { items: [] },
      options: mergedOptions,
      campaignType,
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
    factionStandings?: Record<string, IFactionStanding>;
    shoppingList?: IShoppingList;
    options: ICampaignOptions;
    campaignType?: CampaignType;
    activePreset?: string;
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
      factionStandings: params.factionStandings ?? {},
      shoppingList: params.shoppingList,
      options: params.options,
      campaignType: params.campaignType ?? CampaignType.MERCENARY,
      activePreset: params.activePreset,
      campaignStartDate: params.campaignStartDate,
      description: params.description,
      iconUrl: params.iconUrl,
      createdAt: now,
      updatedAt: now,
    };
}
