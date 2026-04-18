import { getDayPipeline } from "../dayPipeline";
import { registerAcquisitionProcessor } from "./acquisitionProcessor";
import { autoAwardsProcessor } from "./autoAwardsProcessor";
import { contractProcessor } from "./contractProcessor";
import { dailyCostsProcessor } from "./dailyCostsProcessor";
import { healingProcessor } from "./healingProcessor";
import {
  contractMarketProcessor,
  personnelMarketProcessor,
  unitMarketProcessor,
} from "./marketProcessors";
import { postBattleProcessor } from "./postBattleProcessor";
import { randomEventsProcessor } from "./randomEventsProcessor";
import { repairQueueBuilderProcessor } from "./repairQueueBuilderProcessor";
import { salvageProcessor } from "./salvageProcessor";

let registered = false;

export function registerBuiltinProcessors(): void {
  if (registered) return;

  const pipeline = getDayPipeline();
  // Post-battle runs FIRST so that healing sees fresh wounds and
  // contractProcessor sees flipped mission statuses. Wave 3 slots
  // salvage AFTER post-battle (consuming its outcome data) and BEFORE
  // contractProcessor (so contracts see salvage-derived state when
  // computing final payments). Repair (Sub-Branch 3b) will follow
  // salvage in a subsequent registration order.
  pipeline.register(postBattleProcessor);
  pipeline.register(salvageProcessor);
  pipeline.register(healingProcessor);
  pipeline.register(contractProcessor);
  pipeline.register(dailyCostsProcessor);
  pipeline.register(autoAwardsProcessor);
  registerAcquisitionProcessor();
  pipeline.register(randomEventsProcessor);
  pipeline.register(unitMarketProcessor);
  pipeline.register(personnelMarketProcessor);
  pipeline.register(contractMarketProcessor);
  // Repair queue builder runs in DayPhase.UNITS — appended; final
  // ordering relative to Wave 2 (post-battle) and Sub-Branch 3a
  // (salvage) is owned by Wave 5.
  pipeline.register(repairQueueBuilderProcessor);

  registered = true;
}

export function _resetBuiltinRegistration(): void {
  registered = false;
}
