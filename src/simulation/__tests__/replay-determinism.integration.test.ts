/**
 * Phase 5 of `add-combat-fidelity-suite` — replay determinism audit
 * (`combat-analytics` delta — "Event Log Replay Determinism Audit").
 *
 * Spec contract:
 *   `combat-analytics/spec.md` — "Event Log Replay Determinism Audit"
 *   Scenario: "Atlas-vs-Atlas mirror with same seed produces identical event logs"
 *     - GIVEN two fresh `SimulationRunner` instances each seeded with `42`
 *     - WHEN each runs the same 10-turn Atlas-vs-Atlas scenario
 *     - THEN result1.events.length MUST equal result2.events.length
 *     - AND JSON.stringify(result1.events) MUST equal JSON.stringify(result2.events)
 *
 * History:
 *   These tests were `it.skip`'d after CI observed a divergence (103 vs
 *   516 events on the seed=42 Atlas mirror at the full turn ceiling) and
 *   the investigation was deferred to an `add-engine-determinism-audit`
 *   follow-on. That follow-on is now done: the divergence was three
 *   un-seeded `Math.random` consumers in the engine's damage path — the
 *   physical-attack `resolveDamage` call and the pilot-consciousness roll
 *   it reaches were not threaded with the runner's seeded `D6Roller`. A
 *   failed consciousness roll ends the battle early, producing exactly
 *   the observed event-count divergence. The fix threads the seeded
 *   roller end-to-end; the third test below is a permanent tripwire that
 *   throws if any code on the engine path consumes `Math.random`.
 */

import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { GameSide } from '@/types/gameplay';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import { ISimulationConfig, ISimulationResult } from '../core/types';
import { SimulationRunner } from '../runner/SimulationRunner';
import {
  buildWeaponLookupFromCatalogFiles,
  hydrateAIWeaponsFromFullUnit,
  type IHydratedUnitData,
} from '../runner/UnitHydration';

jest.setTimeout(60_000);

const weaponLookup = buildWeaponLookupFromCatalogFiles(
  WEAPON_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
);

async function buildAtlasMirrorHydration(): Promise<
  ReadonlyMap<string, IHydratedUnitData>
> {
  const service = getNodeCanonicalUnitService();
  const atlas = await service.getById('atlas-as7-d');
  if (!atlas) throw new Error('Atlas catalog miss');

  const aiWeapons = hydrateAIWeaponsFromFullUnit(atlas, weaponLookup);

  const map = new Map<string, IHydratedUnitData>();
  map.set('player-1', {
    runnerUnitId: 'player-1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    fullUnit: atlas,
    aiWeapons,
    gunnery: 4,
    piloting: 5,
  });
  map.set('opponent-1', {
    runnerUnitId: 'opponent-1',
    side: GameSide.Opponent,
    position: { q: 0, r: 0 },
    fullUnit: atlas,
    aiWeapons,
    gunnery: 4,
    piloting: 5,
  });
  return map;
}

/**
 * Build + run a fresh `SimulationRunner` for the canonical Atlas mirror
 * with the supplied seed. Each call constructs a NEW runner instance —
 * deliberate, since reusing the same runner would carry state across runs.
 */
async function runAtlasMirror(seed: number): Promise<ISimulationResult> {
  const hydration = await buildAtlasMirrorHydration();
  const config: ISimulationConfig = {
    seed,
    turnLimit: 10,
    unitCount: { player: 1, opponent: 1 },
    mapRadius: 4,
  };
  const runner = new SimulationRunner(
    seed,
    undefined,
    undefined,
    undefined,
    undefined,
    hydration,
  );
  return runner.run(config);
}

/**
 * Strip the `durationMs` and `timestamp` fields before comparison —
 * those vary by wall-clock and are not part of the deterministic event
 * stream. Everything else (id / sequence / turn / phase / type / payload)
 * is in scope for the byte-identical comparison.
 *
 * Sequence ids that include ISO timestamps (e.g.,
 * `evt-${seq}-${Date.now()}`) would also need to be normalized; the
 * runner's `createGameEvent` helper uses `evt-${gameId}-${seq}` so
 * sequence ordering is deterministic at the seq level and the gameId is
 * derived from the seed (`sim-${config.seed}`) — both stable. We
 * normalize `timestamp` defensively in case the helper changes.
 */
