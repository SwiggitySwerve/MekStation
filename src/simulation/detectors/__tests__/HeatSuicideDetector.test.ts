import { runHeatSuicideDetectionTests } from './HeatSuicideDetector.detection-cases';
import { runHeatSuicideEdgeTests } from './HeatSuicideDetector.edge-cases';
import { runHeatSuicideMetadataTests } from './HeatSuicideDetector.metadata-cases';
import { HeatSuicideDetector } from './HeatSuicideDetector.test-helpers';

describe('HeatSuicideDetector', () => {
  let detector: HeatSuicideDetector;

  beforeEach(() => {
    detector = new HeatSuicideDetector();
  });

  const context = {
    getDetector: () => detector,
  };

  runHeatSuicideDetectionTests(context);
  runHeatSuicideMetadataTests(context);
  runHeatSuicideEdgeTests(context);
});
