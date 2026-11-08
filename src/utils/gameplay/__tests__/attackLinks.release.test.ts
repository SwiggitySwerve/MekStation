import { applyBreakGrappleState } from '@/simulation/runner/phases/physicalAttackState';
import {
  GameEventType,
  type IPhysicalAttackResolvedPayload,
} from '@/types/gameplay';

import { applyEvent } from '../gameState/eventDispatch';
import { applyPhysicalAttackResolved } from '../gameState/physicalAttackResolution';
import {
  linkedPair,
  linkState,
  linkUnit,
  swarmSquad,
} from './attackLinks.fixtures';

const BREAK: IPhysicalAttackResolvedPayload = {
  attackerId: 'a',
  targetId: 'b',
  attackType: 'break-grapple',
  hit: true,
  damage: 0,
  toHitNumber: 0,
  roll: 12,
};

describe('attack link release characterization', () => {
  it.each(['reducer', 'runner'] as const)(
    '%s preserves release key shapes and unrelated state',
    (source) => {
      const before = linkedPair();
      const after =
        source === 'reducer'
          ? applyPhysicalAttackResolved(before, BREAK)
          : applyBreakGrappleState({
              state: before,
              attackerId: 'a',
              targetId: 'b',
              displacements: [],
            });
      for (const id of ['a', 'b']) {
        expect(after.units[id]).toStrictEqual({
          ...before.units[id],
          ...(source === 'reducer' && id === 'b' ? { damageThisPhase: 0 } : {}),
          grappledUnitId: undefined,
          isGrappleAttacker: undefined,
          grappledThisRound: false,
          grappleSide: undefined,
          isChainWhipGrappled: false,
        });
      }
      expect(after.units.unrelated).toBe(before.units.unrelated);
      expect(before.units.a.grappledUnitId).toBe('b');
    },
  );

  it('dismount removes the squad target key without altering squad data', () => {
    const combatState = swarmSquad('host');
    if (combatState?.kind !== 'squad') throw new Error('expected squad');
    const before = linkState(
      linkUnit('squad', { combatState, isSwarming: true }),
    );
    const { swarmingUnitId: _target, ...detached } = combatState.state;
    const after = applyEvent(before, {
      id: 'detach',
      gameId: 'c9',
      sequence: 1,
      turn: 1,
      phase: before.phase,
      timestamp: '2026-11-08T00:00:00.000Z',
      type: GameEventType.SwarmDismounted,
      payload: { unitId: 'squad' },
    });
    expect(after.units.squad).toStrictEqual({
      ...before.units.squad,
      isSwarming: false,
      combatState: { kind: 'squad', state: detached },
    });
    expect(combatState.state.swarmingUnitId).toBe('host');
  });
});
