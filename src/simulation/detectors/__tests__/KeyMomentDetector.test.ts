import { runKeyMomentEdgeTests } from './KeyMomentDetector.edge-cases';
import { runKeyMomentIntegrationTests } from './KeyMomentDetector.integration-cases';
import { runKeyMomentPropertiesTests } from './KeyMomentDetector.properties-cases';
import {
  KeyMomentDetector,
  resetSequence,
} from './KeyMomentDetector.test-helpers';
import { runKeyMomentTier1Tests } from './KeyMomentDetector.tier1-cases';
import { runKeyMomentTier2Tests } from './KeyMomentDetector.tier2-cases';
import { runKeyMomentTier3Tests } from './KeyMomentDetector.tier3-cases';

describe('KeyMomentDetector', () => {
  let detector: KeyMomentDetector;

  beforeEach(() => {
    detector = new KeyMomentDetector();
    resetSequence();
  });

  const context = {
    getDetector: () => detector,
  };

  runKeyMomentTier1Tests(context);
  runKeyMomentTier2Tests(context);
  runKeyMomentTier3Tests(context);
  runKeyMomentEdgeTests(context);
  runKeyMomentIntegrationTests(context);
  runKeyMomentPropertiesTests(context);
});
