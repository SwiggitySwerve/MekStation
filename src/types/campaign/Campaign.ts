/**
 * Campaign Aggregate - Root entity for campaign management
 *
 * Aggregates personnel, forces, missions, and finances into a single
 * campaign entity. References MekStation units via their IDs (does not
 * duplicate unit data).
 *
 * @module campaign/Campaign
 */

import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import type { ICombatOutcome } from '../combat/CombatOutcome';
import type { IShoppingList } from './acquisition/acquisitionTypes';
import type { ICampaignOptions } from './CampaignOptions';
import type { ICoopSession } from './CoopSession';
import type { IFactionStanding } from './factionStanding/IFactionStanding';
import type { SalvageRights, CommandRights } from './Mission';
import type { IPartsInventoryItem } from './PartsInventory';
import type { IMoraleTransition, IUnitPrestige, MoraleState } from './Prestige';
import type { IRefitOrder } from './Refit';
import type { IRepairTicket } from './RepairTicket';
import type { ISalvageAllocation, ISalvageReport } from './Salvage';
import type { ICombatTeam } from './scenario/scenarioTypes';
import type { IUnitCombatState, IUnitMaxState } from './UnitCombatState';

import { CampaignType } from './CampaignType';
import { createDefaultCampaignOptions } from './createDefaultCampaignOptions';
import { MissionStatus } from './enums';
import { IForce, getAllUnits as getForceUnits } from './Force';
import { IFinances } from './IFinances';
import {
  IMission,
  IContract,
  isMission as isMissionGuard,
  isContract,
  createMission as createMissionEntity,
  createContract,
} from './Mission';
import { Money } from './Money';

// Re-export Mission types for backwards compatibility
export type { IMission, IContract, SalvageRights, CommandRights };
export { isContract, createContract };
export type { ICampaignOptions, TurnoverFrequency } from './CampaignOptions';
export { createDefaultCampaignOptions } from './createDefaultCampaignOptions';

// =============================================================================
// Campaign Interface
// =============================================================================

