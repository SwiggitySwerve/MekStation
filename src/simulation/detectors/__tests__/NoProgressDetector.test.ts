import { runNoProgressMetadataTests } from './NoProgressDetector.metadata-cases';
import { runNoProgressProgressTests } from './NoProgressDetector.progress-cases';
import { runNoProgressStateTests } from './NoProgressDetector.state-cases';
import { NoProgressDetector } from './NoProgressDetector.test-helpers';

describe('NoProgressDetector', () => {
  let detector: NoProgressDetector;

  beforeEach(() => {
    detector = new NoProgressDetector();
  });

  const context = {
    getDetector: () => detector,
  };

  runNoProgressProgressTests(context);
  runNoProgressStateTests(context);
  runNoProgressMetadataTests(context);
});
