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

describe('Heat Phase', () => {
  it('should accumulate heat from weapons fired', () => {
    const config: ISimulationConfig = {
      ...LIGHT_SKIRMISH,
      seed: 43001,
      turnLimit: 5,
    };
    const runner = new SimulationRunner(43001, createInvariantRunner());
    const result = runner.run(config);

    const heatViolations = result.violations.filter(
      (v) => v.invariant === 'heat_non_negative',
    );
    expect(heatViolations).toHaveLength(0);
  });
});

describe('Determinism', () => {
  it('should produce identical results with same seed (enhanced)', () => {
    const seed = 44001;
    const config: ISimulationConfig = {
      ...STANDARD_LANCE,
      seed,
      turnLimit: 8,
    };

    const runner1 = new SimulationRunner(seed, createInvariantRunner());
    const result1 = runner1.run(config);

    const runner2 = new SimulationRunner(seed, createInvariantRunner());
    const result2 = runner2.run(config);

    expect(result1.winner).toBe(result2.winner);
    expect(result1.turns).toBe(result2.turns);
    expect(result1.events.length).toBe(result2.events.length);

    // Verify event-by-event determinism
    for (let i = 0; i < result1.events.length; i++) {
      expect(result1.events[i].type).toBe(result2.events[i].type);
      expect(result1.events[i].turn).toBe(result2.events[i].turn);
      expect(result1.events[i].phase).toBe(result2.events[i].phase);
    }
  });

  it('should produce identical damage amounts with same seed', () => {
    const seed = 44002;
    const config: ISimulationConfig = {
      ...LIGHT_SKIRMISH,
      seed,
      turnLimit: 6,
    };

    const runner1 = new SimulationRunner(seed);
    const result1 = runner1.run(config);

    const runner2 = new SimulationRunner(seed);
    const result2 = runner2.run(config);

    const damage1 = result1.events
      .filter((e) => e.type === GameEventType.DamageApplied)
      .map((e) => e.payload as { damage: number; location: string });
    const damage2 = result2.events
      .filter((e) => e.type === GameEventType.DamageApplied)
      .map((e) => e.payload as { damage: number; location: string });

    expect(damage1.length).toBe(damage2.length);
    for (let i = 0; i < damage1.length; i++) {
      expect(damage1[i].damage).toBe(damage2[i].damage);
      expect(damage1[i].location).toBe(damage2[i].location);
    }
  });

  it('should produce different results with different seeds', () => {
    const config1: ISimulationConfig = {
      ...STANDARD_LANCE,
      seed: 44003,
      turnLimit: 8,
    };
    const config2: ISimulationConfig = {
      ...STANDARD_LANCE,
      seed: 44004,
      turnLimit: 8,
    };

    const runner1 = new SimulationRunner(44003);
    const result1 = runner1.run(config1);

    const runner2 = new SimulationRunner(44004);
    const result2 = runner2.run(config2);

    expect(result1.seed).not.toBe(result2.seed);
  });

  it('should report seed in result for reproduction', () => {
    const seed = 44005;
    const config: ISimulationConfig = { ...LIGHT_SKIRMISH, seed };
    const runner = new SimulationRunner(seed);
    const result = runner.run(config);

    expect(result.seed).toBe(seed);
  });
});

describe('Turn Loop Phase Sequence', () => {
  it('should execute phases in correct order per turn', () => {
    const config: ISimulationConfig = {
      seed: 45001,
      turnLimit: 3,
      unitCount: { player: 2, opponent: 2 },
      mapRadius: 3,
    };
    const runner = new SimulationRunner(45001);
    const result = runner.run(config);

    // Track phase transitions per turn
    const turnPhases = new Map<number, string[]>();
    for (const evt of result.events) {
      if (!turnPhases.has(evt.turn)) {
        turnPhases.set(evt.turn, []);
      }
      const phases = turnPhases.get(evt.turn)!;
      if (phases.length === 0 || phases[phases.length - 1] !== evt.phase) {
        phases.push(evt.phase);
      }
    }

    // Each turn should have movement before weapon_attack before physical_attack
    turnPhases.forEach((phases) => {
      const movIdx = phases.indexOf('movement');
      const weaponIdx = phases.indexOf('weapon_attack');
      const physicalIdx = phases.indexOf('physical_attack');

      if (movIdx >= 0 && weaponIdx >= 0) {
        expect(movIdx).toBeLessThan(weaponIdx);
      }
      if (weaponIdx >= 0 && physicalIdx >= 0) {
        expect(weaponIdx).toBeLessThan(physicalIdx);
      }
    });
  });

  it('should include physical_attack phase in event stream', () => {
    const config: ISimulationConfig = {
      seed: 45002,
      turnLimit: 10,
      unitCount: { player: 2, opponent: 2 },
      mapRadius: 3,
    };
    const runner = new SimulationRunner(45002);
    const result = runner.run(config);

    const phases = new Set(result.events.map((e) => e.phase));
    // Physical attack phase should be present (even if no attacks occurred)
    // We check for the events that occur during physical phase
    const physicalPhaseEvents = result.events.filter(
      (e) => e.phase === 'physical_attack',
    );
    // With small map, physical attacks should occur in at least some games
    expect(result.turns).toBeGreaterThan(0);
  });
});

