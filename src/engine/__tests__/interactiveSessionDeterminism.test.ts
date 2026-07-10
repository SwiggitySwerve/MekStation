/**
 * `add-sp-combat-determinism` task 3.1 — fresh-session determinism proof
 * for design D6 (same-seed invariant, no golden traces) and D7 (MaxTech
 * heat-scale coverage extension).
 *
 * D6's contract: two engines built from the SAME seed and IDENTICAL unit
 * inputs, driven through identical `advancePhase` loops to completion,
 * MUST produce deep-equal **normalized** event streams (wall-clock
 * timestamps and generated ids stripped — R3 — everything else,
 * including every roll-bearing payload, stays in scope). A same-seed
 * divergence is the R4 detector firing: some resolver still reaches
 * `Math.random` instead of the injected roller. No golden sequences are
 * asserted anywhere in this file (design D6) — only run-to-run equality.
 *
 * D7's coverage extension: a default-rules-only proof cannot see a leak
 * in code the optional MaxTech heat-scale rule gates off (the
 * `maxTechCriticalLocationRoller` draw only reaches
 * `resolveMaxTechHeatCriticalDamage`'s dice reads when
 * `hasMaxTechHeatScaleRule` is true), so this suite runs the same-seed
 * pair TWICE — once with default rules, once with
 * `optionalRules: ['maxtech-heat-scale']`.
 *
 * Verified-not-inferred finding that shaped the second fixture: the bot
 * AI's own heat-budget management (`AttackAI.applyHeatBudget`,
 * `behaviorVariants.ts`'s `safeHeatThreshold` — 13 default, 18 even for
 * the `aggressive` tier) actively trims a unit's fire list so
 * `currentHeat + movementHeat + firedWeaponHeat` never exceeds the
 * threshold. That self-limiting behavior caps achievable combat heat
 * around ~13–18 under bot-vs-bot play regardless of weapon loadout —
 * nowhere near the MaxTech heat-scale thresholds (pilot-damage avoid
 * roll at heat 32+, `constants/heat.ts`'s
 * `getMaxTechPilotHeatDamageAvoidTN`; critical-location roll at heat
 * 36+, `getMaxTechHeatCriticalDamageAvoidTN`). Reaching those thresholds
 * through weapon fire alone is therefore not just unlikely but
 * structurally blocked by the AI's own logic (which this change's
 * non-goals forbid touching).
 *
 * The heat-variant fixture works around that WITHOUT touching any
 * production/AI code: every hex is tagged `'fire'` terrain
 * (`TerrainType.Fire`, `heatEffect: 5` — see
 * `TerrainProperties.ts`), and both units carry `heatSinks: 0`. Per
 * `gameSessionHeat.sources.ts`'s `collectHeatSourceTotals`,
 * `heatFromEnvironment` is added UNCONDITIONALLY every Heat phase — it
 * is not part of the AI's fire-list heat budget and is not reduced by
 * heat sinks the unit doesn't have — so heat climbs ~5/turn regardless
 * of what the bot chooses to fire, reliably crossing both MaxTech
 * thresholds inside the fixture's turn limit. `TerrainType.Fire`'s
 * other properties (`movementCostModifier` all-zero, no to-hit
 * modifiers, `blocksLOS: false`, `requiresPSR: false`) are otherwise
 * inert, so this is a clean heat-only fixture, not a combat-mechanics
 * change in disguise. A sanity assertion below confirms the heat-crit
 * dice path genuinely fired in this fixture (not vacuous coverage).
 */

import type { IWeapon } from '@/simulation/ai/types';

