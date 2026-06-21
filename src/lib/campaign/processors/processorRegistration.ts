import { getDayPipeline } from '../dayPipeline';
import { registerAcquisitionProcessor } from './acquisitionProcessor';
import { autoAwardsProcessor } from './autoAwardsProcessor';
import { contractProcessor } from './contractProcessor';
import { dailyCostsProcessor } from './dailyCostsProcessor';
import { factionStandingProcessor } from './factionStandingProcessor';
import { financialProcessor } from './financialProcessor';
import { healingProcessor } from './healingProcessor';
import { inventoryProjectionProcessor } from './inventoryProjectionProcessor';
import {
  contractMarketProcessor,
  personnelMarketProcessor,
  unitMarketProcessor,
} from './marketProcessors';
import { moraleProcessor } from './moraleProcessor';
import { postBattleProcessor } from './postBattleProcessor';
import { randomEventsProcessor } from './randomEventsProcessor';
import { refitProcessor } from './refitProcessor';
import { repairProgressProcessor } from './repairProgressProcessor';
import { repairQueueBuilderProcessor } from './repairQueueBuilderProcessor';
import { salvageProcessor } from './salvageProcessor';
import { scenarioEncounterBridgeProcessor } from './scenarioEncounterBridgeProcessor';
import { scenarioGenerationProcessor } from './scenarioGenerationProcessor';
import { turnoverProcessor } from './turnoverProcessor';
import { vocationalTrainingProcessor } from './vocationalTrainingProcessor';

let registered = false;

/**
 * Register every built-in day processor with the pipeline registry.
 *
 * The pipeline executes processors sorted by `phase` (ascending), so
 * registration order here is purely cosmetic — the canonical execution
 * order is determined by each processor's `phase` value. The Wave 5
 * round-trip spec
 * (`wire-encounter-to-campaign-round-trip/specs/game-session-management/spec.md`,
 * "Day Advancement Applies Pending Outcomes") requires:
 *
 *   1. postBattleProcessor       (phase = MISSIONS - 50 = 350)
 *   2. salvageProcessor          (phase = MISSIONS - 25 = 375)
 *   3. repairQueueBuilderProcessor (phase = MISSIONS - 10 = 390) [Wave 5]
 *   4. contractProcessor         (phase = MISSIONS = 400)
 *   5. healingProcessor          (phase = PERSONNEL = 100, runs earlier
 *      because it doesn't depend on combat outcomes — pre-Wave-5 order
 *      preserved)
 *   6. dailyCostsProcessor       (phase = FINANCES = 700)
 *   7. randomEventsProcessor / market processors (phase = EVENTS = 800)
 *
 * Repair-queue-builder was previously slotted at DayPhase.UNITS (= 500),
 * which violated the spec's ordering invariant (it must run before
 * contracts). Wave 5 promotes it into the battle-effects block via
 * `MISSIONS - 10`.
 *
 * Per audit finding D-2 (2026-06-09) this registry also wires the four
 * processors that were shipped but never registered in production:
 * turnover (PERSONNEL = 100, after healing/auto-awards), financial
 * (FINANCES = 700, role-based counterpart to dailyCosts), vocational
 * training (EVENTS = 800, independent roster bookkeeping), and faction
 * standing (EVENTS = 800, last EVENTS step per MekHQ's end-of-day
 * `performFactionStandingChecks`).
 */
export function registerBuiltinProcessors(): void {
  if (registered) return;

  const pipeline = getDayPipeline();
  pipeline.register(postBattleProcessor);
  pipeline.register(salvageProcessor);
  pipeline.register(repairQueueBuilderProcessor);
  pipeline.register(repairProgressProcessor);
  pipeline.register(healingProcessor);
  pipeline.register(contractProcessor);
  pipeline.register(dailyCostsProcessor);
  // Per audit finding D-2 (2026-06-09): the role-based financial
  // processor (phase FINANCES, same as dailyCosts) was shipped and
  // unit-tested but never registered here. The two finance processors
  // are mutually exclusive via `options.useRoleBasedSalaries` —
  // dailyCosts no-ops when the flag is true, financial no-ops when it
  // is false — so registering both never double-charges. This mirrors
  // MekHQ's `finances.newDay` running after personnel/markets/units.
  pipeline.register(financialProcessor);
  pipeline.register(autoAwardsProcessor);
  // Per audit finding D-2: turnover (phase PERSONNEL) registers after
  // healing and auto-awards so departures are evaluated against the
  // day's settled personnel state — MekHQ runs retirement/turnover
  // bookkeeping inside personnel processing after per-person medical
  // work, and turnover payouts must debit the balance before the
  // FINANCES phase settles the day's books.
  pipeline.register(turnoverProcessor);
  registerAcquisitionProcessor();
  // Per `add-campaign-refit-and-prestige` design D5/D9: the refit
  // processor runs in DayPhase.UNITS (alongside maintenance/repair work);
  // the morale processor runs in DayPhase.EVENTS, after the battle-effects
  // block and daily costs so the day's victory/defeat/pay/desertion
  // signals are settled before morale is evaluated.
  pipeline.register(refitProcessor);
  pipeline.register(moraleProcessor);
  // Per audit finding D-2: vocational training (phase EVENTS per the
  // module's own contract) registers after morale — it is independent
  // personnel-progression bookkeeping (roster-store timer/XP patches)
  // with no dependency on the day's other EVENTS processors.
  pipeline.register(vocationalTrainingProcessor);
  pipeline.register(randomEventsProcessor);
  pipeline.register(unitMarketProcessor);
  pipeline.register(personnelMarketProcessor);
  pipeline.register(contractMarketProcessor);
  // Per `add-campaign-combat-loop`: scenario generation (phase EVENTS)
  // emits `scenario_generated`; the bridge (phase EVENTS + 10) consumes
  // those events into launchable encounters. Both are registered here
  // so the campaign combat loop is wired by default. The inventory
  // projection (phase CLEANUP) runs last, after the battle-effects block.
  pipeline.register(scenarioGenerationProcessor);
  // Per audit finding D-2: faction standing (phase EVENTS) registers
  // last among EVENTS-phase processors, mirroring MekHQ where
  // `performFactionStandingChecks` is the final processing step of the
  // day (after random events and finances). The bridge (EVENTS + 10)
  // and inventory projection (CLEANUP) still sort after it by phase.
  pipeline.register(factionStandingProcessor);
  pipeline.register(scenarioEncounterBridgeProcessor);
  pipeline.register(inventoryProjectionProcessor);

  registered = true;
}

export function _resetBuiltinRegistration(): void {
  registered = false;
}
