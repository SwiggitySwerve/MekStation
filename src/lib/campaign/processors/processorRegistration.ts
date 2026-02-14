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
import { randomEventsProcessor } from './randomEventsProcessor';

let registered = false;

export function registerBuiltinProcessors(): void {
  if (registered) return;

  const pipeline = getDayPipeline();
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