import {
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  MovementType,
  type IHex,
  type IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import type { IAdaptedUnit } from '../types';

import { GameEngine } from '../GameEngine';
import { createMinimalGrid } from '../GameEngine.helpers';
import { InteractiveSession } from '../InteractiveSession';

const DEFAULT_MAP_RADIUS = 6;
const DEFAULT_TURN_LIMIT = 8;
// 6 phases/turn * TURN_LIMIT, plus generous headroom (matches the ratio
// used by `interactiveSessionRecoveryDeterminism.test.ts`'s
// `CONTINUATION_SAFETY_BOUND`) so a legitimately slow-to-resolve battle
// isn't mistaken for a hung driver.
const DEFAULT_SAFETY_BOUND = 100;

const HEAT_MAP_RADIUS = 6;
const HEAT_TURN_LIMIT = 10;
const HEAT_SAFETY_BOUND = 120;

const DEFAULT_SEED = 704511;
const HEAT_SEED = 552019;
const DIFFERENT_SEED = 991823;

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAdaptedUnit(
  id: string,
  side: GameSide,
  overrides: Partial<IAdaptedUnit> = {},
): IAdaptedUnit {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: -3 } : { q: 0, r: 3 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [makeWeapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    ...overrides,
  };
}

function makeGameUnits(
  overrides: Partial<IGameUnit> = {},
): readonly IGameUnit[] {
  return [
    {
      id: 'player-1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'player-1',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
      ...overrides,
    },
    {
      id: 'opponent-1',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'opponent-1',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
      ...overrides,
    },
  ];
}

/**
 * Every hex tagged `'fire'` terrain (`TerrainType.Fire` — `heatEffect:
 * 5`, otherwise inert: zero movement-cost modifiers, zero to-hit
 * modifiers, `blocksLOS: false`, `requiresPSR: false`). Test-only fixture
 * technique (no production/AI code touched) that gives the
 * maxtech-heat-scale variant a reliable, AI-budget-independent heat
 * source — see the file-level doc comment for why this is necessary.
 */
function createFireGrid(radius: number): IHexGrid {
  const base = createMinimalGrid(radius);
  const hexes = new Map<string, IHex>();
  for (const [key, hex] of Array.from(base.hexes.entries())) {
    hexes.set(key, { ...hex, terrain: 'fire' });
  }
  return { config: base.config, hexes };
}

/**
 * Drive a fresh spectator-mode interactive session (bot AI on both
 * sides) to completion, bounded by `safetyBound` phase-advances so a
 * genuinely hung driver fails loudly instead of timing out the whole
 * suite. Mirrors `interactiveSessionRecoveryDeterminism.test.ts`'s
 * driver.
 */
function driveSpectatorSessionToCompletion(
  session: InteractiveSession,
  safetyBound: number,
): void {
  let iterations = 0;
  while (!session.isGameOver() && iterations < safetyBound) {
    session.runAITurn(GameSide.Player);
    session.runAITurn(GameSide.Opponent);
    session.advancePhase();
    iterations += 1;
  }
  if (iterations >= safetyBound) {
    throw new Error(
      'driveSpectatorSessionToCompletion exceeded its safety bound — the ' +
        'session never reached game-over. Raise the bound only after ' +
        'confirming this is a legitimately slow battle, not a hung driver.',
    );
  }
}

/**
 * Strip the non-deterministic generated-id / wall-clock event fields
 * before comparison (R3): `id` (uuidv4, per-run random), `timestamp`
 * (wall-clock), and `gameId` (uuidv4, `createGameSession` —
 * `gameSessionCore.ts:103` — stamps a fresh random session id on every
 * event unless `options.id` is supplied, which `createInteractiveSession`
 * never does; this fixture drives TWO independently-created sessions per
 * pair, so `gameId` legitimately differs between them even though
 * gameplay content is identical). Every other field — sequence, turn,
 * phase, type, actorId, visibility, side, and every roll-bearing payload
 * — stays in scope, matching R3's "generated-id fields ONLY" scope; this
 * is a peer of the already-stripped event `id`, not a new category.
 * `interactiveSessionRecoveryDeterminism.test.ts` (task 2.3) does not
 * need this extra field because it recovers ONE persisted session twice
 * — same `session.id`/`gameId` both times — so its narrower normalizer
 * was correct for that seam; this fixture's two-independent-sessions
 * shape needs the broader one.
 */
function normalizeEventsForComparison(
  events: readonly IGameEvent[],
): readonly unknown[] {
  return events.map(
    ({ id: _id, timestamp: _timestamp, gameId: _gameId, ...rest }) => rest,
  );
}

/** Count normalized events that are a Heat-phase critical hit — the
 * MaxTech heat-scale location-roller's signature (the only OTHER
 * Heat-phase `CriticalHit` producer is the ammo-explosion path, which
 * this fixture's energy-only, `ammoPerTon: -1` weapons never reach). */
function countHeatCriticalHits(normalizedEvents: readonly unknown[]): number {
  return normalizedEvents.filter(
    (event) =>
      (event as { type?: string; phase?: string }).type ===
        GameEventType.CriticalHit &&
      (event as { type?: string; phase?: string }).phase === GamePhase.Heat,
  ).length;
}

describe('InteractiveSession fresh-session determinism (add-sp-combat-determinism D6/D7, task 3.1)', () => {
  it('same seed, default rules: two fresh spectator sessions produce identical normalized event streams', () => {
    const grid = createMinimalGrid(DEFAULT_MAP_RADIUS);
    const engineA = new GameEngine({
      seed: DEFAULT_SEED,
      mapRadius: DEFAULT_MAP_RADIUS,
      turnLimit: DEFAULT_TURN_LIMIT,
      grid,
    });
    const engineB = new GameEngine({
      seed: DEFAULT_SEED,
      mapRadius: DEFAULT_MAP_RADIUS,
      turnLimit: DEFAULT_TURN_LIMIT,
      grid,
    });

    const sessionA = engineA.createInteractiveSession(
      [makeAdaptedUnit('player-1', GameSide.Player)],
      [makeAdaptedUnit('opponent-1', GameSide.Opponent)],
      makeGameUnits(),
    );
    const sessionB = engineB.createInteractiveSession(
      [makeAdaptedUnit('player-1', GameSide.Player)],
      [makeAdaptedUnit('opponent-1', GameSide.Opponent)],
      makeGameUnits(),
    );

    driveSpectatorSessionToCompletion(sessionA, DEFAULT_SAFETY_BOUND);
    driveSpectatorSessionToCompletion(sessionB, DEFAULT_SAFETY_BOUND);

    expect(sessionA.isGameOver()).toBe(true);
    expect(sessionB.isGameOver()).toBe(true);

    const normA = normalizeEventsForComparison(sessionA.getSession().events);
    const normB = normalizeEventsForComparison(sessionB.getSession().events);

    // No golden values (design D6) — run-to-run equality only.
    expect(normA.length).toBeGreaterThan(0);
    expect(normA).toEqual(normB);
  });

  it('same seed, maxtech-heat-scale rule: two fresh spectator sessions produce identical normalized event streams, including the heat-crit dice path', () => {
    const grid = createFireGrid(HEAT_MAP_RADIUS);
    const heatSinkOverride: Partial<IGameUnit> = { heatSinks: 0 };
    const engineA = new GameEngine({
      seed: HEAT_SEED,
      mapRadius: HEAT_MAP_RADIUS,
      turnLimit: HEAT_TURN_LIMIT,
      grid,
      optionalRules: ['maxtech-heat-scale'],
    });
    const engineB = new GameEngine({
      seed: HEAT_SEED,
      mapRadius: HEAT_MAP_RADIUS,
      turnLimit: HEAT_TURN_LIMIT,
      grid,
      optionalRules: ['maxtech-heat-scale'],
    });

    const sessionA = engineA.createInteractiveSession(
      [makeAdaptedUnit('player-1', GameSide.Player)],
      [makeAdaptedUnit('opponent-1', GameSide.Opponent)],
      makeGameUnits(heatSinkOverride),
    );
    const sessionB = engineB.createInteractiveSession(
      [makeAdaptedUnit('player-1', GameSide.Player)],
      [makeAdaptedUnit('opponent-1', GameSide.Opponent)],
      makeGameUnits(heatSinkOverride),
    );

    driveSpectatorSessionToCompletion(sessionA, HEAT_SAFETY_BOUND);
    driveSpectatorSessionToCompletion(sessionB, HEAT_SAFETY_BOUND);

    expect(sessionA.isGameOver()).toBe(true);
    expect(sessionB.isGameOver()).toBe(true);

    const normA = normalizeEventsForComparison(sessionA.getSession().events);
    const normB = normalizeEventsForComparison(sessionB.getSession().events);

    // No golden values (design D6) — run-to-run equality only.
    expect(normA.length).toBeGreaterThan(0);
    expect(normA).toEqual(normB);

    // Coverage sanity (not vacuous): the fire-terrain fixture must have
    // actually pushed heat past the MaxTech critical-location threshold
    // (36) at least once, or this variant proves nothing beyond the
    // default-rules run. A count of 0 here means the fixture stopped
    // reaching the rule-gated code — tighten the fixture, don't delete
    // the assertion.
    expect(countHeatCriticalHits(normA)).toBeGreaterThan(0);
  });

  it('different seed: produces a valid, completed session (divergence expected, not asserted)', () => {
    const grid = createMinimalGrid(DEFAULT_MAP_RADIUS);
    const engine = new GameEngine({
      seed: DIFFERENT_SEED,
      mapRadius: DEFAULT_MAP_RADIUS,
      turnLimit: DEFAULT_TURN_LIMIT,
      grid,
    });
    const session = engine.createInteractiveSession(
      [makeAdaptedUnit('player-1', GameSide.Player)],
      [makeAdaptedUnit('opponent-1', GameSide.Opponent)],
      makeGameUnits(),
    );

    driveSpectatorSessionToCompletion(session, DEFAULT_SAFETY_BOUND);

    // Validity only (design D6) — a different seed MAY legally collide
    // with the same-seed pair's outcome, so no equality/inequality
    // assertion is made against it here.
    expect(session.isGameOver()).toBe(true);
    expect(session.getSession().events.length).toBeGreaterThan(0);
  });
});
