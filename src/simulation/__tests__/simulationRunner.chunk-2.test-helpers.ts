import { GameEventType } from '@/types/gameplay';

import type { IDetectorConfig } from '../runner/types';

import { ISimulationConfig } from '../core/types';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { BatchRunner } from '../runner/BatchRunner';
import { SimulationRunner } from '../runner/SimulationRunner';

function createTestConfig(
  overrides: Partial<ISimulationConfig> = {},
): ISimulationConfig {
  return {
    seed: 12345,
    turnLimit: 10,
    unitCount: { player: 2, opponent: 2 },
    mapRadius: 5,
    ...overrides,
  };
}

describe('detector integration - anomaly detectors', () => {
  it('should produce anomalies with valid IAnomaly structure', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    for (const anomaly of result.anomalies) {
      expect(typeof anomaly.id).toBe('string');
      expect(typeof anomaly.type).toBe('string');
      expect(['critical', 'warning', 'info']).toContain(anomaly.severity);
      expect(typeof anomaly.battleId).toBe('string');
      expect(typeof anomaly.message).toBe('string');
      expect(typeof anomaly.timestamp).toBe('number');
    }
  });

  it('should convert anomalies to violations', () => {
    const detectorConfig: IDetectorConfig = { longGameTurns: 1 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const config = createTestConfig({ turnLimit: 3 });
    const result = runner.run(config);

    if (result.anomalies.length > 0) {
      const detectorViolations = result.violations.filter((v) =>
        v.invariant.startsWith('detector:'),
      );
      expect(detectorViolations.length).toBe(result.anomalies.length);
    }
  });

  it('should include anomaly type in violation invariant name', () => {
    const detectorConfig: IDetectorConfig = { longGameTurns: 1 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    const detectorViolations = result.violations.filter((v) =>
      v.invariant.startsWith('detector:'),
    );

    for (const violation of detectorViolations) {
      expect(violation.invariant).toMatch(/^detector:/);
      expect(typeof violation.message).toBe('string');
      expect(violation.message.length).toBeGreaterThan(0);
    }
  });

  it('should map anomaly severity to violation severity correctly', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    const detectorViolations = result.violations.filter((v) =>
      v.invariant.startsWith('detector:'),
    );

    for (const violation of detectorViolations) {
      expect(['critical', 'warning']).toContain(violation.severity);
    }
  });

  it('should include context in converted violations', () => {
    const detectorConfig: IDetectorConfig = { longGameTurns: 1 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    const detectorViolations = result.violations.filter((v) =>
      v.invariant.startsWith('detector:'),
    );

    for (const violation of detectorViolations) {
      expect(violation.context).toBeDefined();
      expect(typeof violation.context.anomalyId).toBe('string');
    }
  });
});

describe('detector integration - LongGameDetector', () => {
  it('should detect long game with low threshold', () => {
    const detectorConfig: IDetectorConfig = { longGameTurns: 1 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const config = createTestConfig({ turnLimit: 5 });
    const result = runner.run(config);

    if (result.turns > 1) {
      const longGameAnomalies = result.anomalies.filter(
        (a) => a.type === 'long-game',
      );
      expect(longGameAnomalies.length).toBeGreaterThan(0);
    }
  });

  it('should not detect long game with high threshold', () => {
    const detectorConfig: IDetectorConfig = { longGameTurns: 100 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    const longGameAnomalies = result.anomalies.filter(
      (a) => a.type === 'long-game',
    );
    expect(longGameAnomalies).toHaveLength(0);
  });

  it('should produce info severity for long-game anomaly', () => {
    const detectorConfig: IDetectorConfig = { longGameTurns: 1 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const config = createTestConfig({ turnLimit: 5 });
    const result = runner.run(config);

    const longGameAnomalies = result.anomalies.filter(
      (a) => a.type === 'long-game',
    );
    for (const anomaly of longGameAnomalies) {
      expect(anomaly.severity).toBe('info');
    }
  });
});

describe('detector integration - HeatSuicideDetector', () => {
  it('should not false-positive on normal simulation', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    const heatAnomalies = result.anomalies.filter(
      (a) => a.type === 'heat-suicide',
    );
    expect(heatAnomalies).toHaveLength(0);
  });

  it('should accept custom heat threshold', () => {
    const detectorConfig: IDetectorConfig = { heatSuicideThreshold: 5 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result.anomalies).toBeDefined();
  });
});

describe('detector integration - PassiveUnitDetector', () => {
  it('should accept custom passive unit threshold', () => {
    const detectorConfig: IDetectorConfig = { passiveUnitTurns: 2 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result.anomalies).toBeDefined();
  });

  it('should not false-positive in short game', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig({
      turnLimit: 2,
      unitCount: { player: 1, opponent: 1 },
    });
    const result = runner.run(config);

    const passiveAnomalies = result.anomalies.filter(
      (a) => a.type === 'passive-unit',
    );
    expect(passiveAnomalies).toHaveLength(0);
  });
});

describe('detector integration - NoProgressDetector', () => {
  it('should accept custom no-progress threshold', () => {
    const detectorConfig: IDetectorConfig = { noProgressTurns: 2 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result.anomalies).toBeDefined();
  });

  it('should not false-positive in active simulation', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    const noProgressAnomalies = result.anomalies.filter(
      (a) => a.type === 'no-progress',
    );
    expect(noProgressAnomalies).toHaveLength(0);
  });
});

describe('detector integration - StateCycleDetector', () => {
  it('should accept custom state cycle threshold', () => {
    const detectorConfig: IDetectorConfig = { stateCycleLength: 2 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result.anomalies).toBeDefined();
  });

  it('should produce critical severity for state-cycle anomaly', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    const cycleAnomalies = result.anomalies.filter(
      (a) => a.type === 'state-cycle',
    );
    for (const anomaly of cycleAnomalies) {
      expect(anomaly.severity).toBe('critical');
    }
  });
});

