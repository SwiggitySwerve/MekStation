/**
 * Mission and Contract entities for campaign management
 *
 * Missions are containers for scenarios (battles). Contracts extend missions
 * with employer, payment terms, and salvage/command rights.
 *
 * Based on MekHQ Mission.java and Contract.java, simplified for MVP.
 *
 * @module campaign/Mission
 */

import type { AtBContractType } from './contracts/contractTypes';
import type { IScenario } from './Scenario';
import type { AtBMoraleLevel } from './scenario/scenarioTypes';

import { MissionStatus } from './enums/MissionStatus';
import { ScenarioStatus } from './enums/ScenarioStatus';
import { Money } from './Money';
import {
  IPaymentTerms,
  calculateTotalPayout,
  createDefaultPaymentTerms,
} from './PaymentTerms';

// =============================================================================
// Salvage Rights
// =============================================================================

/**
 * Salvage rights determine how battlefield salvage is divided.
 *
 * - None: No salvage rights (employer keeps all)
 * - Exchange: Unit can exchange salvage for cash at a percentage
 * - Integrated: Unit keeps a percentage of salvage directly
 */
export type SalvageRights = 'None' | 'Exchange' | 'Integrated';

// =============================================================================
// Command Rights
// =============================================================================

/**
 * Command rights determine who controls tactical decisions.
 *
 * - Independent: Unit has full tactical autonomy
 * - House: Employer provides strategic direction, unit handles tactics
 * - Integrated: Unit is fully integrated into employer's command structure
 */
export type CommandRights = 'Independent' | 'House' | 'Integrated';

// =============================================================================
// Mission Interface
// =============================================================================

/**
 * Base mission interface.
 *
 * A mission is a container for one or more scenarios (battles).
 * It tracks the overall objective, location, and status.
 *
 * @example
 * const mission: IMission = {
 *   id: 'mission-001',
 *   name: 'Raid on Hesperus II',
 *   status: MissionStatus.ACTIVE,
 *   type: 'mission',
 *   systemId: 'hesperus-ii',
 *   scenarioIds: ['scenario-001', 'scenario-002'],
 *   description: 'Raid enemy supply depot on Hesperus II',
 *   briefing: 'Intelligence reports a lightly defended supply depot...',
 *   startDate: '3025-06-15',
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

  /** Discriminator field: 'mission' or 'contract' */
  readonly type: 'mission' | 'contract';

  /** Planet/system where mission takes place */
  readonly systemId: string;

  /** IDs of scenarios belonging to this mission */
  readonly scenarioIds: readonly string[];

  /** Mission description (optional) */
  readonly description?: string;

  /** Mission briefing text (optional) */
  readonly briefing?: string;

  /** Mission start date as ISO date string (optional, e.g., '3025-06-15') */
  readonly startDate?: string;

  /** Mission end date as ISO date string (optional) */
  readonly endDate?: string;

  /** Creation timestamp (ISO 8601) */
  readonly createdAt: string;

  /** Last update timestamp (ISO 8601) */
  readonly updatedAt: string;
}

// =============================================================================
// Contract Interface
// =============================================================================

/**
 * Contract interface extending Mission with employer and payment details.
 *
 * A contract is a mission with formal terms: who hired you, who you're
 * fighting, how much you get paid, and what rights you have.
 *
 * @example
 * const contract: IContract = {
 *   ...baseMission,
 *   type: 'contract',
 *   employerId: 'davion',
 *   targetId: 'liao',
 *   paymentTerms: createDefaultPaymentTerms(),
 *   salvageRights: 'Integrated',
 *   commandRights: 'Independent',
 * };
 */
export interface IContract extends IMission {
  /** Discriminator: always 'contract' */
  readonly type: 'contract';

  /** Faction ID of the employer (who hired you) */
  readonly employerId: string;

  /** Faction ID of the target (who you're fighting) */
  readonly targetId: string;

  /** Financial terms of the contract */
  readonly paymentTerms: IPaymentTerms;

