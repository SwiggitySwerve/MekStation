import { getDayPipeline } from '../dayPipeline';
import { registerAcquisitionProcessor } from './acquisitionProcessor';
import { autoAwardsProcessor } from './autoAwardsProcessor';
import { contractProcessor } from './contractProcessor';
import { dailyCostsProcessor } from './dailyCostsProcessor';
import { healingProcessor } from './healingProcessor';
import {
  contractMarketProcessor,
  personnelMarketProcessor,
  unitMarketProcessor,
} from './marketProcessors';
import { postBattleProcessor } from './postBattleProcessor';
import { randomEventsProcessor } from './randomEventsProcessor';
import { repairQueueBuilderProcessor } from './repairQueueBuilderProcessor';
import { salvageProcessor } from './salvageProcessor';

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
  pipeline.register(randomEventsProcessor);
  pipeline.register(unitMarketProcessor);
  pipeline.register(personnelMarketProcessor);
  pipeline.register(contractMarketProcessor);

  registered = true;
}

export function _resetBuiltinRegistration(): void {
  registered = false;
}
