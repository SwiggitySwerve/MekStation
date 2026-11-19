import { runSwampLaunchContract } from './ReplaySwampLaunch.writer.contract.test-helpers';

it(
  'deep swamp: hosted-off production bootstrap, real movement/attack, writer and reader agree',
  () => runSwampLaunchContract('hosted-off'),
  120_000,
);