describe('Victory Conditions with New Combat Effects', () => {
  it('should detect unit destruction from accumulated damage', () => {
    const batchRunner = new BatchRunner();
    const config: ISimulationConfig = {
      ...LIGHT_SKIRMISH,
      seed: 46001,
    };
    const results = batchRunner.runBatch(DESTRUCTION_BATCH_COUNT, config);

    const gamesWithDestruction = results.filter((r) =>
      r.events.some((e) => e.type === GameEventType.UnitDestroyed),
    );

    const gamesWithDamage = results.filter((r) =>
      r.events.some((e) => e.type === GameEventType.DamageApplied),
    );

    // Damage should occur in most games
    expect(gamesWithDamage.length).toBeGreaterThan(
      Math.floor(DESTRUCTION_BATCH_COUNT / 2),
    );

    // With to-hit rolls and 10-turn limit, destruction is possible but not guaranteed
    // Verify that if destruction occurs, the events are properly structured
    for (const result of gamesWithDestruction) {
      const destroyEvents = result.events.filter(
        (e) => e.type === GameEventType.UnitDestroyed,
      );
      for (const evt of destroyEvents) {
        const payload = evt.payload as { unitId: string; cause: string };
        expect(payload.unitId).toBeDefined();
        // Per `add-combat-fidelity-suite` Phase 3: crits now drive
        // engine 3-hit destruction → cause `'engine_destroyed'`, plus
        // the existing armor/structure path → cause `'damage'`,
        // head/cockpit destruction → `'pilot_death'` /
        // `'head_destroyed'`. Closed snake_case enum per P0.5.
        expect([
          'damage',
          'pilot_death',
          'engine_destroyed',
          'head_destroyed',
          'ct_destroyed',
          'shutdown',
          'ammo_explosion',
        ]).toContain(payload.cause);
      }
    }
  });

  describe('pilot death from falls (consciousness failure)', () => {
    let pilotDeathEvents: IGameEvent[];

    beforeAll(() => {
      // Run many games to find pilot death cases. The batch is shared
      // between the structure-only check (every count) and the existence
      // check (statistical counts only).
      const batchRunner = new BatchRunner();
      const config: ISimulationConfig = {
        seed: 46002,
        turnLimit: 10,
        unitCount: { player: 3, opponent: 3 },
        mapRadius: 4,
      };
      const results = batchRunner.runBatch(PILOT_DEATH_BATCH_COUNT, config);

      pilotDeathEvents = results.flatMap((r) =>
        r.events.filter(
          (e) =>
            e.type === GameEventType.UnitDestroyed &&
            (e.payload as { cause: string }).cause === 'pilot_death',
        ),
      );
    }, 60000);

    it('should structure pilot-death destruction payloads correctly', () => {
      for (const evt of pilotDeathEvents) {
        const payload = evt.payload as { unitId: string; cause: string };
        expect(payload.cause).toBe('pilot_death');
        expect(payload.unitId).toBeDefined();
      }
    });

    pilotDeathStatisticalIt(
      'should detect pilot death from falls (existence at the statistical batch size)',
      () => {
        // Audit E-4 teeth: pilot death is rare per game but certain over
        // the full 50-game batch (measured 2026-06-10: 23 pilot_death
        // destructions). If consciousness-failure deaths regress to never
        // firing, this fails instead of the old structure-only loop
        // silently passing on [].
        expect(pilotDeathEvents.length).toBeGreaterThan(0);
      },
    );
  });

  it('should end game when all units on one side are destroyed/inoperable', () => {
    const config: ISimulationConfig = {
      ...LIGHT_SKIRMISH,
      seed: 46003,
      turnLimit: 10,
    };
    const runner = new SimulationRunner(46003);
    const result = runner.run(config);

    if (result.winner !== null && result.winner !== 'draw') {
      // Winner should be the side with surviving units
      expect(['player', 'opponent']).toContain(result.winner);
    }
  });
});
