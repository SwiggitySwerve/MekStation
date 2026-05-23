import type { InteractiveSession } from '@/engine/InteractiveSession';

import { dispatchToEngine } from '../ServerMatchHostEngineDispatch';

describe('dispatchToEngine', () => {
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
