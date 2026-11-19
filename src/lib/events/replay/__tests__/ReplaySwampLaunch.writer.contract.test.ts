import { runSwampLaunchContract } from './ReplaySwampLaunch.writer.contract.test-helpers';

it(
  'deep swamp: single-player production bootstrap, real movement/attack, writer and reader agree',
  () => runSwampLaunchContract('single-player'),
  120_000,
);
