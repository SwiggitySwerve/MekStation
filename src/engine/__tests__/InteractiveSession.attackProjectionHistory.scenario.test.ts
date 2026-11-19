/**
 * F2 (D-8, AGENTS.md invariant 7): committing an attack stamps the projection's
 * to-hit data onto the AttackDeclared event THIS declaration appended. A
 * declaration the engine rejects appends no AttackDeclared, so the stamp must
 * not land on an earlier declaration by the same attacker at the same target —
 * recorded events never change, and replays must rebuild the exact state.
 *
 * Events are keyed by sequence number (not by uuid) so the check is the same
 * one the replay verifier and the perf engine harness apply.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IHex, IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import {
  GameEventType,
  GameSide,
  MovementType,
  RangeBracket,
  type IAttackDeclaredPayload,
  type IAttackInvalidPayload,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import type { IApplyAttackInput } from '../InteractiveSession.actions.attackTypes';

import { declareInteractiveSessionAttackGroup } from '../InteractiveSession.actions.attack';
import { deriveCommittedAttackProjection } from '../InteractiveSession.actions.attackProjection';

const LASER = {
  id: 'w1',
  name: 'Large Laser',
  damage: 8,
  heat: 8,
  minRange: 0,
  shortRange: 7,
  mediumRange: 14,
  longRange: 21,
} as unknown as IWeapon;

function makeOpenGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -12; q <= 12; q++) {
    for (let r = -12; r <= 12; r++) {
      hexes.set(`${q},${r}`, {
        coord: { q, r },
        occupantId: null,
        terrain: TerrainType.Clear,
        elevation: 0,
      });
    }
  }
  return { config: { radius: 12 }, hexes };
}

function buildUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'a1',
      name: 'Attacker',
      side: GameSide.Player,
      unitRef: 'attacker-mech',
      pilotRef: 'p1',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 't1',
      name: 'Target',
      side: GameSide.Opponent,
      unitRef: 'target-mech',
      pilotRef: 'p2',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

function sessionAtWeaponAttack(): IGameSession {
  let s = createGameSession(
    {
      mapRadius: 12,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnits(),
  );
  s = startGame(s, GameSide.Player);
  s = rollInitiative(s);
  s = advancePhase(s); // Initiative -> Movement
  s = advancePhase(s); // Movement -> WeaponAttack
  return s;
}

/**
 * Fixture-only placement on the live state (the volley and indirect-fire
 * scenario suites use the same shortcut). Attack enrichment re-derives
 * currentState from events, so the placement is re-applied before every
 * declaration.
 */
function placeUnits(
  session: IGameSession,
  targetQ: number,
  targetPatch: Partial<IGameSession['currentState']['units'][string]> = {},
): IGameSession {
  const units = session.currentState.units;
  return {
    ...session,
    currentState: {
      ...session.currentState,
      units: {
        ...units,
        a1: {
          ...units.a1,
          position: { q: 0, r: 0 },
          movementThisTurn: MovementType.Stationary,
        },
        t1: {
          ...units.t1,
          position: { q: targetQ, r: 0 },
          ...targetPatch,
        },
      },
    },
  };
}

function attackInput(session: IGameSession): IApplyAttackInput {
  return {
    session,
    weaponsByUnit: new Map([['a1', [LASER]]]),
    attackerId: 'a1',
    targetId: 't1',
    weaponIds: ['w1'],
    grid: makeOpenGrid(),
    targetHex: session.currentState.units.t1?.position,
  };
}

function canonicalBySequence(
  events: readonly IGameEvent[],
): ReadonlyMap<number, string> {
  return new Map(
    events.map((event) => [event.sequence, JSON.stringify(event)]),
  );
}

function declaredEvents(events: readonly IGameEvent[]): readonly IGameEvent[] {
  return events.filter((event) => event.type === GameEventType.AttackDeclared);
}

describe('attack projection enrichment never rewrites history (F2)', () => {
  it('an accepted declaration is stamped with the committed projection', () => {
    const before = placeUnits(sessionAtWeaponAttack(), 3);
    const input = attackInput(before);
    const projection = deriveCommittedAttackProjection({
      input,
      weaponAttacks: buildWeaponAttacks(['w1'], [LASER], 'a1'),
      targetHex: before.currentState.units.t1.position,
    });
    expect(projection?.attackable).toBe(true);
    expect(projection?.toHitNumber).toBeDefined();

    const after = declareInteractiveSessionAttackGroup(input);
    const declared = declaredEvents(after.events.slice(before.events.length));
    expect(declared).toHaveLength(1);
    const payload = declared[0].payload as IAttackDeclaredPayload;
    expect(payload.toHitNumber).toBe(projection?.toHitNumber);
    expect(payload.range).toBe(RangeBracket.Short);
    // The enrichment stamps a per-weapon rangeBracket that IWeaponAttackData
    // does not declare.
    const weaponAttack = payload.weaponAttacks?.[0] as
      | { readonly rangeBracket?: RangeBracket }
      | undefined;
    expect(weaponAttack?.rangeBracket).toBe(RangeBracket.Short);
    expect(payload.weaponAttacks?.[0]?.toHitNumber).toBe(
      projection?.weaponRangeOptions.find((option) => option.weaponId === 'w1')
        ?.toHitNumber,
    );
  });

  it('a rejected declaration leaves every earlier event byte-identical', () => {
    // An accepted short-range declaration at the target...
    const first = declareInteractiveSessionAttackGroup(
      attackInput(placeUnits(sessionAtWeaponAttack(), 3)),
    );
    const [earlier] = declaredEvents(first.events);
    expect((earlier.payload as IAttackDeclaredPayload).range).toBe(
      RangeBracket.Short,
    );
    const history = canonicalBySequence(first.events);

    // ...then a declaration at the same target from medium range after it
    // retreated (the perf engine harness case, seed 20263561, events #1229
    // and #1447). The committed projection still marks the target
    // attackable, but the engine rejects it as an invalid target and appends
    // no AttackDeclared.
    const retry = placeUnits(first, 10, { hasRetreated: true });
    const retryProjection = deriveCommittedAttackProjection({
      input: attackInput(retry),
      weaponAttacks: buildWeaponAttacks(['w1'], [LASER], 'a1'),
      targetHex: retry.currentState.units.t1.position,
    });
    expect(retryProjection?.attackable).toBe(true);
    expect(retryProjection?.rangeBracket).toBe(RangeBracket.Medium);
    const after = declareInteractiveSessionAttackGroup(attackInput(retry));

    const appended = after.events.slice(first.events.length);
    expect(appended.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect((appended[0].payload as IAttackInvalidPayload).reason).toBe(
      'InvalidTarget',
    );

    const replayed = canonicalBySequence(after.events);
    for (const [sequence, json] of history) {
      expect({ sequence, json: replayed.get(sequence) }).toEqual({
        sequence,
        json,
      });
    }
  });
});
