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
  concedeIntent,
  declareAttackIntent,
  declareMovementIntent,
  declarePhysicalIntent,
  endPhaseIntent,
  toServerIntent,
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
  it('maps a physical intent onto the Attack envelope', () => {
    const intent = declarePhysicalIntent(PEER, {
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType: 'kick',
    });
    const wire = toServerIntent(intent);
    expect(wire).toEqual({
      kind: 'Attack',
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponIds: ['kick'],
    });
    expect(IntentPayloadSchema.safeParse(wire).success).toBe(true);
  });
});

describe('toServerIntent — endPhase / concede', () => {
  it('maps endPhase to AdvancePhase', () => {
    expect(toServerIntent(endPhaseIntent(PEER))).toEqual({
      kind: 'AdvancePhase',
    });
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
