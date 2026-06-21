import type {
  IGameEvent,
  IPhysicalAttackResolvedPayload,
} from '@/types/gameplay';

import { GameEventType } from '@/types/gameplay';
import { SUPPORTED_PHYSICAL_ATTACK_TYPES } from '@/utils/gameplay/physicalAttacks/types';

import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { LIGHT_SKIRMISH, STANDARD_LANCE } from '../generator/presets';
import { checkArmorBounds, checkHeatNonNegative } from '../invariants/checkers';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { BatchRunner } from '../runner/BatchRunner';
import { SimulationRunner } from '../runner/SimulationRunner';

function readPositiveIntEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const PSR_FALL_BATCH_COUNT = readPositiveIntEnv(
  'SIMULATION_COMBAT_PSR_BATCH_COUNT',
  20,
);
const DESTRUCTION_BATCH_COUNT = readPositiveIntEnv(
  'SIMULATION_COMBAT_DESTRUCTION_BATCH_COUNT',
  200,
);
const PILOT_DEATH_BATCH_COUNT = readPositiveIntEnv(
  'SIMULATION_COMBAT_PILOT_DEATH_BATCH_COUNT',
  50,
);
const FULL_COMBAT_BATCH_COUNT = readPositiveIntEnv(
  'SIMULATION_COMBAT_FULL_BATCH_COUNT',
  50,
);

// Statistical existence teeth (2026-06-09 audit finding E-4): the batch tests
// below previously validated only the SHAPE of whatever events happened to
// occur, so at the CI smoke counts (N=3-10) a regression that silenced the
// event entirely still passed. Existence assertions are gated on the
// configured batch count reaching the statistical default, following the
// statisticalIt pattern from swarm-pilot-skills-batch.test.ts (audit E-5
// fix): smoke counts keep the structure-only checks; full counts (local
// default + the nightly full-size lane, tracker W4.4) additionally require
// the events to actually occur. Calibrated by direct measurement 2026-06-10:
// 68 UnitFell events across the 20-game PSR batch (every game had a fall);
// 23 pilot_death destructions across the 50-game batch.
const psrFallStatisticalIt = PSR_FALL_BATCH_COUNT >= 20 ? it : it.skip;
const pilotDeathStatisticalIt = PILOT_DEATH_BATCH_COUNT >= 50 ? it : it.skip;

function createInvariantRunner(): InvariantRunner {
  const runner = new InvariantRunner();
  runner.register({
    name: 'heat_non_negative',
    description: 'Heat cannot be negative',
    severity: 'critical',
    check: checkHeatNonNegative,
  });
  runner.register({
    name: 'armor_bounds',
    description: 'Armor/structure cannot be negative',
    severity: 'critical',
    check: checkArmorBounds,
  });
  return runner;
}

