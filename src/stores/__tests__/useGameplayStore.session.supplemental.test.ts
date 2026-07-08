/**
 * setInteractiveSessionLogic supplemental display derivation.
 *
 * A real interactive session (non-demo) must populate the record-sheet
 * supplemental maps — max armor/structure, pilot names, heat sinks — from
 * the session's own GameCreated payload units instead of leaving the
 * demo-fixture-only maps empty (re-audit UXF-06/DC-01: the tactical unit
 * card rendered 0/0 armor+structure and 'Unknown Pilot' for every live
 * unit).
 */
import type { IAdaptedUnit } from '@/engine/types';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { InteractivePhase } from '@/stores/useGameplayStore.helpers';
import { setInteractiveSessionLogic } from '@/stores/useGameplayStore.session';
import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IGameUnit,
} from '@/types/gameplay';

function adaptedMech(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: { q: 0, r: side === GameSide.Player ? 5 : -5 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    heatSinks: 20,
    heatSinkType: 'single',
    armor: { head: 9, center_torso: 47, center_torso_rear: 14 },
    structure: { head: 3, center_torso: 31 },
    startingInternalStructure: { head: 3, center_torso: 31 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    tonnage: 100,
    weapons: [
      {
        id: 'medium-laser',
        name: 'Medium Laser',
        location: 'LEFT_ARM',
        shortRange: 3,
        mediumRange: 6,
        longRange: 9,
        damage: 5,
        heat: 3,
        minRange: 0,
        ammoPerTon: -1,
        destroyed: false,
      },
    ],
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
  };
}

function gameUnit(
  id: string,
  side: GameSide,
  pilotRef: string,
  name = pilotRef,
): IGameUnit {
  return {
    id,
    name,
    side,
    unitRef: 'probe-mech',
    pilotRef,
    gunnery: 4,
    piloting: 5,
  };
}

describe('setInteractiveSessionLogic supplemental display derivation', () => {
  it('derives max armor/structure, pilot names, and heat sinks from the session', () => {
    const player = adaptedMech('unit-p1', GameSide.Player);
    const opponent = adaptedMech('unit-o1', GameSide.Opponent);
    const interactiveSession = new InteractiveSession(
      8,
      12,
      new SeededRandom(42),
      createMinimalGrid(8),
      [player],
      [opponent],
      [
        gameUnit('unit-p1', GameSide.Player, 'Natasha Kerensky'),
        // The quick-game builder stamps 'Unknown' when no pilot exists —
        // the derivation must skip it so the record sheet's own fallback
        // ('Unknown Pilot') stays the single voice.
        gameUnit('unit-o1', GameSide.Opponent, 'Unknown'),
      ],
    );

    const updates: Record<string, unknown>[] = [];
    const set = (partial: unknown): void => {
      updates.push(partial as Record<string, unknown>);
    };

    setInteractiveSessionLogic(
      interactiveSession,
      set as Parameters<typeof setInteractiveSessionLogic>[1],
    );

    const applied = Object.assign({}, ...updates) as {
      maxArmor: Record<string, Record<string, number>>;
      maxStructure: Record<string, Record<string, number>>;
      pilotNames: Record<string, string>;
      heatSinks: Record<string, number>;
      interactivePhase: InteractivePhase;
      validMovementHexes: readonly { q: number; r: number }[];
      unitWeapons: Record<
        string,
        readonly {
          id: string;
          name: string;
          location: string;
          destroyed: boolean;
          firedThisTurn: boolean;
          damage: number | string;
          heat: number;
          ranges: { short: number; medium: number; long: number };
        }[]
      >;
    };

    expect(applied.maxArmor['unit-p1']).toEqual({
      head: 9,
      center_torso: 47,
      center_torso_rear: 14,
    });
    expect(applied.maxStructure['unit-p1']).toEqual({
      head: 3,
      center_torso: 31,
    });
    expect(applied.maxArmor['unit-o1']).toEqual({
      head: 9,
      center_torso: 47,
      center_torso_rear: 14,
    });
    expect(applied.pilotNames['unit-p1']).toBe('Natasha Kerensky');
    expect(applied.pilotNames['unit-o1']).toBeUndefined();
    expect(applied.heatSinks['unit-p1']).toBe(20);
    expect(applied.heatSinks['unit-o1']).toBe(20);
    // Weapons project from the engine's cached catalog arrays into the
    // display IWeaponStatus shape (location normalized to snake_case).
    expect(applied.unitWeapons['unit-p1']).toHaveLength(1);
    expect(applied.unitWeapons['unit-p1'][0]).toMatchObject({
      id: 'medium-laser',
      name: 'Medium Laser',
      location: 'left_arm',
      destroyed: false,
      firedThisTurn: false,
      damage: 5,
      heat: 3,
      ranges: { short: 3, medium: 6, long: 9 },
    });
    expect(applied.interactivePhase).toBe(InteractivePhase.AwaitPhaseStart);
    expect(applied.validMovementHexes).toEqual([]);
  });

  it('uses the resolved game-unit name instead of a raw campaign pilot id', () => {
    const player = adaptedMech('unit-p1', GameSide.Player);
    const opponent = adaptedMech('unit-o1', GameSide.Opponent);
    const interactiveSession = new InteractiveSession(
      8,
      12,
      new SeededRandom(42),
      createMinimalGrid(8),
      [player],
      [opponent],
      [
        gameUnit(
          'unit-p1',
          GameSide.Player,
          'pilot-ab355cd3-raw-vault-id',
          'Vera "Glitch" Holloway',
        ),
        gameUnit('unit-o1', GameSide.Opponent, 'Unknown'),
      ],
    );

    const updates: Record<string, unknown>[] = [];
    const set = (partial: unknown): void => {
      updates.push(partial as Record<string, unknown>);
    };

    setInteractiveSessionLogic(
      interactiveSession,
      set as Parameters<typeof setInteractiveSessionLogic>[1],
    );

    const applied = Object.assign({}, ...updates) as {
      pilotNames: Record<string, string>;
    };

    expect(applied.pilotNames['unit-p1']).toBe('Vera "Glitch" Holloway');
    expect(applied.pilotNames['unit-p1']).not.toBe(
      'pilot-ab355cd3-raw-vault-id',
    );
    expect(applied.pilotNames['unit-o1']).toBeUndefined();
  });
});
