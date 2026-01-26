import { getDayPipeline } from '../dayPipeline';
import { healingProcessor } from './healingProcessor';
import { contractProcessor } from './contractProcessor';
import { dailyCostsProcessor } from './dailyCostsProcessor';

export { healingProcessor } from './healingProcessor';
export { contractProcessor } from './contractProcessor';
export { dailyCostsProcessor } from './dailyCostsProcessor';

let registered = false;

export function registerBuiltinProcessors(): void {
  if (registered) return;

  const pipeline = getDayPipeline();
  pipeline.register(healingProcessor);
  pipeline.register(contractProcessor);
  pipeline.register(dailyCostsProcessor);

  registered = true;
}

export function _resetBuiltinRegistration(): void {
  registered = false;
}
