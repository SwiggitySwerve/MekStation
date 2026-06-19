/**
 * Scenario Generation Day Processor
 *
 * Weekly orchestrator that ties together all scenario generation systems
 * (battle chance, scenario type selection, OpFor BV matching, conditions)
 * into a single day processor that runs on Mondays for active contracts.
 *
 * This processor:
 * 1. Checks if it's Monday (weekly execution)
 * 2. Checks if AtB scenarios are enabled
 * 3. Filters for active contracts (endDate in future or undefined)
 * 4. For each combat team in each active contract:
 *    - Checks for battle occurrence
 *    - If battle: selects scenario type, calculates OpFor BV, generates conditions
 *    - Emits event with scenario details
 *
 * Per audit finding D-9 (2026-06-09, remediation W3.4): production never
 * populates `campaign.combatTeams`, which made generation unreachable.
 * When no explicit teams exist, teams are now DERIVED from the force
 * structure — every STANDARD-type force with assigned units forms one
 * combat team. This mirrors MekHQ `CombatTeam.recalculateCombatTeams`
 * (walks the TO&E creating a team per eligible standard force) and the
 * `CombatTeam` constructor's role default (FRONTLINE when the force
 * carries no explicit combat role — MekStation forces don't, yet).
 * Explicit `campaign.combatTeams` (persisted via the D-1 sweep) takes
 * precedence as the override surface.
 *
 * Per audit finding D-10 (same wave): the production processor draws its
 * rolls from the campaign's seeded daily stream instead of `Math.random`
 * so Monday scenario generation is replayable.
 *
 * @module campaign/processors/scenarioGenerationProcessor
 */

import {
  IDayEvent,
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  isMonday,
} from '@/lib/campaign/dayPipeline';
import {
  BASE_BATTLE_CHANCE,
  checkForBattle,
  type RandomFn,
} from '@/lib/campaign/scenario/battleChance';
import { calculateOpForBV } from '@/lib/campaign/scenario/opForGeneration';
import { generateRandomConditions } from '@/lib/campaign/scenario/scenarioConditions';
import { selectScenarioType } from '@/lib/campaign/scenario/scenarioTypeSelection';
import { createDailyRandom } from '@/lib/campaign/utils/campaignRng';
import { ICampaign } from '@/types/campaign/Campaign';
import { ForceRole } from '@/types/campaign/enums';
import { IContract, isContract } from '@/types/campaign/Mission';
import {
  AtBMoraleLevel,
  CombatRole,
  type ICombatTeam,
  type IScenarioConditions,
} from '@/types/campaign/scenario/scenarioTypes';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all active contracts from the campaign.
 *
 * A contract is active if its endDate is in the future or undefined.
 *
 * @param campaign - The campaign to filter
 * @returns Array of active contracts
 */
function getActiveContracts(campaign: ICampaign): readonly IContract[] {
  const now = campaign.currentDate.getTime();
  const contracts: IContract[] = [];

  Array.from(campaign.missions.values()).forEach((mission) => {
    if (!isContract(mission)) return;

    const contract = mission as IContract;
    if (!contract.endDate) {
      contracts.push(contract);
    } else {
      const endTime = new Date(contract.endDate).getTime();
      if (endTime > now) {
        contracts.push(contract);
      }
    }
  });

  return contracts;
}

/**
 * Derive combat teams from the campaign's force structure (audit D-9).
 *
 * Minimal honest derivation per MekHQ `CombatTeam.recalculateCombatTeams`
 * + `isEligible`: every STANDARD-type force that has units assigned forms
 * one combat team. The role defaults to FRONTLINE (the MekHQ `CombatTeam`
 * constructor's fallback when a force has no explicit combat role —
 * MekStation forces carry no role field yet) with the role's base battle
 * chance. Lance-size/weight eligibility limits are NOT modelled here —
 * they gate on options MekStation doesn't expose yet.
 *
 * @param campaign - The campaign whose force tree is walked
 * @returns One derived team per unit-bearing STANDARD force
 */