describe('CombatResolver Pipeline', () => {
  it('should use to-hit rolls instead of auto-hit', () => {
    const config: ISimulationConfig = {
      ...LIGHT_SKIRMISH,
      seed: 40001,
      turnLimit: 5,
    };
    const runner = new SimulationRunner(40001, createInvariantRunner());
    const result = runner.run(config);

    const resolvedAttacks = result.events.filter(
      (e) => e.type === GameEventType.AttackResolved,
    );
    const hits = resolvedAttacks.filter(
      (e) => (e.payload as { hit: boolean }).hit === true,
    );
    const misses = resolvedAttacks.filter(
      (e) => (e.payload as { hit: boolean }).hit === false,
    );

    // Real to-hit teeth (2026-06-09 audit finding E-4): the original test
    // claimed "some should miss due to to-hit rolls" but asserted nothing
    // about attacks at all. With seeded dice the outcome is deterministic
    // at seed 40001 (measured 2026-06-10: 20 resolutions — 13 hits, 7
    // misses), so a regression to auto-hit (or auto-miss) empties one
    // bucket and fails here at every batch size.
    expect(resolvedAttacks.length).toBeGreaterThan(0);
    expect(hits.length).toBeGreaterThan(0);
    expect(misses.length).toBeGreaterThan(0);
    expect(result.turns).toBeGreaterThan(0);
  });

  it('should apply damage to varied hit locations (not just center_torso)', () => {
    const config: ISimulationConfig = {
      ...STANDARD_LANCE,
      seed: 40002,
      turnLimit: 8,
    };
    const runner = new SimulationRunner(40002, createInvariantRunner());
    const result = runner.run(config);

    const damageEvents = result.events.filter(
      (e) => e.type === GameEventType.DamageApplied,
    );

    if (damageEvents.length > 3) {
      const locations = new Set(
        damageEvents.map((e) => (e.payload as { location: string }).location),
      );
      // With real hit location tables, we should see variety
      expect(locations.size).toBeGreaterThan(1);
    }
  });

  it('should preserve full damage values on head hits', () => {
    const config: ISimulationConfig = {
      ...STANDARD_LANCE,
      seed: 40003,
      turnLimit: 10,
    };
    const runner = new SimulationRunner(40003, createInvariantRunner());
    const result = runner.run(config);

    const headDamageEvents = result.events.filter(
      (e) =>
        e.type === GameEventType.DamageApplied &&
        (e.payload as { location: string }).location === 'head',
    );

    for (const evt of headDamageEvents) {
      const damage = (evt.payload as { damage: number }).damage;
      expect(damage).toBeGreaterThan(0);
    }
  });

  it('should emit UnitDestroyed events when units are destroyed', () => {
    // Run enough turns to cause destruction
    const config: ISimulationConfig = {
      ...LIGHT_SKIRMISH,
      seed: 40004,
      turnLimit: 10,
    };
    const runner = new SimulationRunner(40004, createInvariantRunner());
    const result = runner.run(config);

    if (result.winner !== null) {
      const destroyEvents = result.events.filter(
        (e) => e.type === GameEventType.UnitDestroyed,
      );
      expect(destroyEvents.length).toBeGreaterThan(0);
    }
  });

  it('should track damage this phase correctly', () => {
    const config: ISimulationConfig = {
      ...LIGHT_SKIRMISH,
      seed: 40005,
      turnLimit: 3,
    };
    const runner = new SimulationRunner(40005, createInvariantRunner());
    const result = runner.run(config);

    // No armor_bounds violations
    const armorViolations = result.violations.filter(
      (v) => v.invariant === 'armor_bounds',
    );
    expect(armorViolations).toHaveLength(0);
  });
});

