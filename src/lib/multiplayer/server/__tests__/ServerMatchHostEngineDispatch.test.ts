import type { InteractiveSession } from '@/engine/InteractiveSession';

import { MovementType } from '@/types/gameplay';

import { dispatchToEngine } from '../ServerMatchHostEngineDispatch';

describe('dispatchToEngine', () => {
  it('routes Evade Move wire intents to InteractiveSession.applyMovement', () => {
    const movements: Array<
      readonly [
        string,
        { readonly q: number; readonly r: number },
        number,
        MovementType,
      ]
    > = [];
    const session = {
      applyMovement: (
        unitId: string,
        to: { readonly q: number; readonly r: number },
        facing: number,
        movementType: MovementType,
      ) => {
        movements.push([unitId, to, facing, movementType]);
      },
    } as unknown as InteractiveSession;

    dispatchToEngine(session, {
      kind: 'Move',
      unitId: 'player-1',
      to: { q: 2, r: -1 },
      facing: 3,
      movementType: 'evade',
    });

    expect(movements).toEqual([
      ['player-1', { q: 2, r: -1 }, 3, MovementType.Evade],
    ]);
  });

  it('routes Physical wire intents to InteractiveSession.applyPhysicalAttack', () => {
    const physicalCalls: Array<readonly [string, string, string]> = [];
    const session = {
      applyPhysicalAttack: (
        attackerId: string,
        targetId: string,
        attackType: string,
      ) => {
        physicalCalls.push([attackerId, targetId, attackType]);
      },
    } as unknown as InteractiveSession;

    dispatchToEngine(session, {
      kind: 'Physical',
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'lance',
    });

    expect(physicalCalls).toEqual([['player-1', 'opponent-1', 'lance']]);
  });

  it('routes Eject wire intents to InteractiveSession.ejectUnit', () => {
    const ejectedUnitIds: string[] = [];
    const session = {
      ejectUnit: (unitId: string) => {
        ejectedUnitIds.push(unitId);
      },
    } as unknown as InteractiveSession;

    dispatchToEngine(session, { kind: 'Eject', unitId: 'player-1' });

    expect(ejectedUnitIds).toEqual(['player-1']);
  });

  it('routes Stand wire intents to InteractiveSession.attemptStandUp', () => {
    const stoodUnitIds: string[] = [];
    const session = {
      attemptStandUp: (unitId: string) => {
        stoodUnitIds.push(unitId);
      },
    } as unknown as InteractiveSession;

    dispatchToEngine(session, { kind: 'Stand', unitId: 'player-1' });

    expect(stoodUnitIds).toEqual(['player-1']);
  });

  it('routes GoProne wire intents to InteractiveSession.goProne', () => {
    const proneUnitIds: string[] = [];
    const session = {
      goProne: (unitId: string) => {
        proneUnitIds.push(unitId);
      },
    } as unknown as InteractiveSession;

    dispatchToEngine(session, { kind: 'GoProne', unitId: 'player-1' });

    expect(proneUnitIds).toEqual(['player-1']);
  });

  it('routes ActivateMovementEnhancement wire intents to InteractiveSession.activateMovementEnhancement', () => {
    const activations: Array<readonly [string, string]> = [];
    const session = {
      activateMovementEnhancement: (unitId: string, enhancement: string) => {
        activations.push([unitId, enhancement]);
      },
    } as unknown as InteractiveSession;

    dispatchToEngine(session, {
      kind: 'ActivateMovementEnhancement',
      unitId: 'player-1',
      enhancement: 'MASC',
    });

    expect(activations).toEqual([['player-1', 'MASC']]);
  });

  it('routes TorsoTwist wire intents to InteractiveSession.torsoTwist', () => {
    const twists: Array<readonly [string, number]> = [];
    const session = {
      torsoTwist: (unitId: string, secondaryFacing: number) => {
        twists.push([unitId, secondaryFacing]);
      },
    } as unknown as InteractiveSession;

    dispatchToEngine(session, {
      kind: 'TorsoTwist',
      unitId: 'player-1',
      secondaryFacing: 1,
    });

    expect(twists).toEqual([['player-1', 1]]);
  });

  it('routes Withdraw wire intents to InteractiveSession.declareWithdrawal', () => {
    const withdrawals: Array<readonly [string, string]> = [];
    const session = {
      declareWithdrawal: (unitId: string, edge: string) => {
        withdrawals.push([unitId, edge]);
      },
    } as unknown as InteractiveSession;

    dispatchToEngine(session, {
      kind: 'Withdraw',
      unitId: 'player-1',
      edge: 'north',
    });

    expect(withdrawals).toEqual([['player-1', 'north']]);
  });
});
