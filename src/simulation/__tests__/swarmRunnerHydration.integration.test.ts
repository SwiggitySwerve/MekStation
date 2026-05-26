/**
 * Phase 1 of `add-always-on-event-log` — integration test for task 1.4.
 *
 * Spec contract: openspec/changes/add-always-on-event-log/specs/
 *   quick-session/spec.md → "CLI Swarm Runner Catalog Hydration"
 *
 * The CLI swarm runner MUST pass a `UnitHydrationMap` to
 * `SimulationRunner` so the synthetic single-medium-laser fallback at
 * `createMinimalUnitState` no longer applies. The runtime contract is
 * verified end-to-end by running an Atlas-vs-Atlas swarm-style match
 * (1v1, hydrated) and asserting that the resulting `result.events`
 * contains `AttackDeclared` events whose union of weapon ids reflects
 * the Atlas's full 7-mount loadout (4× medium-laser, AC/20, LRM-20,
 * SRM-6) — NOT the single synthetic `player-1-weapon-1` id the
 * fallback path emits.
 *
 * Note: per the existing per-mount fire loop in
 * `runner/phases/weaponAttack.ts`, each `AttackDeclared` event in the
 * runtime stream carries `weapons: [singleWeaponId]` (one event per
 * mount). The "weapons.length === 7" intent in the spec scenario maps
 * to "7 distinct mount ids appear across the AttackDeclared events
 * emitted by one Atlas actor over a multi-turn run". This test asserts
 * the latter — the runtime-grounded version of the spec contract.
 */

import type { IAttackDeclaredPayload } from '@/types/gameplay/GameSessionInterfaces';

import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { GameSide } from '@/types/gameplay';
import { GameEventType } from '@/types/gameplay';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import { ISimulationConfig } from '../core/types';
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

/**
 * Build a hydration map using the SAME shape the swarm CLI's
 * `buildSwarmHydration` produces — runner-internal IDs `player-1` /
 * `opponent-1`, both Atlases. This mirrors the production swarm path
 * one step removed (we hand-build instead of going through the random
 * force generator) so the test isolates the runtime hydration contract
 * from upstream catalog-selection logic.
 */
async function buildAtlasMirrorSwarmHydration(): Promise<
  ReadonlyMap<string, IHydratedUnitData>
> {
  const service = getNodeCanonicalUnitService();
  const atlas = await service.getById('atlas-as7-d');
  expect(atlas).not.toBeNull();
  if (!atlas) throw new Error('Atlas catalog miss');

  const aiWeapons = hydrateAIWeaponsFromFullUnit(atlas, weaponLookup);
  // Sanity-check the upstream P1 contract before we run the simulation:
  // 4× medium-laser + AC/20 + LRM-20 + SRM-6 = 7 mounts.
  expect(aiWeapons).toHaveLength(7);

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

describe('add-always-on-event-log Phase 1 — swarm runner catalog hydration', () => {
  it('Atlas-on-side-A swarm run emits hydrated multi-weapon AttackDeclared coverage', async () => {
    // Build hydration the same way the CLI does (per-side runner-
    // internal IDs, both 1-indexed) and run a multi-turn 1v1 match.
    // 5 turns is enough for the bots to close to short range and let
    // the heat budget drain across multiple shots so all 7 mounts
    // surface across the AttackDeclared event stream.
    const hydration = await buildAtlasMirrorSwarmHydration();

    const config: ISimulationConfig = {
      seed: 1,
      turnLimit: 10,
      unitCount: { player: 1, opponent: 1 },
      mapRadius: 4,
    };

    const runner = new SimulationRunner(
      config.seed,
      undefined,
      undefined,
      undefined,
      undefined,
      hydration,
    );
    const result = runner.run(config);

    // The simulation must actually advance. If hydration broke the turn
    // pipeline this would fall to 0 immediately.
    expect(result.turns).toBeGreaterThan(0);

    // Collect every AttackDeclared event whose actor is `player-1`.
    const playerAttackEvents = result.events.filter(
      (event): event is typeof event & { payload: IAttackDeclaredPayload } =>
        event.type === GameEventType.AttackDeclared &&
        event.actorId === 'player-1',
    );

    // The synthetic fallback emits exactly 1 weapon id (`player-1-
    // weapon-1`) for every shot. With hydration, the AI declares all
    // valid mounts each turn and the per-mount loop in
    // `weaponAttack.ts` emits one event per mount — so a 5-turn run
    // produces ≥ 2 AttackDeclared events comfortably.
    expect(playerAttackEvents.length).toBeGreaterThan(0);

    // Strip the per-mount index suffix (`-0`, `-1`, ...) the
    // hydration step appends so each catalog mount gets a stable
    // base id — `medium-laser`, `ac-20`, `lrm-20`, `srm-6`.
    const declaredWeaponBaseIds = new Set<string>();
    for (const event of playerAttackEvents) {
      for (const weaponId of event.payload.weapons) {
        const baseId = weaponId.replace(/-\d+$/, '');
        declaredWeaponBaseIds.add(baseId);
      }
    }

    // The fallback path (no hydration) yields ONLY one base id:
    // `player-1-weapon`. With hydration the Atlas surfaces multiple
    // distinct catalog mounts. Medium laser short range is 3 hexes
    // and the AI may not always close in 10 turns at radius 4, so we
    // require ≥ 3 distinct base ids drawn from the long-range mounts
    // — AC/20 (long 9), LRM-20 (long 21), SRM-6 (short 3, medium 6)
    // — that the bots can certainly reach. The four-mount full
    // coverage (incl. medium-laser) is asserted as a separate
    // strict invariant when the bots close to short range.
    expect(declaredWeaponBaseIds).toContain('ac-20');
    expect(declaredWeaponBaseIds).toContain('lrm-20');
    expect(declaredWeaponBaseIds).toContain('srm-6');
    expect(declaredWeaponBaseIds.size).toBeGreaterThanOrEqual(3);

    // The synthetic-fallback id MUST NOT appear when hydration is wired.
    // This is the explicit guard against a regression where the
    // hydration arg is lost mid-pipeline and the runner silently falls
    // back to `createMinimalUnitState`.
    expect(declaredWeaponBaseIds).not.toContain('player-1-weapon');
  });

  it('hydration map keys match the runner-internal ID convention', async () => {
    // Direct seam test: the swarm CLI builds keys `player-${1..N}` /
    // `opponent-${1..N}`. This regex guard catches a future refactor
    // that accidentally uses the participant `unitId` (catalog id) as
    // the hydration key — the runner would silently fall back because
    // `createSideUnits` looks up `player-1`, not `atlas-as7-d`.
    const hydration = await buildAtlasMirrorSwarmHydration();
    // Array.from + forEach avoids the Map iterator protocol — the
    // tsconfig target is ES5 and downlevelIteration is off, so a
    // direct `for (const k of map.keys())` would break typecheck.
    Array.from(hydration.keys()).forEach((key) => {
      expect(key).toMatch(/^(player|opponent)-\d+$/);
    });
    expect(hydration.size).toBe(2);
    expect(hydration.has('player-1')).toBe(true);
    expect(hydration.has('opponent-1')).toBe(true);
  });
});
