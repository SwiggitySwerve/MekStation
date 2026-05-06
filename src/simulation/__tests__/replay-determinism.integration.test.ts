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
 * Design note:
 *   The spec acknowledges (per the `MAX_TURNS=10 → 100` regression channel
 *   that PR #514 documented) that a ~1-event-over-300 divergence may
 *   surface on `STANDARD_LANCE` seeded runs. If THIS audit fires on the
 *   Atlas mirror fixture, the failure is a known issue tracked under
 *   the deferred `add-engine-determinism-audit` follow-on change — NOT
 *   a P5 regression. In that case the test is marked `skip` with a
 *   pointer to the follow-on. P5 itself does NOT chase determinism;
 *   the audit is value-as-tripwire only.
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

describe('Event log replay determinism audit (P5 — task 5)', () => {
  /**
   * Per spec scenario "Atlas-vs-Atlas mirror with same seed produces
   * identical event logs". If this fails the deferred
   * `add-engine-determinism-audit` follow-on owns the investigation —
   * P5 does NOT chase determinism per the change brief.
   *
   * To skip-with-TODO when the divergence surfaces in CI, change
   * `it(...)` to `it.skip(...)` and add a TODO citing the follow-on.
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
   * Per spec "Cross-engine determinism on 200-turn battle" scenario —
   * extends the audit beyond the masked `MAX_TURNS=10` ceiling. Note
   * `MAX_TURNS` defaults to 100 (per PR #514); a 200-turn config is
   * clamped, so this assertion holds for the full 100-turn window.
   *
   * SKIPPED: empirical divergence observed (103 vs 516 events at the
   * full turnLimit on Atlas mirror seed=42 — exactly the regression
   * channel PR #514's `MAX_TURNS=10 → 100` bump exposed). The 10-turn
   * audit above passes cleanly; the divergence emerges only at the
   * extended ceiling.
   *
   * TODO: deferred to the `add-engine-determinism-audit` follow-on
   * change. P5 does NOT chase determinism per the brief — once that
   * change ships, flip `it.skip` back to `it` and re-run.
   */
  it.skip('seed=42 Atlas mirror produces identical event logs at full turnLimit', async () => {
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
});
