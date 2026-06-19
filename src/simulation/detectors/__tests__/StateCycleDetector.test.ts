import { runStateCycleCycleTests } from './StateCycleDetector.cycle-cases';
import { runStateCycleEdgeTests } from './StateCycleDetector.edge-cases';
import { runStateCycleIntegrationTests } from './StateCycleDetector.integration-cases';
import { runStateCycleMetadataTests } from './StateCycleDetector.metadata-cases';
import { runStateCycleSnapshotTests } from './StateCycleDetector.snapshot-cases';
import { StateCycleDetector } from './StateCycleDetector.test-helpers';

describe('StateCycleDetector', () => {
  let detector: StateCycleDetector;

  beforeEach(() => {
    detector = new StateCycleDetector();
  });

  const context = {
    getDetector: () => detector,
  };

  runStateCycleCycleTests(context);
  runStateCycleMetadataTests(context);
  runStateCycleEdgeTests(context);
  runStateCycleSnapshotTests(context);
  runStateCycleIntegrationTests(context);
});
