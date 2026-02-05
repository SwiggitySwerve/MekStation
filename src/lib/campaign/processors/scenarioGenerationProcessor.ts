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
  checkForBattle,
  type RandomFn,
} from '@/lib/campaign/scenario/battleChance';
import { calculateOpForBV } from '@/lib/campaign/scenario/opForGeneration';
import { generateRandomConditions } from '@/lib/campaign/scenario/scenarioConditions';
import { selectScenarioType } from '@/lib/campaign/scenario/scenarioTypeSelection';
import { ICampaign } from '@/types/campaign/Campaign';
import { IContract, isContract } from '@/types/campaign/Mission';
import {
  AtBMoraleLevel,
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
 * Get combat teams for a contract.
 *
 * Returns the combat teams assigned to this contract, or empty array if none.
 *
 * @param campaign - The campaign (contains combat teams)
 * @param contract - The contract to get teams for
 * @returns Array of combat teams for this contract
 */
function getCombatTeamsForContract(
  campaign: ICampaign,
  _contract: IContract,
): readonly ICombatTeam[] {
  // For now, return all combat teams in the campaign
  // In a full implementation, contracts would have their own team assignments
  return campaign.combatTeams ?? [];
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
 * Create scenario generation event data.
 *
 * @param scenarioType - The selected scenario type
 * @param isAttacker - Whether player is attacker
 * @param opForBV - Opposing force BV
 * @param conditions - Scenario conditions
 * @param contract - The contract this scenario is for
 * @param team - The combat team
 * @returns Event data object with scenario details
 */
function createScenarioEventData(
  scenarioType: string,
  isAttacker: boolean,
  opForBV: number,
  conditions: IScenarioConditions,
  contract: IContract,
  team: ICombatTeam,
): Record<string, unknown> {
  return {
    scenarioType,
    isAttacker,
    opForBV,
    conditions,
    teamId: team.forceId,
    contractId: contract.id,
    contractName: contract.name,
  };
}

// =============================================================================
// Processor Implementation
// =============================================================================

/**
 * Scenario Generation Day Processor
 *
 * Implements IDayProcessor interface for weekly scenario generation.
 * Runs only on Mondays when useAtBScenarios option is enabled.
 */
export const scenarioGenerationProcessor: IDayProcessor = {
  id: 'scenario-generation',
  phase: DayPhase.EVENTS,
  displayName: 'Scenario Generation (AtB)',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    const events: IDayEvent[] = [];

    // Gate 1: Only run on Mondays
    if (!isMonday(date)) {
      return { events, campaign };
    }

    // Gate 2: Only run if AtB scenarios are enabled
    if (!campaign.options?.useAtBScenarios) {
      return { events, campaign };
    }

    // Get the random function (injectable for testing)
    const random: RandomFn = () => Math.random();

    // Process each active contract
    const activeContracts = getActiveContracts(campaign);
    for (const contract of activeContracts) {
      // Get combat teams for this contract
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

        const eventData = createScenarioEventData(
          scenarioResult.scenarioType,
          scenarioResult.isAttacker,
          opForBV,
          conditions,
          contract,
          team,
        );

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
        // Get combat teams for this contract
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

          const eventData = createScenarioEventData(
            scenarioResult.scenarioType,
            scenarioResult.isAttacker,
            opForBV,
            conditions,
            contract,
            team,
          );

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
    },
  };
}