function normalizeEventsForComparison(events: ISimulationResult['events']): {
  events: unknown[];
  length: number;
} {
  return {
    length: events.length,
    events: events.map((e) => ({
      gameId: e.gameId,
      sequence: e.sequence,
      turn: e.turn,
      phase: e.phase,
      type: e.type,
      actorId: e.actorId,
      payload: e.payload,
      // intentionally omitting `id` and `timestamp` — both potentially
      // wall-clock-derived. The other fields plus payload uniquely
      // characterize the event.
    })),
  };
}

// =============================================================================
// Test suite
// =============================================================================

describe('Event log replay determinism audit', () => {
  /**
   * Spec scenario "Atlas-vs-Atlas mirror with same seed produces
   * identical event logs" — the 10-turn window.
   */
  it('seed=42 Atlas mirror produces byte-identical event logs across two runs', async () => {
    const result1 = await runAtlasMirror(42);
    const result2 = await runAtlasMirror(42);

    const norm1 = normalizeEventsForComparison(result1.events);
    const norm2 = normalizeEventsForComparison(result2.events);

    // Length parity check first — easier to debug a length mismatch than
    // a JSON diff at the first differing event.
    expect(norm1.length).toBe(norm2.length);

    // Full byte-identical comparison via JSON.stringify. The runner's
    // event payloads are pure-data objects (no class instances), so
    // JSON.stringify produces a stable canonical form.
    expect(JSON.stringify(norm1.events)).toEqual(JSON.stringify(norm2.events));
  });

  /**
   * Spec "Cross-engine determinism on 200-turn battle" scenario —
   * extends the audit to the full turn ceiling (`MAX_TURNS=100`; a
   * 200-turn config is clamped internally). This is the window where
   * the original 103-vs-516 divergence surfaced before the un-seeded
   * `Math.random` consumers in the damage path were threaded.
   */
  it('seed=42 Atlas mirror produces identical event logs at full turnLimit', async () => {
    const seed = 42;
    const hydration = await buildAtlasMirrorHydration();
    const config: ISimulationConfig = {
      seed,
      turnLimit: 200, // clamped to MAX_TURNS internally
      unitCount: { player: 1, opponent: 1 },
      mapRadius: 4,
    };

    const runA = new SimulationRunner(
      seed,
      undefined,
      undefined,
      undefined,
      undefined,
      hydration,
    ).run(config);
    const runB = new SimulationRunner(
      seed,
      undefined,
      undefined,
      undefined,
      undefined,
      hydration,
    ).run(config);

    const normA = normalizeEventsForComparison(runA.events);
    const normB = normalizeEventsForComparison(runB.events);

    expect(normA.length).toBe(normB.length);
    expect(JSON.stringify(normA.events)).toEqual(JSON.stringify(normB.events));
  });

  /**
   * Determinism proof (not just a same-seed comparison): patch
   * `Math.random` to throw, then run the full battle. The engine MUST
   * draw every random value from its injected `SeededRandom`; any
   * `Math.random` call is an entropy leak that makes two same-seed runs
   * diverge. This is the permanent tripwire for the bug class — it
   * fails loudly the moment a new un-seeded dice consumer is added to
   * the engine path, instead of surfacing as a flaky CI heisenbug.
   *
   * `Math.random` is patched only around `runner.run()` — unit-catalog
   * hydration runs first and is outside the determinism contract.
   */
  it('seed=42 Atlas mirror consumes zero Math.random entropy on the engine path', async () => {
    const hydration = await buildAtlasMirrorHydration();
    const config: ISimulationConfig = {
      seed: 42,
      turnLimit: 200, // clamped to MAX_TURNS internally
      unitCount: { player: 1, opponent: 1 },
      mapRadius: 4,
    };
    const runner = new SimulationRunner(
      42,
      undefined,
      undefined,
      undefined,
      undefined,
      hydration,
    );

    const realRandom = Math.random;
    Math.random = () => {
      throw new Error(
        'engine path consumed Math.random — non-deterministic entropy leak',
      );
    };
    try {
      expect(() => runner.run(config)).not.toThrow();
    } finally {
      Math.random = realRandom;
    }
  });
});