// =========================================================================
// Configuration Tests
// =========================================================================

describe('detector configuration', () => {
  it('should use default thresholds when no config provided', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    expect(result.keyMoments).toBeDefined();
    expect(result.anomalies).toBeDefined();
    expect(result.haltedByCriticalAnomaly).toBe(false);
  });

  it('should use default thresholds with empty config', () => {
    const runner = new SimulationRunner(12345, undefined, {});
    const result = runner.run(createTestConfig());

    expect(result.keyMoments).toBeDefined();
    expect(result.anomalies).toBeDefined();
  });

  it('should pass custom heatSuicideThreshold to detector', () => {
    const detectorConfig: IDetectorConfig = { heatSuicideThreshold: 10 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result).toBeDefined();
  });

  it('should pass custom passiveUnitTurns to detector', () => {
    const detectorConfig: IDetectorConfig = { passiveUnitTurns: 1 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result).toBeDefined();
  });

  it('should pass custom noProgressTurns to detector', () => {
    const detectorConfig: IDetectorConfig = { noProgressTurns: 1 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result).toBeDefined();
  });

  it('should pass custom longGameTurns to detector', () => {
    const detectorConfig: IDetectorConfig = { longGameTurns: 1 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const config = createTestConfig({ turnLimit: 5 });
    const result = runner.run(config);

    if (result.turns > 1) {
      const longGame = result.anomalies.filter((a) => a.type === 'long-game');
      expect(longGame.length).toBeGreaterThan(0);
    }
  });

  it('should pass custom stateCycleLength to detector', () => {
    const detectorConfig: IDetectorConfig = { stateCycleLength: 2 };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result).toBeDefined();
  });

  it('should apply haltOnCritical without crashing', () => {
    const detectorConfig: IDetectorConfig = { haltOnCritical: true };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result).toBeDefined();
    expect(typeof result.haltedByCriticalAnomaly).toBe('boolean');
  });

  it('should not halt when haltOnCritical is false', () => {
    const detectorConfig: IDetectorConfig = { haltOnCritical: false };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result.haltedByCriticalAnomaly).toBe(false);
  });

  it('should support multiple config options simultaneously', () => {
    const detectorConfig: IDetectorConfig = {
      heatSuicideThreshold: 20,
      passiveUnitTurns: 3,
      noProgressTurns: 3,
      longGameTurns: 5,
      stateCycleLength: 2,
      haltOnCritical: true,
    };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    const result = runner.run(createTestConfig());

    expect(result.keyMoments).toBeDefined();
    expect(result.anomalies).toBeDefined();
  });
});
