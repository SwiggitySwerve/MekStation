/**
 * gameIntentMap unit tests.
 *
 * Per `complete-multiplayer-game-surface` task 2.2 / 2.4: each tactical
 * action maps to the correct server `IIntentPayload`, and a malformed
 * payload maps to `null` so the surface never sends garbage.
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { IntentPayloadSchema } from '@/types/multiplayer/Protocol';

import {
  activateMovementEnhancementIntent,
  concedeIntent,
  declareAttackIntent,
  declareMovementIntent,
  declarePhysicalIntent,
  ejectIntent,
  endPhaseIntent,
  goProneIntent,
  standIntent,
  torsoTwistIntent,
  toServerIntent,
  withdrawIntent,
} from '../gameIntentMap';

const PEER = 'player';

describe('toServerIntent — declareMovement', () => {
  it('maps a movement intent to a Move wire payload', () => {
    const intent = declareMovementIntent(PEER, {
      unitId: 'player-1',
      to: { q: 2, r: -1 },
      facing: 1,
      movementType: 'walk',
    });
    const wire = toServerIntent(intent);
    expect(wire).toEqual({
      kind: 'Move',
      unitId: 'player-1',
      to: { q: 2, r: -1 },
      facing: 1,
      movementType: 'walk',
    });
    // The wire payload must satisfy the server's own schema.
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('normalizes an out-of-range facing into 0-5', () => {
    const intent = declareMovementIntent(PEER, {
      unitId: 'player-1',
      to: { q: 0, r: 0 },
      facing: 7,
      movementType: 'run',
    });
    const wire = toServerIntent(intent);
    expect(wire).toMatchObject({ kind: 'Move', facing: 1 });
  });

  it('maps same-hex facing changes through the Move wire payload', () => {
    const intent = declareMovementIntent(PEER, {
      unitId: 'player-1',
      to: { q: 0, r: 0 },
      facing: 5,
      movementType: 'walk',
    });

    expect(toServerIntent(intent)).toEqual({
      kind: 'Move',
      unitId: 'player-1',
      to: { q: 0, r: 0 },
      facing: 5,
      movementType: 'walk',
    });
  });

  it('maps TacOps Evade through the Move wire payload', () => {
    const intent = declareMovementIntent(PEER, {
      unitId: 'player-1',
      to: { q: 1, r: 0 },
      facing: 2,
      movementType: 'evade',
    });

    const wire = toServerIntent(intent);

    expect(wire).toEqual({
      kind: 'Move',
      unitId: 'player-1',
      to: { q: 1, r: 0 },
      facing: 2,
      movementType: 'evade',
    });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('maps TacOps Sprint through the Move wire payload', () => {
    const intent = declareMovementIntent(PEER, {
      unitId: 'player-1',
      to: { q: 2, r: 0 },
      facing: 2,
      movementType: 'sprint',
    });

    const wire = toServerIntent(intent);

    expect(wire).toEqual({
      kind: 'Move',
      unitId: 'player-1',
      to: { q: 2, r: 0 },
      facing: 2,
      movementType: 'sprint',
    });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('returns null for a movement intent missing the unit id', () => {
    const intent = declareMovementIntent(PEER, {
      unitId: '',
      to: { q: 0, r: 0 },
      facing: 0,
      movementType: 'walk',
    });
    expect(toServerIntent(intent)).toBeNull();
  });
});

describe('toServerIntent stand', () => {
  it('maps a stand intent to a Stand wire payload', () => {
    const wire = toServerIntent(standIntent(PEER, { unitId: 'player-1' }));
    expect(wire).toEqual({ kind: 'Stand', unitId: 'player-1' });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('returns null for stand without a unit id', () => {
    expect(toServerIntent(standIntent(PEER, { unitId: '' }))).toBeNull();
  });
});

describe('toServerIntent go-prone', () => {
  it('maps a go-prone intent to a GoProne wire payload', () => {
    const wire = toServerIntent(goProneIntent(PEER, { unitId: 'player-1' }));
    expect(wire).toEqual({ kind: 'GoProne', unitId: 'player-1' });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('returns null for go-prone without a unit id', () => {
    expect(toServerIntent(goProneIntent(PEER, { unitId: '' }))).toBeNull();
  });
});

describe('toServerIntent movement enhancement activation', () => {
  it('maps a MASC activation intent to an ActivateMovementEnhancement wire payload', () => {
    const wire = toServerIntent(
      activateMovementEnhancementIntent(PEER, {
        unitId: 'player-1',
        enhancement: 'MASC',
      }),
    );
    expect(wire).toEqual({
      kind: 'ActivateMovementEnhancement',
      unitId: 'player-1',
      enhancement: 'MASC',
    });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('returns null for activation without a unit id', () => {
    expect(
      toServerIntent(
        activateMovementEnhancementIntent(PEER, {
          unitId: '',
          enhancement: 'Supercharger',
        }),
      ),
    ).toBeNull();
  });
});

describe('toServerIntent torso twist', () => {
  it('maps a torso twist intent to a TorsoTwist wire payload', () => {
    const wire = toServerIntent(
      torsoTwistIntent(PEER, {
        unitId: 'player-1',
        secondaryFacing: 1,
      }),
    );
    expect(wire).toEqual({
      kind: 'TorsoTwist',
      unitId: 'player-1',
      secondaryFacing: 1,
    });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('normalizes torso twist secondary facing into 0-5', () => {
    const wire = toServerIntent(
      torsoTwistIntent(PEER, {
        unitId: 'player-1',
        secondaryFacing: -1,
      }),
    );
    expect(wire).toMatchObject({
      kind: 'TorsoTwist',
      secondaryFacing: 5,
    });
  });

  it('returns null for torso twist without a unit id', () => {
    expect(
      toServerIntent(
        torsoTwistIntent(PEER, { unitId: '', secondaryFacing: 1 }),
      ),
    ).toBeNull();
  });
});

describe('toServerIntent — declareAttack', () => {
  it('maps an attack intent to an Attack wire payload', () => {
    const intent = declareAttackIntent(PEER, {
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponIds: ['ppc', 'lrm-20'],
    });
    const wire = toServerIntent(intent);
    expect(wire).toEqual({
      kind: 'Attack',
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponIds: ['ppc', 'lrm-20'],
    });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('returns null when no weapons are supplied', () => {
    const intent = declareAttackIntent(PEER, {
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponIds: [],
    });
    expect(toServerIntent(intent)).toBeNull();
  });
});

describe('toServerIntent — declarePhysical', () => {
  it('maps a physical intent to a Physical wire payload', () => {
    const intent = declarePhysicalIntent(PEER, {
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'kick',
    });
    const wire = toServerIntent(intent);
    expect(wire).toEqual({
      kind: 'Physical',
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'kick',
    });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('maps source-backed flail and wrecking ball physical intents', () => {
    for (const attackType of ['flail', 'wrecking-ball'] as const) {
      const intent = declarePhysicalIntent(PEER, {
        attackerId: 'player-1',
        targetId: 'opponent-1',
        attackType,
      });
      const wire = toServerIntent(intent);

      expect(wire).toEqual({
        kind: 'Physical',
        attackerId: 'player-1',
        targetId: 'opponent-1',
        attackType,
      });
      expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
    }
  });

  it('returns null for an unsupported physical attack type', () => {
    const intent = declarePhysicalIntent(PEER, {
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'talons' as never,
    });

    expect(toServerIntent(intent)).toBeNull();
  });
});

describe('toServerIntent — endPhase / concede', () => {
  it('maps endPhase to AdvancePhase', () => {
    expect(toServerIntent(endPhaseIntent(PEER))).toEqual({
      kind: 'AdvancePhase',
    });
  });

  it('maps eject to the Eject wire payload', () => {
    const wire = toServerIntent(ejectIntent(PEER, { unitId: 'player-1' }));
    expect(wire).toEqual({ kind: 'Eject', unitId: 'player-1' });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('returns null for eject without a unit id', () => {
    expect(toServerIntent(ejectIntent(PEER, { unitId: '' }))).toBeNull();
  });

  it('maps withdraw to the Withdraw wire payload', () => {
    const wire = toServerIntent(
      withdrawIntent(PEER, { unitId: 'player-1', edge: 'north' }),
    );
    expect(wire).toEqual({
      kind: 'Withdraw',
      unitId: 'player-1',
      edge: 'north',
    });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('returns null for withdraw without a valid edge', () => {
    expect(
      toServerIntent(
        withdrawIntent(PEER, {
          unitId: 'player-1',
          edge: 'nearest' as never,
        }),
      ),
    ).toBeNull();
  });

  it('maps a concede intent to the Concede wire payload', () => {
    const wire = toServerIntent(
      concedeIntent(PEER, { side: GameSide.Opponent }),
    );
    expect(wire).toEqual({ kind: 'Concede', side: 'opponent' });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });

  it('returns null for an unknown intent type', () => {
    const bogus = {
      type: 'notARealType',
      payload: {},
      authorPeerId: PEER,
    } as unknown as Parameters<typeof toServerIntent>[0];
    expect(toServerIntent(bogus)).toBeNull();
  });
});
