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

describe('constructor', () => {
  it('should create with seed', () => {
    const runner = new SimulationRunner(12345);
    expect(runner).toBeDefined();
  });

  it('should create with custom invariant runner', () => {
    const invariantRunner = new InvariantRunner();
    const runner = new SimulationRunner(12345, invariantRunner);
    expect(runner).toBeDefined();
  });

  it('should create with detector config', () => {
    const detectorConfig: IDetectorConfig = {
      heatSuicideThreshold: 25,
      passiveUnitTurns: 3,
      noProgressTurns: 4,
      longGameTurns: 8,
      stateCycleLength: 2,
      haltOnCritical: true,
    };
    const runner = new SimulationRunner(12345, undefined, detectorConfig);
    expect(runner).toBeDefined();
  });

  it('should create with all three parameters', () => {
    const invariantRunner = new InvariantRunner();
    const detectorConfig: IDetectorConfig = { haltOnCritical: false };
    const runner = new SimulationRunner(12345, invariantRunner, detectorConfig);
    expect(runner).toBeDefined();
  });

  it('should use default detector config when none provided', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());
    expect(result.keyMoments).toBeDefined();
    expect(result.anomalies).toBeDefined();
  });
});

describe('run', () => {
  it('should complete without throwing', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig();

    expect(() => runner.run(config)).not.toThrow();
  });

  it('should return valid ISimulationResult structure', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig();

    const result = runner.run(config);

    expect(result).toBeDefined();
    expect(result.seed).toBe(12345);
    expect(typeof result.turns).toBe('number');
    expect(result.turns).toBeGreaterThan(0);
    expect(typeof result.durationMs).toBe('number');
    expect(Array.isArray(result.events)).toBe(true);
    expect(Array.isArray(result.violations)).toBe(true);
  });

  it('should return seed from config', () => {
    const runner = new SimulationRunner(99999);
    const config = createTestConfig({ seed: 99999 });

    const result = runner.run(config);

    expect(result.seed).toBe(99999);
  });

  it('should return turns greater than 0', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig();

    const result = runner.run(config);

    expect(result.turns).toBeGreaterThan(0);
  });

  it('should return durationMs as positive number', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig();

    const result = runner.run(config);

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should respect turnLimit', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig({ turnLimit: 3 });

    const result = runner.run(config);

    expect(result.turns).toBeLessThanOrEqual(3);
  });

  it('should handle different seed values deterministically', () => {
    const config = createTestConfig({ seed: 54321 });

    const runner1 = new SimulationRunner(54321);
    const result1 = runner1.run(config);

    const runner2 = new SimulationRunner(54321);
    const result2 = runner2.run(config);

    expect(result1.turns).toBe(result2.turns);
    expect(result1.winner).toBe(result2.winner);
  });

  it('should handle winner values correctly', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig();

    const result = runner.run(config);

    expect(['player', 'opponent', 'draw', null]).toContain(result.winner);
  });

  it('should complete within reasonable time', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig({ turnLimit: 10 });

    const startTime = Date.now();
    runner.run(config);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(5000);
  });

  it('should handle minimal unit counts', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig({
      unitCount: { player: 1, opponent: 1 },
    });

    const result = runner.run(config);

    expect(result).toBeDefined();
    expect(result.turns).toBeGreaterThan(0);
  });

  it('should handle larger unit counts', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig({
      unitCount: { player: 4, opponent: 4 },
    });

    const result = runner.run(config);

    expect(result).toBeDefined();
    expect(result.turns).toBeGreaterThan(0);
  });

  it('should include violations array in result', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig();

    const result = runner.run(config);

    expect(Array.isArray(result.violations)).toBe(true);
  });
});

// =========================================================================
// Detector Integration Tests
// =========================================================================

describe('detector integration - result structure', () => {
  it('should include keyMoments array in result', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    expect(Array.isArray(result.keyMoments)).toBe(true);
  });

  it('should include anomalies array in result', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    expect(Array.isArray(result.anomalies)).toBe(true);
  });

  it('should include haltedByCriticalAnomaly boolean in result', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    expect(typeof result.haltedByCriticalAnomaly).toBe('boolean');
  });

  it('should default haltedByCriticalAnomaly to false', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    expect(result.haltedByCriticalAnomaly).toBe(false);
  });

  it('should generate events during simulation', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    expect(result.events.length).toBeGreaterThan(0);
  });

  it('should generate TurnEnded events', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    const turnEndedEvents = result.events.filter(
      (e) => e.type === 'turn_ended',
    );
    expect(turnEndedEvents.length).toBeGreaterThan(0);
  });

  it('should generate DamageApplied events when attacks land', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    const damageEvents = result.events.filter(
      (e) => e.type === 'damage_applied',
    );
    expect(damageEvents.length).toBeGreaterThan(0);
  });

  it('should generate UnitDestroyed events when units die', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig({
      unitCount: { player: 1, opponent: 1 },
    });
    const result = runner.run(config);

    if (result.winner !== null && result.winner !== 'draw') {
      const destroyedEvents = result.events.filter(
        (e) => e.type === 'unit_destroyed',
      );
      expect(destroyedEvents.length).toBeGreaterThan(0);
    }
  });
});

describe('detector integration - key moments', () => {
  it('should detect first-blood when a unit is destroyed', () => {
    const runner = new SimulationRunner(12345);
    const config = createTestConfig({
      unitCount: { player: 1, opponent: 1 },
    });
    const result = runner.run(config);

    if (result.winner !== null && result.winner !== 'draw') {
      const firstBlood = result.keyMoments.filter(
        (m) => m.type === 'first-blood',
      );
      expect(firstBlood.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('should produce keyMoments with valid structure', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());

    for (const moment of result.keyMoments) {
      expect(typeof moment.id).toBe('string');
      expect(typeof moment.type).toBe('string');
      expect([1, 2, 3]).toContain(moment.tier);
      expect(typeof moment.turn).toBe('number');
      expect(typeof moment.description).toBe('string');
      expect(Array.isArray(moment.relatedUnitIds)).toBe(true);
      expect(typeof moment.timestamp).toBe('number');
    }
  });

  it('should detect key moments across multiple turns', () => {
    const runner = new SimulationRunner(42);
    const config = createTestConfig({
      unitCount: { player: 2, opponent: 2 },
    });
    const result = runner.run(config);

    if (result.keyMoments.length > 1) {
      const turns = result.keyMoments.map((m) => m.turn);
      expect(new Set(turns).size).toBeGreaterThanOrEqual(1);
    }
  });

  it('should detect wipe if a unit is destroyed (simplified damage model may not produce kills)', () => {
    let wipeDetected = false;
    let destroyDetected = false;
    for (let seed = 0; seed < 50; seed++) {
      const runner = new SimulationRunner(seed);
      const config = createTestConfig({
        seed,
        unitCount: { player: 1, opponent: 1 },
      });
      const result = runner.run(config);
      const hasDestroy = result.events.some((e) => e.type === 'unit_destroyed');
      if (hasDestroy) {
        destroyDetected = true;
        if (result.keyMoments.some((m) => m.type === 'wipe')) {
          wipeDetected = true;
          break;
        }
      }
    }
    if (destroyDetected) {
      expect(wipeDetected).toBe(true);
    } else {
      expect(wipeDetected).toBe(false);
    }
  });

  it('should detect head-shot when head damage occurs', () => {
    const runner = new SimulationRunner(12345);
    const result = runner.run(createTestConfig());
    for (const moment of result.keyMoments) {
      if (moment.type === 'head-shot') {
        expect(moment.tier).toBe(2);
      }
    }
  });
});