function deriveCombatTeamsFromForces(
  campaign: ICampaign,
): readonly ICombatTeam[] {
  const teams: ICombatTeam[] = [];
  // Array.from instead of direct Map-iterator for..of — the tsconfig
  // target predates ES2015 iterator protocols (same pattern as
  // getActiveContracts above).
  for (const force of Array.from(campaign.forces.values())) {
    // Non-combat force types (support, convoy, …) never field teams —
    // mirrors MekHQ isEligible's STANDARD force-type gate.
    if (force.forceType !== ForceRole.STANDARD) continue;
    // A force with no units assigned has nothing to deploy.
    if (force.unitIds.length === 0) continue;
    teams.push({
      forceId: force.id,
      role: CombatRole.FRONTLINE,
      battleChance: BASE_BATTLE_CHANCE[CombatRole.FRONTLINE],
    });
  }
  return teams;
}

/**
 * Get combat teams for a contract.
 *
 * Explicit `campaign.combatTeams` wins when present (the persisted
 * override surface); otherwise teams are derived from the force tree so
 * generation is reachable on real campaigns (audit D-9). All teams apply
 * to every contract for now — per-contract team assignment is a future
 * enhancement.
 *
 * @param campaign - The campaign (contains combat teams / forces)
 * @param contract - The contract to get teams for
 * @returns Array of combat teams for this contract
 */
function getCombatTeamsForContract(
  campaign: ICampaign,
  _contract: IContract,
): readonly ICombatTeam[] {
  const explicit = campaign.combatTeams ?? [];
  if (explicit.length > 0) {
    return explicit;
  }
  return deriveCombatTeamsFromForces(campaign);
}

/**
 * Calculate player BV for a combat team.
 *
 * For now, uses a mock calculation based on battleChance.
 * In a full implementation, this would sum the BV of all units in the team.
 *
 * @param team - The combat team
 * @returns Estimated player BV
 */
function calculatePlayerBV(team: ICombatTeam): number {
  // Mock: use battleChance as a proxy for force strength
  // Real implementation would sum unit BVs from the force
  return team.battleChance * 10;
}

/**
 * Per `wire-encounter-to-campaign-round-trip` Wave 5 §8.1: every
 * generated scenario carries a stable id that downstream consumers
 * (encounter persistence, session launch, post-battle attribution) use
 * to thread linkage all the way back to the contract. The id format is
 * `scn-<contractId>-<dateIso>-<teamId>` — deterministic from inputs so
 * tests don't need to mock random sources.
 */
function buildScenarioId(
  contract: IContract,
  team: ICombatTeam,
  date: Date,
): string {
  const dateKey = date.toISOString().slice(0, 10);
  return `scn-${contract.id}-${dateKey}-${team.forceId}`;
}

/**
 * Create scenario generation event data.
 *
 * @param scenarioType - The selected scenario type
 * @param isAttacker - Whether player is attacker
 * @param opForBV - Opposing force BV
 * @param conditions - Scenario conditions
 * @param contract - The contract this scenario is for
 * @param team - The combat team
 * @param scenarioId - Generated scenario id (Wave 5 §8.1 linkage)
 * @returns Event data object with scenario details
 */
function createScenarioEventData({
  scenarioType,
  isAttacker,
  opForBV,
  conditions,
  contract,
  team,
  scenarioId,
}: {
  readonly scenarioType: string;
  readonly isAttacker: boolean;
  readonly opForBV: number;
  readonly conditions: IScenarioConditions;
  readonly contract: IContract;
  readonly team: ICombatTeam;
  readonly scenarioId: string;
}): Record<string, unknown> {
  return {
    scenarioType,
    isAttacker,
    opForBV,
    conditions,
    teamId: team.forceId,
    contractId: contract.id,
    contractName: contract.name,
    // Wave 5 §8.1: scenario + contract ids travel with every generated
    // event so the encounter created downstream can persist both.
    scenarioId,
  };
}

