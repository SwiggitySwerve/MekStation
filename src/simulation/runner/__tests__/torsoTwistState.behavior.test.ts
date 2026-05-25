import { Facing, FiringArc, GameSide } from '@/types/gameplay';

import type { IWeapon } from '../../ai/types';

import { AttackAI } from '../../ai/AttackAI';
import {
  createMinimalUnitState,
  toAIUnitState,
} from '../SimulationRunnerSupport';

function createFrontWeapon(): IWeapon {
  return {
    id: 'front-medium-laser',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
    mountingArc: FiringArc.Front,
  };
}

describe('runner torso twist state projection', () => {
  it('projects secondary facing into AI weapon arc filtering', () => {
    const baseAttacker = createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    const target = toAIUnitState(
      createMinimalUnitState('opponent-1', GameSide.Opponent, {
        q: 2,
        r: -1,
      }),
      [],
    );
    const frontWeapon = createFrontWeapon();
    const noTwistAttacker = toAIUnitState(
      {
        ...baseAttacker,
        facing: Facing.North,
        secondaryFacing: Facing.North,
      },
      [frontWeapon],
    );
    const twistedAttacker = toAIUnitState(
      {
        ...baseAttacker,
        facing: Facing.North,
        secondaryFacing: Facing.Northeast,
      },
      [frontWeapon],
    );
    const ai = new AttackAI();

    expect(ai.selectWeapons(noTwistAttacker, target)).toEqual([]);
    expect(ai.selectWeapons(twistedAttacker, target).map((w) => w.id)).toEqual([
      'front-medium-laser',
    ]);
  });
});
