import { INDUSTRIAL_COMPLEX } from '@/constants/scenario/mapPresets';
import {
  isGameSession,
  GamePhase,
  GameStatus,
  GameSide,
  IUnitGameState,
  IGameUnit,
} from '@/types/gameplay';

import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import {
  ScenarioGenerator,
  UNIT_TEMPLATES,
  createDefaultUnitWeights,
  createDefaultTerrainWeights,
} from '../generator';

describe('WeightedTable usage', () => {
  it('should use WeightedTable for unit selection', () => {
    const unitWeights = createDefaultUnitWeights();
    const random = new SeededRandom(12345);

    const selected = unitWeights.select(() => random.next());
    expect(selected).not.toBeNull();
    expect(selected!.name).toBeDefined();
    expect(selected!.tonnage).toBeDefined();
  });

  it('should use WeightedTable for terrain selection', () => {
    const terrainWeights = createDefaultTerrainWeights();
    const random = new SeededRandom(12345);

    const selected = terrainWeights.select(() => random.next());
    expect(selected).not.toBeNull();
    expect(typeof selected).toBe('string');
  });

  it('should produce weighted distribution of unit tonnages', () => {
    const unitWeights = createDefaultUnitWeights();
    const random = new SeededRandom(12345);

    const counts: Record<string, number> = {};
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const selected = unitWeights.select(() => random.next());
      if (selected) {
        counts[selected.name] = (counts[selected.name] || 0) + 1;
      }
    }

    const names = Object.keys(counts);
    expect(names.length).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// Procedural map preset terrain wiring
// @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
// =============================================================================

describe('ScenarioGenerator preset terrain', () => {
  const buildGenerator = (): ScenarioGenerator =>
    new ScenarioGenerator(
      createDefaultUnitWeights(),
      createDefaultTerrainWeights(),
    );

  it('still produces a valid session when a mapPreset is supplied', () => {
    const generator = buildGenerator();
    const config: ISimulationConfig = {
      seed: 4242,
      turnLimit: 20,
      unitCount: { player: 2, opponent: 2 },
      mapRadius: 7,
      mapPreset: INDUSTRIAL_COMPLEX,
    };

    const session = generator.generate(config, new SeededRandom(config.seed));
    expect(isGameSession(session)).toBe(true);
    expect(session.units.length).toBe(4);
  });

  it('consumes the preset: urban preset terrain contains building hexes', () => {
    const generator = buildGenerator();
    const terrain = generator.generatePresetTerrain(8, INDUSTRIAL_COMPLEX, 909);
    const values = Array.from(terrain.values());
    expect(values.length).toBeGreaterThan(0);
    // The industrial preset's building directive must surface building hexes.
    expect(values.some((t) => t === 'building')).toBe(true);
    // ...and pavement auto-filled around them.
    expect(values.some((t) => t === 'pavement')).toBe(true);
  });

  it('preset terrain generation is deterministic for the same seed', () => {
    const generator = buildGenerator();
    const a = generator.generatePresetTerrain(7, INDUSTRIAL_COMPLEX, 555);
    const b = generator.generatePresetTerrain(7, INDUSTRIAL_COMPLEX, 555);
    expect(Array.from(a.entries())).toEqual(Array.from(b.entries()));
  });

  it('keys preset terrain by axial "q,r" coordinates within radius', () => {
    const generator = buildGenerator();
    const radius = 5;
    const terrain = generator.generatePresetTerrain(
      radius,
      INDUSTRIAL_COMPLEX,
      1,
    );
    expect(terrain.has(`${-radius},0`)).toBe(true);
    expect(terrain.has(`0,${radius}`)).toBe(true);
    expect(terrain.has('0,0')).toBe(true);
  });
});

// =============================================================================
// PT-003 — Default turn-limit scales by map radius
// =============================================================================
//
// Per `polish-wave-6.2-gaps` (gap #12, closes PT-003): callers that want a
// sane scenario-default turn limit can call `defaultTurnLimit(mapRadius)`.
// r12 stays at 50 (max-pinned at the static floor); r20 becomes 80; r25
// becomes 100. Callers that pass a fixed `turnLimit` through
// `ISimulationConfig.turnLimit` continue to override unchanged.

describe('defaultTurnLimit', () => {
  // Imported lazily so the helper export is exercised through the public
  // index module (mirrors how callers reach it).
  const { defaultTurnLimit } = require('../generator');

  it('returns 50 for r12 (floor pinned)', () => {
    expect(defaultTurnLimit(12)).toBe(50);
  });

  it('returns 80 for r20 (mapRadius * 4)', () => {
    expect(defaultTurnLimit(20)).toBe(80);
  });

  it('returns 100 for r25 (mapRadius * 4)', () => {
    expect(defaultTurnLimit(25)).toBe(100);
  });

  it('stays at the 50-floor for small maps', () => {
    expect(defaultTurnLimit(5)).toBe(50);
    expect(defaultTurnLimit(10)).toBe(50);
  });

  it('respects ScenarioGenerator caller-supplied turnLimit unchanged', () => {
    // A caller that passes turnLimit explicitly is not affected by the
    // default helper — the helper is only consumed at the boundary where
    // a caller has no opinion.
    const generator = new ScenarioGenerator(
      createDefaultUnitWeights(),
      createDefaultTerrainWeights(),
    );
    const explicit: ISimulationConfig = {
      seed: 999,
      turnLimit: 7,
      unitCount: { player: 1, opponent: 1 },
      mapRadius: 20,
    };
    const session = generator.generate(
      explicit,
      new SeededRandom(explicit.seed),
    );
    expect(session.config.turnLimit).toBe(7);
  });
});