/**
 * Root campaign aggregate entity.
 *
 * The campaign is the top-level entity that owns all other campaign entities:
 * - Forces (Map<string, IForce>)
 * - Missions (Map<string, IMission>)
 * - Finances (IFinances)
 *
 * Personnel state is owned by `useCampaignRosterStore` (the canonical
 * source of truth as of `wire-iperson-hard-cutover` PR4). The legacy
 * `personnel` map was removed in PR4 — every read/write path now goes
 * through the roster store.
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

  /**
   * Canonical post-deploy combat state per unit, keyed by unitId.
   * Populated by createInitialCombatState at first deploy, updated by
   * postBattleProcessor, reset by repair completion. Absent entry means
   * the unit has not yet been deployed (or its combat state was reset
   * post-repair).
   *
   * See openspec/specs/campaign-unit-combat-state/spec.md for the
   * canonical shape contract and idempotency rules.
   */
  readonly unitCombatStates: Readonly<Record<string, IUnitCombatState>>;

  /** Shared warehouse of owned parts from salvage, acquisition, and manual fixes. */
  readonly partsInventory?: readonly IPartsInventoryItem[];

  /** Repair queue generated after combat and drained by the repair-progress processor. */
  readonly repairQueue?: readonly IRepairTicket[];

  /** Full-health reference snapshots used to clamp repair completion. */
  readonly unitMaxStates?: Readonly<Record<string, IUnitMaxState>>;

  /** Salvage allocations awaiting or reflecting player accept/decline decisions. */
  readonly salvageAllocations?: Readonly<Record<string, ISalvageAllocation>>;

  /** UI/report summaries for generated salvage allocations. */
  readonly salvageReports?: Readonly<Record<string, ISalvageReport>>;

  /** Battle outcomes still awaiting campaign application. */
  readonly pendingBattleOutcomes?: readonly ICombatOutcome[];

  /** Battle ids already applied to campaign state. */
  readonly processedBattleIds?: readonly string[];

  /** Applied outcomes retained for current morale/windowed processors. */
  readonly recentlyAppliedOutcomes?: readonly ICombatOutcome[];

  /**
   * Refit orders for owned campaign units (`add-campaign-refit-and-prestige`,
   * design D2). Optional — absent on campaigns created before the change;
   * defaults to an empty list. Refit processors narrow when they read.
   */
  readonly refitOrders?: readonly IRefitOrder[];

  /**
   * Per-unit campaign configuration, keyed by unitId
   * (`add-campaign-refit-and-prestige`, design D5). The refit day
   * processor writes a unit's completed `targetConfiguration` here when a
   * refit finishes — this is the unit's current campaign loadout. Optional
   * and absent on pre-change campaigns.
   */
  readonly unitConfigurations?: Readonly<Record<string, MechBuildConfig>>;

  /**
   * Per-unit prestige scores (`add-campaign-refit-and-prestige`, design D7).
   * Optional — absent on pre-change campaigns; defaults to an empty list.
   */
  readonly unitPrestige?: readonly IUnitPrestige[];

  /**
   * Company morale state (`add-campaign-refit-and-prestige`, design D8).
   * Optional — absent on pre-change campaigns; defaults to
   * `MoraleState.Steady`.
   */
  readonly moraleState?: MoraleState;

  /**
   * Ordered company-morale transition history, oldest first
   * (`add-campaign-refit-and-prestige`, design D9). Optional — defaults to
   * an empty list.
   */
  readonly moraleTransitions?: readonly IMoraleTransition[];

  /**
   * Co-op session metadata (`wire-coop-campaign-route`, Wave 6.1).
   *
   * Absent (the `undefined` case) means single-player — every co-op
   * surface in the campaign page tree SHALL skip render in that case.
   * Present means a shared co-op campaign; `coopSession.mode` decides
   * whether the local user sees host (`HostGmReviewSurface`) or guest
   * (`GuestProposalSurface` overlays) surfaces.
   *
   * See openspec/changes/wire-coop-campaign-route/specs/coop-campaign-sync/spec.md.
   */
  readonly coopSession?: ICoopSession;

  /**
   * Campaign RNG seed (audit D-10, 2026-06-09 remediation W3.4).
   *
   * Stamped once at campaign creation and persisted with the campaign.
   * Daily processors derive their outcome rolls from per-(seed, day,
   * processor) streams via `lib/campaign/utils/campaignRng` so campaign
   * days are replayable. OPTIONAL for backward compatibility — legacy
   * campaigns without the field fall back to an id-derived seed.
   */
  readonly rngSeed?: number;

  /**
   * Current star-system location (`wire-starmap-into-campaign`, Wave 6.4).
   *
   * The player's "you are here" pin on the starmap. The field is OPTIONAL
   * for backward compatibility — a legacy campaign without the field is
   * treated as stationed at `'terra'` by all UI surfaces (the canonical
   * default). Updated EXCLUSIVELY via the `useCampaignStore.travelToSystem`
   * action so the activity-log entry and seed-dataset validation
   * invariants are enforced together.
   *
   * See openspec/changes/wire-starmap-into-campaign/specs/campaign-system/spec.md.
   */
  readonly currentSystemId?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the total number of personnel in the campaign.
 *
 * Personnel state is owned by `useCampaignRosterStore`; callers must pass
 * the live pilot count (typically via
 * `useCampaignRosterStore.getState().pilots.length`). Decoupled from the
 * store here to keep `Campaign.ts` free of the runtime store import.
 *
 * @param _campaign - The campaign (unused; kept for call-site signature continuity)
 * @param pilotsCount - Live pilot count from `useCampaignRosterStore`
 * @returns Total personnel count
 *
 * @example
 * const total = getTotalPersonnel(
 *   campaign,
 *   useCampaignRosterStore.getState().pilots.length,
 * ); // 42
 */
export function getTotalPersonnel(
  _campaign: ICampaign,
  pilotsCount: number,
): number {
  return pilotsCount;
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
 * logger.debug(`Campaign has ${unitIds.length} units`);
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
 * logger.debug(`Balance: ${balance.format()}`);
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
  status: MissionStatus,
): IMission[] {
  return Array.from(campaign.missions.values()).filter(
    (mission) => mission.status === status,
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
  forceId: string,
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
  missionId: string,
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
 *   logger.debug(obj.name);
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
 *   logger.debug(obj.salaryMultiplier);
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
 *   logger.debug(obj.name);
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
    startDate:
      params.startDate instanceof Date
        ? params.startDate.toISOString()
        : params.startDate,
    endDate:
      params.endDate instanceof Date
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
    // Per canonicalize-unit-combat-state PR-A: ICampaign owns the
    // canonical post-deploy combat-state map. Fresh campaigns start
    // empty; createInitialCombatState writes entries on first deploy.
    unitCombatStates: {},
    partsInventory: [],
    // Audit D-10 (2026-06-09, W3.4): the only intentionally random step —
    // every daily outcome roll after creation derives deterministically
    // from this persisted seed (see lib/campaign/utils/campaignRng).
    rngSeed: Math.floor(Math.random() * 0x100000000) >>> 0,
  };
}

/**
 * Creates a campaign with pre-populated data.
 *
 * Useful for testing or loading saved campaigns. Personnel state lives on
 * `useCampaignRosterStore` (see `wire-iperson-hard-cutover` PR4) — seed
 * roster entries on the store directly rather than passing a personnel
 * map here.
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
    // Per canonicalize-unit-combat-state PR-A: ICampaign owns the
    // canonical combat-state map. Loaded campaigns start empty here;
    // callers that hold combat state pass it via the merge layer in
    // useCampaignStore (deserializeCampaign) or as a post-construction
    // spread.
    unitCombatStates: {},
    partsInventory: [],
  };
}
