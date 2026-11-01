/**
 * A committed (interactive / multiplayer-host) missile attack resolves through
 * the cluster table: the roll picks how many missiles land, and the damage is
 * per landed missile, not the launcher total. Pinned MegaMek
 * `Compute.calculateClusterHitTableAmount` with `MissileWeaponHandler`
 * (LRM/MRM 1 per missile), `SRMHandler` (2), `ATMHandler` (2) and
 * `StreakHandler` (all missiles on a hit, no cluster roll).
 *
 * Each case drives a real `InteractiveSession` from declare to resolve with a
 * scripted d6 roller: attack roll 6+6 (always hits), the cluster roll, then a
 * 3+4 location roll (center torso, front arc). Grouping into separate location
 * rolls is NOT modelled yet; all landed damage goes to one location.
 */

import type { IAdaptedUnit } from '@/engine/types';
import type { IWeapon } from '@/simulation/ai/types';
import type {
  IAttackResolvedPayload,
  IDamageAppliedPayload,
  IGameUnit,
} from '@/types/gameplay';

import { SeededRandom } from '@/simulation/core';
import {
  buildWeaponLookupFromCatalogFiles,
  toAIWeapon,
} from '@/simulation/runner/UnitHydration';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import { createMinimalGrid } from '../GameEngine.helpers';
import { InteractiveSession } from '../InteractiveSession';

const lookup = buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES);

function adaptedUnit(
  id: string,
  side: GameSide,
  weapons: readonly IWeapon[],
): IAdaptedUnit {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 40,
      left_torso: 30,
      right_torso: 30,
      left_arm: 25,
      right_arm: 25,
      left_leg: 30,
      right_leg: 30,
    },
    structure: {
      head: 3,
      center_torso: 30,
      left_torso: 20,
      right_torso: 20,
      left_arm: 15,
      right_arm: 15,
      left_leg: 20,
      right_leg: 20,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons,
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  } as unknown as IAdaptedUnit;
}

interface IResolved {
  readonly resolved: IAttackResolvedPayload;
  readonly damage: readonly IDamageAppliedPayload[];
  readonly diceDrawn: readonly number[];
}

/** Fire `catalogId` at `distance` hexes; `rolls` follow the 6+6 attack roll. */
function fire(
  catalogId: string,
  distance: number,
  rolls: readonly number[],
): IResolved {
  const stats = lookup(catalogId);
  if (!stats) throw new Error(`catalog miss: ${catalogId}`);
  const weapon = toAIWeapon(stats, 0);
  const gameUnits: readonly IGameUnit[] = [
    {
      id: 'player-1',
      name: 'Attacker',
      side: GameSide.Player,
      unitRef: 'player-1',
      pilotRef: 'p1',
      gunnery: 4,
      piloting: 5,
      ammoConstruction: [
        {
          binId: 'bin-1',
          weaponType: weapon.name,
          location: 'left_torso',
          maxRounds: 50,
          damagePerRound: 1,
          isExplosive: false,
        },
      ],
    } as IGameUnit,
    {
      id: 'opponent-1',
      name: 'Target',
      side: GameSide.Opponent,
      unitRef: 'opponent-1',
      pilotRef: 'p2',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];

  const queue: number[] = [];
  const drawn: number[] = [];
  let armed = false;
  const d6 = (): number => {
    const value = armed && queue.length > 0 ? queue.shift()! : 3;
    if (armed) drawn.push(value);
    return value;
  };

  const session = new InteractiveSession(
    10,
    0,
    new SeededRandom(7),
    createMinimalGrid(10),
    [adaptedUnit('player-1', GameSide.Player, [weapon])],
    [adaptedUnit('opponent-1', GameSide.Opponent, [])],
    gameUnits,
    {},
    d6,
    [],
    ['elimination'],
    7,
  );
  while (session.getSession().currentState.phase !== GamePhase.WeaponAttack) {
    session.advancePhase();
  }
  // Fixture-only placement: the attacker faces the target's front arc.
  const live = session.getSession();
  live.currentState.units['player-1'] = {
    ...live.currentState.units['player-1'],
    position: { q: 0, r: 4 },
    facing: Facing.North,
  };
  live.currentState.units['opponent-1'] = {
    ...live.currentState.units['opponent-1'],
    position: { q: 0, r: 4 - distance },
    facing: Facing.South,
  };

  session.applyAttack('player-1', 'opponent-1', [weapon.id]);
  const resolveFrom = session.getSession().events.length;
  queue.push(6, 6, ...rolls);
  armed = true;
  session.advancePhase();

  const events = session.getSession().events.slice(resolveFrom);
  const resolved = events.find((e) => e.type === GameEventType.AttackResolved);
  if (!resolved) throw new Error('no AttackResolved event');
  return {
    resolved: resolved.payload as IAttackResolvedPayload,
    damage: events
      .filter((e) => e.type === GameEventType.DamageApplied)
      .map((e) => e.payload as IDamageAppliedPayload),
    diceDrawn: drawn,
  };
}

function clusterRoll(total: number): readonly [number, number] {
  const first = Math.min(6, total - 1);
  return [first, total - first];
}

// MegaMek Compute.clusterHitsTable, rolls 2..12.
const LRM_20_HITS = [6, 6, 9, 12, 12, 12, 12, 16, 16, 20, 20];
const SRM_6_HITS = [2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6];
const ATM_12_HITS = [4, 4, 5, 8, 8, 8, 8, 10, 10, 12, 12];

describe('committed missile attacks use the cluster table', () => {
  const cases: readonly {
    readonly name: string;
    readonly id: string;
    readonly distance: number;
    readonly hits: readonly number[];
    readonly perMissile: number;
  }[] = [
    {
      name: 'LRM 20',
      id: 'lrm-20',
      distance: 7,
      hits: LRM_20_HITS,
      perMissile: 1,
    },
    {
      name: 'MRM 20',
      id: 'mrm-20',
      distance: 3,
      hits: LRM_20_HITS,
      perMissile: 1,
    },
    {
      name: 'SRM 6',
      id: 'srm-6',
      distance: 3,
      hits: SRM_6_HITS,
      perMissile: 2,
    },
    {
      name: 'ATM 12',
      id: 'atm-12',
      distance: 5,
      hits: ATM_12_HITS,
      perMissile: 2,
    },
  ];

  for (const c of cases) {
    it.each([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])(
      `${c.name}: cluster roll %i applies the table's hits at ${c.perMissile} each`,
      (roll) => {
        const expected = c.hits[roll - 2] * c.perMissile;
        const result = fire(c.id, c.distance, [...clusterRoll(roll), 3, 4]);

        expect(result.resolved.damage).toBe(expected);
        expect(result.damage.map((d) => d.damage)).toEqual([expected]);
        expect(result.resolved.location).toBe('center_torso');
        expect(result.diceDrawn).toEqual([6, 6, ...clusterRoll(roll), 3, 4]);
      },
    );
  }

  it('Streak SRM 6 lands every missile on a hit without a cluster roll', () => {
    const result = fire('streak-srm-6', 3, [3, 4]);

    expect(result.resolved.damage).toBe(12);
    expect(result.damage.map((d) => d.damage)).toEqual([12]);
    expect(result.resolved.location).toBe('center_torso');
    expect(result.diceDrawn).toEqual([6, 6, 3, 4]);
  });

  it('leaves a non-missile cluster-table weapon untouched', () => {
    const result = fire('lb-10-x-ac', 6, [3, 4]);

    expect(result.diceDrawn).toEqual([6, 6, 3, 4]);
    expect(result.resolved.damage).toBe(10);
  });
});
