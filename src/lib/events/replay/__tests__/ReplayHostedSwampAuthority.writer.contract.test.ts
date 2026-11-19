import { runSwampLaunchContract } from './ReplaySwampLaunch.writer.contract.test-helpers';

it(
  'deep swamp: hosted with journal authority enabled, real movement/attack, live and replayed state agree at every boundary',
  () => runSwampLaunchContract('hosted-enabled'),
  120_000,
);