  /** Salvage rights: None, Exchange, or Integrated */
  readonly salvageRights: SalvageRights;

  /** Command rights: Independent, House, or Integrated */
  readonly commandRights: CommandRights;

  /** AtB morale level for this contract (optional, defaults to STALEMATE) */
  readonly moraleLevel?: AtBMoraleLevel;

  /** AtB contract type (optional) */
  readonly atbContractType?: AtBContractType;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if all scenarios in a mission are complete.
 *
 * A mission is complete when ALL its scenarios have a terminal status
 * (Victory, Defeat, Draw, Cancelled, Mixed).
 * A mission with no scenarios is considered complete.
 *
 * @param mission - The mission to check
 * @param scenarios - Map of all scenarios (for lookup)
 * @returns true if all scenarios are in a terminal state
 *
 * @example
 * const complete = isMissionComplete(mission, scenarioMap);
 */
export function isMissionComplete(
  mission: IMission,
  scenarios: Map<string, IScenario>,
): boolean {
  if (mission.scenarioIds.length === 0) return true;

  const terminalStatuses: ScenarioStatus[] = [
    ScenarioStatus.VICTORY,
    ScenarioStatus.DEFEAT,
    ScenarioStatus.DRAW,
    ScenarioStatus.CANCELLED,
    ScenarioStatus.MIXED,
  ];

  return mission.scenarioIds.every((id) => {
    const scenario = scenarios.get(id);
    if (!scenario) return true; // Missing scenarios treated as complete
    return terminalStatuses.includes(scenario.status);
  });
}

/**
 * Gets the active (non-terminal) scenarios for a mission.
 *
 * @param mission - The mission to query
 * @param scenarios - Map of all scenarios
 * @returns Array of active scenarios
 *
 * @example
 * const active = getActiveScenarios(mission, scenarioMap);
 */
export function getActiveScenarios(
  mission: IMission,
  scenarios: Map<string, IScenario>,
): IScenario[] {
  const terminalStatuses: ScenarioStatus[] = [
    ScenarioStatus.VICTORY,
    ScenarioStatus.DEFEAT,
    ScenarioStatus.DRAW,
    ScenarioStatus.CANCELLED,
    ScenarioStatus.MIXED,
  ];

  return mission.scenarioIds
    .map((id) => scenarios.get(id))
    .filter((s): s is IScenario => s !== undefined)
    .filter((s) => !terminalStatuses.includes(s.status));
}

/**
 * Gets all scenarios for a mission.
 *
 * @param mission - The mission to query
 * @param scenarios - Map of all scenarios
 * @returns Array of scenarios (excludes missing references)
 */
export function getMissionScenarios(
  mission: IMission,
  scenarios: Map<string, IScenario>,
): IScenario[] {
  return mission.scenarioIds
    .map((id) => scenarios.get(id))
    .filter((s): s is IScenario => s !== undefined);
}

/**
 * Calculates the total payout for a contract based on its mission status.
 *
 * Maps MissionStatus to contract outcome:
 * - SUCCESS → 'success'
 * - PARTIAL → 'partial'
 * - Everything else → 'failure'
 *
 * @param contract - The contract to calculate payout for
 * @returns Total payout as Money
 *
 * @example
 * const payout = getTotalPayout(contract);
 */
export function getTotalPayout(contract: IContract): Money {
  let outcome: 'success' | 'partial' | 'failure';

  switch (contract.status) {
    case MissionStatus.SUCCESS:
      outcome = 'success';
      break;
    case MissionStatus.PARTIAL:
      outcome = 'partial';
      break;
    default:
      outcome = 'failure';
      break;
  }

  return calculateTotalPayout(contract.paymentTerms, outcome);
}

/**
 * Checks if a mission has any scenarios.
 *
 * @param mission - The mission to check
 * @returns true if the mission has at least one scenario
 */
export function hasScenarios(mission: IMission): boolean {
  return mission.scenarioIds.length > 0;
}

/**
 * Gets the number of scenarios in a mission.
 *
 * @param mission - The mission to query
 * @returns Number of scenario IDs
 */
export function getScenarioCount(mission: IMission): number {
  return mission.scenarioIds.length;
}

/**
 * Checks if a mission is in a terminal state.
 *
 * Terminal states: SUCCESS, PARTIAL, FAILED, BREACH, CANCELLED, ABORTED
 *
 * @param mission - The mission to check
 * @returns true if the mission is in a terminal state
 */
export function isTerminalStatus(mission: IMission): boolean {
  const terminalStatuses: MissionStatus[] = [
    MissionStatus.SUCCESS,
    MissionStatus.PARTIAL,
    MissionStatus.FAILED,
    MissionStatus.BREACH,
    MissionStatus.CANCELLED,
    MissionStatus.ABORTED,
  ];
  return terminalStatuses.includes(mission.status);
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is an IMission.
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
    (mission.type === 'mission' || mission.type === 'contract') &&
    typeof mission.systemId === 'string' &&
    Array.isArray(mission.scenarioIds) &&
    typeof mission.createdAt === 'string' &&
    typeof mission.updatedAt === 'string'
  );
}