// =============================================================================
// Shared Core
// =============================================================================

/**
 * Run one day of scenario generation against an injected random stream.
 *
 * Single implementation shared by the production processor (seeded daily
 * stream) and the test factory (injected random) — the two previously
 * duplicated bodies had already started to drift, and the D-9 team
 * derivation must behave identically in both.
 *
 * @param campaign - The campaign being processed
 * @param date - The day being processed
 * @param random - Roll source (seeded in production, injected in tests)
 */
function runScenarioGeneration(
  campaign: ICampaign,
  date: Date,
  random: RandomFn,
): IDayProcessorResult {
  const events: IDayEvent[] = [];

  // Gate 1: Only run on Mondays
  if (!isMonday(date)) {
    return { events, campaign };
  }

  // Gate 2: Only run if AtB scenarios are enabled
  if (!campaign.options?.useAtBScenarios) {
    return { events, campaign };
  }

  // Process each active contract
  const activeContracts = getActiveContracts(campaign);
  for (const contract of activeContracts) {
    // Get combat teams for this contract (explicit or force-derived, D-9)
    const teams = getCombatTeamsForContract(campaign, contract);

    // Check each team for battle
    for (const team of teams) {
      // Check if battle occurs for this team
      if (!checkForBattle(team, contract, random)) {
        continue;
      }

      // Battle occurs! Generate scenario
      const morale = contract.moraleLevel ?? AtBMoraleLevel.STALEMATE;
      const scenarioResult = selectScenarioType(team.role, morale, random);

      // Calculate OpFor BV
      const playerBV = calculatePlayerBV(team);
      const difficulty = campaign.options?.difficultyMultiplier ?? 1.0;
      const opForBV = calculateOpForBV(playerBV, difficulty, random);

      // Generate conditions
      const conditions = generateRandomConditions(random);

      // Wave 5 §8.1: stamp the scenario with a stable id so the
      // resulting encounter / session can record it for round-trip
      // attribution back to the contract.
      const scenarioId = buildScenarioId(contract, team, date);

      const eventData = createScenarioEventData({
        scenarioType: scenarioResult.scenarioType,
        isAttacker: scenarioResult.isAttacker,
        opForBV,
        conditions,
        contract,
        team,
        scenarioId,
      });

      // Emit event
      events.push({
        type: 'scenario_generated',
        description: `Scenario generated for ${contract.name}: ${scenarioResult.scenarioType}`,
        severity: 'info',
        data: eventData,
      });
    }
  }

  return { events, campaign };
}

// =============================================================================
// Processor Implementation
// =============================================================================

/**
 * Scenario Generation Day Processor
 *
 * Implements IDayProcessor interface for weekly scenario generation.
 * Runs only on Mondays when useAtBScenarios option is enabled. Rolls come
 * from the campaign's seeded daily stream (audit D-10).
 */
export const scenarioGenerationProcessor: IDayProcessor = {
  id: 'scenario-generation',
  phase: DayPhase.EVENTS,
  displayName: 'Scenario Generation (AtB)',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    return runScenarioGeneration(
      campaign,
      date,
      createDailyRandom(campaign, date, 'scenario-generation'),
    );
  },
};

/**
 * Create a scenario generation processor with injectable random function.
 *
 * Used for testing with deterministic random values.
 *
 * @param random - Injectable random function
 * @returns A processor with the given random function
 */
export function createScenarioGenerationProcessor(
  random: RandomFn,
): IDayProcessor {
  return {
    id: 'scenario-generation',
    phase: DayPhase.EVENTS,
    displayName: 'Scenario Generation (AtB)',

    process(campaign: ICampaign, date: Date): IDayProcessorResult {
      return runScenarioGeneration(campaign, date, random);
    },
  };
}
