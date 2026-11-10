/**
 * Contract Morale Day Processor: the monthly enemy-morale check (AtB).
 *
 * On the 1st of the month, for every ACTIVE contract, roll the pinned MekHQ
 * morale check and write the new level to `contract.moraleLevel`.
 *
 * Pin: MekHQ e7adc2c.
 *  - `CampaignNewDayManager.java:1264-1271`: on the 1st of the month,
 *    `MHQMorale.checkMorale` for each of `campaign.getActiveContracts()`.
 *  - `CampaignNewDayManager.java:475-477`: that method, `processNewDayATB`, runs
 *    only when `campaignOptions.isUseStratCon()`. MekStation's analogue is the
 *    `useAtBScenarios` option (the only consumer of the level is scenario
 *    generation, gated the same way).
 *  - The check itself is `MHQMorale.performMoraleCheck` / `getMoraleOutcome`
 *    (`MHQMorale.java:167-189, 263-299`), ported in `scenario/contractMorale.ts`.
 *
 * Choices that are MekStation's own:
 *  - The 2d6 roll comes from the campaign's seeded stream, one stream per
 *    contract (`createDailyRandom`), so a replayed day rolls identically and
 *    one contract's roll never depends on another's. Never `Math.random`.
 *  - Reliability is 0: MekStation has no faction-trait catalog and no
 *    per-contract enemy skill (`targetId` is a bare id). OPEN limitation.
 *  - Performance counts the applied outcomes recorded for the contract
 *    (`appliedOn`, the in-game application day). No code writes a scenario's
 *    victory or defeat status, so applied outcomes are the only source.
 *    MekStation cannot represent decisive, Pyrrhic, refused-engagement or
 *    fleet-in-being results, so only plain victories and defeats count.
 *  - Contracts without an `atbContractType` are checked too: the pin iterates
 *    every active contract, and scenario generation does the same.
 *
 * NOT here: the ROUTED lifecycle (early end, payout, rout end date, re-spike,
 * enemy swap, prisoners; `MHQMorale.java:646-675, 684-743`). Reaching ROUTED sets
 * only the level.
 *
 * Runs after post-battle (so today's battle counts) and the expiry pass (so a
 * contract that ends today is not checked), and before scenario generation (so
 * the new level is the one that day's scenarios see).
 *
 * @spec openspec/changes/add-contract-morale-monthly-check/specs/mission-contracts/spec.md
 * @module lib/campaign/processors/contractMoraleProcessor
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IContract } from '@/types/campaign/Mission';
import type { IAppliedCombatOutcome } from '@/types/combat/CombatOutcome';

import { selectActiveContracts } from '@/stores/campaign/campaignCommandSelectors';
import { AtBMoraleLevel } from '@/types/campaign/scenario/scenarioTypes';

import {
  DayPhase,
  type IDayEvent,
  type IDayProcessor,
  type IDayProcessorResult,
} from '../dayPipeline';
import {
  DEFAULT_MORALE_MODIFIERS,
  performMoraleCheck,
  type IMoraleScenario,
} from '../scenario/contractMorale';
import { createDailyRandom } from '../utils/campaignRng';

/** The local calendar day as `YYYY-MM-DD` (the campaign date keeps its local time of day). */
function localDay(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** This contract's applied outcomes, as the scenarios the pin's performance modifier counts. */
function scenariosFor(
  campaign: ICampaign,
  contract: IContract,
): readonly IMoraleScenario[] {
  const applied = (campaign.recentlyAppliedOutcomes ??
    []) as readonly IAppliedCombatOutcome[];
  const scenarios: IMoraleScenario[] = [];
  for (const outcome of applied) {
    if (outcome.contractId !== contract.id || !outcome.appliedOn) continue;
    const winner = outcome.report.winner;
    scenarios.push({
      date: localDay(new Date(outcome.appliedOn)),
      status: {
        decisiveDefeat: false,
        refusedEngagement: false,
        decisiveVictory: false,
        pyrrhicVictory: false,
        fleetInBeing: false,
        overallVictory: winner === 'player',
        overallDefeat: winner === 'opponent',
      },
    });
  }
  return scenarios;
}

export const contractMoraleProcessor: IDayProcessor = {
  id: 'contract-morale',
  phase: DayPhase.MISSIONS + 10,
  displayName: 'Contract Morale (AtB, monthly)',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    if (date.getDate() !== 1 || !campaign.options?.useAtBScenarios) {
      return { events: [], campaign };
    }

    const events: IDayEvent[] = [];
    let missions = campaign.missions;

    for (const contract of selectActiveContracts(campaign)) {
      const random = createDailyRandom(
        campaign,
        date,
        `contract-morale:${contract.id}`,
      );
      const roll =
        Math.floor(random() * 6) + 1 + (Math.floor(random() * 6) + 1);
      const from = contract.moraleLevel ?? AtBMoraleLevel.STALEMATE;
      const result = performMoraleCheck({
        level: from,
        today: localDay(date),
        roll,
        reliability: 0,
        scenarios: scenariosFor(campaign, contract),
        modifiers: DEFAULT_MORALE_MODIFIERS,
      });
      if (result.level === from) continue;

      const updated: IContract = { ...contract, moraleLevel: result.level };
      missions = new Map(missions).set(contract.id, updated);
      events.push({
        type: 'contract_morale_changed',
        description: `Contract "${contract.name}": enemy morale ${from} to ${result.level}`,
        severity: 'info',
        data: { contractId: contract.id, from, to: result.level, roll },
      });
    }

    return missions === campaign.missions
      ? { events, campaign }
      : { events, campaign: { ...campaign, missions } };
  },
};
