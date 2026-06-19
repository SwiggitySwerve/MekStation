import { runPassiveUnitActivityTests } from './PassiveUnitDetector.activity-cases';
import { runPassiveUnitEdgeTests } from './PassiveUnitDetector.edge-cases';
import { runPassiveUnitMetadataTests } from './PassiveUnitDetector.metadata-cases';
import { PassiveUnitDetector } from './PassiveUnitDetector.test-helpers';

describe('PassiveUnitDetector', () => {
  let detector: PassiveUnitDetector;

  beforeEach(() => {
    detector = new PassiveUnitDetector();
  });

  const context = {
    getDetector: () => detector,
  };

  runPassiveUnitActivityTests(context);
  runPassiveUnitMetadataTests(context);
  runPassiveUnitEdgeTests(context);
});
