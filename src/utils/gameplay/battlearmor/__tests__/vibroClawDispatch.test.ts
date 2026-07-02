/**
 * Vibro-claw dispatch tests — declaration legality, resolved-event
 * emission, and standard-pipeline damage application, per
 * `wire-vibroclaw-attack-dispatch` (battle-armor-combat "Vibroclaw
 * Attack": dispatch + non-adjacent rejection scenarios).
 */

import type {
  IGameConfig,
  IGameUnit,
  IVibroClawAttackResolvedPayload,
} from '@/types/gameplay';

import { GameEventType, GameSide } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { createGameSession, startGame } from '../../gameSessionCore';
import { dispatchVibroClawAttack } from '../vibroClawDispatch';

const CONFIG: IGameConfig = {
  mapRadius: 8,
  turnLimit: 12,
  victoryConditions: ['destroy_all'],
  optionalRules: [],
};

function squadUnit(
  id: string,
  side: GameSide,
  vibroClawCount: number,
): IGameUnit {
  return {
    id,
    name: `Squad ${id}`,
    side,
    unitRef: `ba-${id}`,
    pilotRef: 'squad-leader',
    gunnery: 4,
    piloting: 5,
    unitType: UnitType.BATTLE_ARMOR,
    battleArmorInit: {
      squadSize: 4,
      armorPointsPerTrooper: 10,
      hasVibroClaws: vibroClawCount > 0,
      vibroClawCount,
    },
  };
}

function mechUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: `Mech ${id}`,
    side,
    unitRef: `mech-${id}`,
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    // Combat seeds (extend-combat-seed-to-all-session-producers) so the
    // damage pipeline runs against real armor.
    armorByLocation: {
      head: 9,
      center_torso: 20,
      center_torso_rear: 6,
      left_torso: 15,
      right_torso: 15,
      left_arm: 10,
      right_arm: 10,
      left_leg: 12,
      right_leg: 12,
    },
    structureByLocation: {
      head: 3,
      center_torso: 16,
      left_torso: 12,
      right_torso: 12,
      left_arm: 8,
      right_arm: 8,
      left_leg: 12,
      right_leg: 12,
    },
  };
}

/**
 * Player deployment row places index 0 at (-2, 5), index 1 at (-1, 5),
 * index 2 at (0, 5) — indices 0/1 and 1/2 are adjacent. The opponent row
 * is (-2, -5): far from every player unit.
 */
function buildSession() {
  const session = createGameSession(CONFIG, [
    squadUnit('squad-armed', GameSide.Player, 2), // (-2, 5)
    mechUnit('mech-target', GameSide.Player), // (-1, 5)
    squadUnit('squad-clawless', GameSide.Player, 0), // (0, 5)
    mechUnit('mech-far', GameSide.Opponent), // (-2, -5)
  ]);
  return startGame(session, GameSide.Player);
}

/** Deterministic roller: cycles the queued d6 values. */
function fixedRoller(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('dispatchVibroClawAttack', () => {
  it('resolves through the pipeline: record event + per-cluster DamageApplied', () => {
    const result = dispatchVibroClawAttack({
      session: buildSession(),
      squadId: 'squad-armed',
      targetUnitId: 'mech-target',
      // Resolver consumes [3,4] → cluster roll 7 → missilesHit(4) = 3 →
      // total 6, clusters [2,2,2]; each location roll then reads [3,4]
      // → 7 → center_torso on the front table.
      d6Roller: fixedRoller([3, 4]),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalDamage).toBe(6);
    expect(result.missileHits).toBe(3);

    const resolved = result.session.events.filter(
      (event) => event.type === GameEventType.VibroClawAttackResolved,
    );
    expect(resolved).toHaveLength(1);
    expect(
      resolved[0].payload as IVibroClawAttackResolvedPayload,
    ).toMatchObject({
      unitId: 'squad-armed',
      targetUnitId: 'mech-target',
      damage: 6,
      missileHits: 3,
      vibroClawCount: 2,
      survivingTroopers: 4,
    });

    const damageEvents = result.session.events.filter(
      (event) => event.type === GameEventType.DamageApplied,
    );
    expect(damageEvents).toHaveLength(3);
    for (const event of damageEvents) {
      expect(event.payload).toMatchObject({
        unitId: 'mech-target',
        location: 'center_torso',
        damage: 2,
      });
    }

    // Armor depletion carried forward between clusters: 20 → 14.
    const targetState = result.session.currentState.units['mech-target'];
    expect(targetState.armor.center_torso).toBe(14);
    expect(targetState.structure.center_torso).toBe(16);
  });

  it('rejects a non-adjacent target with the adjacency reason', () => {
    const result = dispatchVibroClawAttack({
      session: buildSession(),
      squadId: 'squad-armed',
      targetUnitId: 'mech-far',
      d6Roller: fixedRoller([3, 4]),
    });
    expect(result).toEqual({ ok: false, reason: 'not-adjacent' });
  });

  it('rejects a clawless squad', () => {
    const result = dispatchVibroClawAttack({
      session: buildSession(),
      squadId: 'squad-clawless',
      targetUnitId: 'mech-target',
      d6Roller: fixedRoller([3, 4]),
    });
    expect(result).toEqual({ ok: false, reason: 'no-vibro-claws' });
  });

  it('rejects a non-squad attacker', () => {
    const result = dispatchVibroClawAttack({
      session: buildSession(),
      squadId: 'mech-target',
      targetUnitId: 'squad-armed',
      d6Roller: fixedRoller([3, 4]),
    });
    expect(result).toEqual({ ok: false, reason: 'attacker-not-squad' });
  });

  it('rejects per-type combat-state targets in v1 (squad target)', () => {
    // squad-clawless at (0,5) is adjacent to mech-target at (-1,5) but the
    // ATTACKER here targets the other squad: armed (-2,5) → clawless (0,5)
    // is distance 2, so use the target adjacent to the armed squad instead:
    // mech-target sits between them — attack the clawless squad FROM the
    // mech-adjacent armed squad would be distance 2. Re-run with the armed
    // squad against its adjacent mech is the happy path; for the type
    // rejection we attack from the clawless... which fails on claws first.
    // So: give the armed squad an adjacent squad target by building a
    // custom session where two armed squads sit at indices 0 and 1.
    const session = startGame(
      createGameSession(CONFIG, [
        squadUnit('squad-a', GameSide.Player, 2), // (-2, 5)
        squadUnit('squad-b', GameSide.Player, 2), // (-1, 5)
      ]),
      GameSide.Player,
    );
    const result = dispatchVibroClawAttack({
      session,
      squadId: 'squad-a',
      targetUnitId: 'squad-b',
      d6Roller: fixedRoller([3, 4]),
    });
    expect(result).toEqual({ ok: false, reason: 'unsupported-target-type' });
  });
});
