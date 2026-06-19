import { runLongGameIntegrationTests } from './LongGameDetector.integration-cases';
import { runLongGameMetadataEdgeTests } from './LongGameDetector.metadata-edge-cases';
import { LongGameDetector } from './LongGameDetector.test-helpers';
import { runLongGameThresholdTests } from './LongGameDetector.threshold-cases';

describe('LongGameDetector', () => {
  let detector: LongGameDetector;

  beforeEach(() => {
    detector = new LongGameDetector();
  });

  const context = {
    getDetector: () => detector,
  };

  runLongGameThresholdTests(context);
  runLongGameMetadataEdgeTests(context);
  runLongGameIntegrationTests(context);
});
