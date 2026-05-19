import { getDayPipeline } from '../dayPipeline';
import { registerAcquisitionProcessor } from './acquisitionProcessor';
import { autoAwardsProcessor } from './autoAwardsProcessor';
import { contractProcessor } from './contractProcessor';
import { dailyCostsProcessor } from './dailyCostsProcessor';
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
import { repairQueueBuilderProcessor } from './repairQueueBuilderProcessor';
import { salvageProcessor } from './salvageProcessor';
import { scenarioEncounterBridgeProcessor } from './scenarioEncounterBridgeProcessor';
import { scenarioGenerationProcessor } from './scenarioGenerationProcessor';

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
 */
export function registerBuiltinProcessors(): void {
  if (registered) return;

  const pipeline = getDayPipeline();
  pipeline.register(postBattleProcessor);
  pipeline.register(salvageProcessor);
  pipeline.register(repairQueueBuilderProcessor);
  pipeline.register(healingProcessor);
  pipeline.register(contractProcessor);
  pipeline.register(dailyCostsProcessor);
  pipeline.register(autoAwardsProcessor);
  registerAcquisitionProcessor();
  // Per `add-campaign-refit-and-prestige` design D5/D9: the refit
  // processor runs in DayPhase.UNITS (alongside maintenance/repair work);
  // the morale processor runs in DayPhase.EVENTS, after the battle-effects
  // block and daily costs so the day's victory/defeat/pay/desertion
  // signals are settled before morale is evaluated.
  pipeline.register(refitProcessor);
  pipeline.register(moraleProcessor);
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
  pipeline.register(scenarioEncounterBridgeProcessor);
  pipeline.register(inventoryProjectionProcessor);

  registered = true;
}

export function _resetBuiltinRegistration(): void {
  registered = false;
}