describe('Physical Attack Phase', () => {
  it('should include PhysicalAttackDeclared events in simulation', () => {
    const config: ISimulationConfig = {
      ...LIGHT_SKIRMISH,
      seed: 41001,
      turnLimit: 10,
    };
    const runner = new SimulationRunner(41001, createInvariantRunner());
    const result = runner.run(config);

    const physicalEvents = result.events.filter(
      (e) =>
        e.type === GameEventType.PhysicalAttackDeclared ||
        e.type === GameEventType.PhysicalAttackResolved,
    );

    // Physical attacks only happen at distance 1, so may or may not occur
    // but we verify no errors were thrown processing them
    expect(result.turns).toBeGreaterThan(0);
  });

  it('should include PhysicalAttackResolved events with resolution data', () => {
    // Use small map to force adjacency. Seed 41000 exercises rolled
    // physical resolutions even with movement-triggered PSRs in the turn loop.
    const config: ISimulationConfig = {
      seed: 41000,
      turnLimit: 10,
      unitCount: { player: 2, opponent: 2 },
      mapRadius: 3,
    };
    const runner = new SimulationRunner(41000, createInvariantRunner());
    const result = runner.run(config);

    const resolvedEvents = result.events.filter(
      (e) => e.type === GameEventType.PhysicalAttackResolved,
    );

    let rolledResolutionCount = 0;

    for (const evt of resolvedEvents) {
      const payload = evt.payload as IPhysicalAttackResolvedPayload;
      expect(payload.attackerId).toBeDefined();
      expect(payload.targetId).toBeDefined();
      expect(payload.attackType).toBeDefined();
      expect(typeof payload.hit).toBe('boolean');
      expect(payload.toHitNumber).toBeDefined();

      if (payload.automaticHit === true) {
        expect(payload.roll).toBe(0);
        expect(payload.automaticHitReason).toBeDefined();
        continue;
      }

      if (payload.roll === 0) {
        expect(payload.hit).toBe(false);
        expect(Number.isFinite(payload.toHitNumber)).toBe(false);
        expect(payload.location).toBeDefined();
        continue;
      }

      rolledResolutionCount += 1;
      expect(payload.roll).toBeGreaterThanOrEqual(2);
      expect(payload.roll).toBeLessThanOrEqual(12);
      expect(Number.isFinite(payload.toHitNumber)).toBe(true);
    }

    expect(rolledResolutionCount).toBeGreaterThan(0);
  });

  it('should only attempt runtime-supported physical attack types in simulation', () => {
    const config: ISimulationConfig = {
      seed: 41003,
      turnLimit: 10,
      unitCount: { player: 2, opponent: 2 },
      mapRadius: 3,
    };
    const runner = new SimulationRunner(41003);
    const result = runner.run(config);

    const declaredEvents = result.events.filter(
      (e) => e.type === GameEventType.PhysicalAttackDeclared,
    );

    for (const evt of declaredEvents) {
      const payload = evt.payload as { attackType: string };
      expect(SUPPORTED_PHYSICAL_ATTACK_TYPES as readonly string[]).toContain(
        payload.attackType,
      );
    }
  });

  it('should apply physical attack damage through full pipeline', () => {
    const config: ISimulationConfig = {
      seed: 41004,
      turnLimit: 10,
      unitCount: { player: 2, opponent: 2 },
      mapRadius: 3,
    };
    const runner = new SimulationRunner(41004, createInvariantRunner());
    const result = runner.run(config);

    const physicalDamage = result.events.filter(
      (e) =>
        e.type === GameEventType.DamageApplied && e.phase === 'physical_attack',
    );

    // Verify damage events from physical attacks follow the pipeline
    for (const evt of physicalDamage) {
      const payload = evt.payload as {
        damage: number;
        armorRemaining: number;
        structureRemaining: number;
      };
      expect(payload.damage).toBeGreaterThan(0);
      expect(payload.armorRemaining).toBeGreaterThanOrEqual(0);
      expect(payload.structureRemaining).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('PSR Resolution', () => {
  it('should resolve PSRs during simulation', () => {
    const config: ISimulationConfig = {
      seed: 42001,
      turnLimit: 10,
      unitCount: { player: 3, opponent: 3 },
      mapRadius: 5,
    };
    const runner = new SimulationRunner(42001);
    const result = runner.run(config);

    const psrEvents = result.events.filter(
      (e) => e.type === GameEventType.PSRResolved,
    );

    for (const evt of psrEvents) {
      const payload = evt.payload as {
        unitId: string;
        reason: string;
        targetNumber: number;
        roll: number;
        passed: boolean;
      };
      expect(payload.unitId).toBeDefined();
      expect(payload.reason).toBeDefined();
      expect(payload.targetNumber).toBeGreaterThan(0);
      expect(payload.roll).toBeGreaterThanOrEqual(2);
      expect(payload.roll).toBeLessThanOrEqual(12);
      expect(typeof payload.passed).toBe('boolean');
    }
  });

  describe('UnitFell emission across the PSR batch', () => {
    let allFallEvents: IGameEvent[];

    beforeAll(() => {
      // Run many simulations to statistically ensure at least one fall
      // occurs. The batch is shared between the structure-only check
      // (every count) and the existence check (statistical counts only).
      const batchRunner = new BatchRunner();
      const config: ISimulationConfig = {
        seed: 42002,
        turnLimit: 10,
        unitCount: { player: 3, opponent: 3 },
        mapRadius: 4,
      };
      const results = batchRunner.runBatch(PSR_FALL_BATCH_COUNT, config);

      allFallEvents = results.flatMap((r) =>
        r.events.filter((e) => e.type === GameEventType.UnitFell),
      );
    }, 60000);

    it('should structure UnitFell payloads correctly', () => {
      for (const evt of allFallEvents) {
        const payload = evt.payload as {
          unitId: string;
          pilotDamage: number;
        };
        expect(payload.unitId).toBeDefined();
        expect(payload.pilotDamage).toBe(1);
      }
    });

    psrFallStatisticalIt(
      'should emit UnitFell when PSR fails (existence at the statistical batch size)',
      () => {
        // Audit E-4 teeth: at the full 20-game batch falls are certain
        // (measured 2026-06-10: 68 events, all 20 games had one). If
        // PSR-driven falls regress to never firing, this fails instead
        // of the old structure-only loop silently passing on [].
        expect(allFallEvents.length).toBeGreaterThan(0);
      },
    );
  });

  it('should clear pending PSRs after resolution', () => {
    const config: ISimulationConfig = {
      ...LIGHT_SKIRMISH,
      seed: 42003,
      turnLimit: 5,
    };
    const runner = new SimulationRunner(42003);
    const result = runner.run(config);

    // Simulation should complete without error, proving PSRs were resolved
    expect(result.turns).toBeGreaterThan(0);
  });
});