/**
 * Type guard to check if a value is an IContract.
 *
 * @param value - The value to check
 * @returns true if the value is an IContract
 *
 * @example
 * if (isContract(obj)) {
 *   console.log(obj.employerId);
 * }
 */
export function isContract(value: unknown): value is IContract {
  if (!isMission(value)) return false;
  const contract = value as IContract;
  return (
    contract.type === 'contract' &&
    typeof contract.employerId === 'string' &&
    typeof contract.targetId === 'string' &&
    typeof contract.paymentTerms === 'object' &&
    contract.paymentTerms !== null &&
    typeof contract.salvageRights === 'string' &&
    typeof contract.commandRights === 'string'
  );
}

// =============================================================================
// Factory Functions
// =============================================================================

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
 *   systemId: 'hesperus-ii',
 * });
 */
export function createMission(params: {
  id: string;
  name: string;
  systemId?: string;
  status?: MissionStatus;
  scenarioIds?: string[];
  description?: string;
  briefing?: string;
  startDate?: string;
  endDate?: string;
}): IMission {
  const now = new Date().toISOString();
  return {
    id: params.id,
    name: params.name,
    status: params.status ?? MissionStatus.PENDING,
    type: 'mission',
    systemId: params.systemId ?? 'Unknown System',
    scenarioIds: params.scenarioIds ?? [],
    description: params.description,
    briefing: params.briefing,
    startDate: params.startDate,
    endDate: params.endDate,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a new contract with default values.
 *
 * @param params - Contract parameters
 * @returns A new IContract instance
 *
 * @example
 * const contract = createContract({
 *   id: 'contract-001',
 *   name: 'Garrison Duty',
 *   systemId: 'new-avalon',
 *   employerId: 'davion',
 *   targetId: 'liao',
 * });
 */
export function createContract(params: {
  id: string;
  name: string;
  employerId: string;
  targetId: string;
  systemId?: string;
  status?: MissionStatus;
  scenarioIds?: string[];
  description?: string;
  briefing?: string;
  startDate?: string;
  endDate?: string;
  paymentTerms?: IPaymentTerms;
  salvageRights?: SalvageRights;
  commandRights?: CommandRights;
}): IContract {
  const now = new Date().toISOString();
  return {
    id: params.id,
    name: params.name,
    status: params.status ?? MissionStatus.PENDING,
    type: 'contract',
    systemId: params.systemId ?? 'Unknown System',
    scenarioIds: params.scenarioIds ?? [],
    description: params.description,
    briefing: params.briefing,
    startDate: params.startDate,
    endDate: params.endDate,
    employerId: params.employerId,
    targetId: params.targetId,
    paymentTerms: params.paymentTerms ?? createDefaultPaymentTerms(),
    salvageRights: params.salvageRights ?? 'None',
    commandRights: params.commandRights ?? 'House',
    createdAt: now,
    updatedAt: now,
  };
}
