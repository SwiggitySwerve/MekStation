import { getDayPipeline } from '../dayPipeline';
import { healingProcessor } from './healingProcessor';
import { contractProcessor } from './contractProcessor';
import { dailyCostsProcessor } from './dailyCostsProcessor';
import { registerAcquisitionProcessor } from './acquisitionProcessor';

export { healingProcessor } from './healingProcessor';
export { contractProcessor } from './contractProcessor';
export { dailyCostsProcessor } from './dailyCostsProcessor';
export { registerAcquisitionProcessor } from './acquisitionProcessor';

let registered = false;

export function registerBuiltinProcessors(): void {
  if (registered) return;

  const pipeline = getDayPipeline();
  pipeline.register(healingProcessor);
  pipeline.register(contractProcessor);
  pipeline.register(dailyCostsProcessor);
  registerAcquisitionProcessor();

  registered = true;
}

export function _resetBuiltinRegistration(): void {
  registered = false;
}
