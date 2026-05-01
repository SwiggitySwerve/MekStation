/**
 * Unit tests for the host-side intent translator.
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 5
 */

import {
  GamePhase,
  GameSide,
  GameStatus,
  type IGameEvent,
  type IGameIntent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import { createGameSession, startGame } from '@/utils/gameplay/gameSessionCore';

import {
  buildDeclareAttackIntent,
  buildDeclareMovementIntent,
  buildEndPhaseIntent,
  translateIntentToEvents,
} from '../intentTranslation';

const FIXED_TIMESTAMP = '2026-04-30T00:00:00.000Z';
const HOST_PEER = 'host-peer';
const GUEST_PEER = 'guest-peer';
const ROGUE_PEER = 'rogue-peer';

function fixtureUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'host-0',
      name: 'Wasp',
      side: GameSide.Player,
      unitRef: 'wsp-1a',
      pilotRef: 'p-host',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'guest-0',
      name: 'Cicada',
      side: GameSide.Opponent,
      unitRef: 'cda-2a',
      pilotRef: 'p-guest',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function fixtureSession(): IGameSession {
  const session = createGameSession(
    {
      mapRadius: 8,
      turnLimit: 30,
      victoryConditions: ['destroy_all'],
      optionalRules: [],
    },
    fixtureUnits(),
    {
      id: 'match-1',
      createdAt: FIXED_TIMESTAMP,
      hostPeerId: HOST_PEER,
      guestPeerId: GUEST_PEER,
      sideOwners: {
        [GameSide.Player]: HOST_PEER,
        [GameSide.Opponent]: GUEST_PEER,
      },
    },
  );
  return startGame(session, GameSide.Player);
}

/**
 * Force a session into a given phase by patching the derived state.
 * The translator only reads `currentState.phase` + `currentState.turn`
 * + `events.length`, so a shallow override is enough for the unit
 * tests without spinning up the full advance-phase machinery.
 */
function withPhase(session: IGameSession, phase: GamePhase): IGameSession {
  return {
    ...session,
    currentState: {
      ...session.currentState,
      phase,
      status: GameStatus.Active,
    },
  };
}

describe('translateIntentToEvents', () => {
  it('returns no-active-session when the host has no live match', () => {
    const intent: IGameIntent = {
      type: 'declareMovement',
      payload: {},
      authorPeerId: GUEST_PEER,
    };
    const result = translateIntentToEvents(intent, null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-active-session');
  });

  it('§5.3: translates a guest-owned declareMovement into MovementDeclared + MovementLocked', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    });

    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(2);
    expect(result.events[0].type).toBe('movement_declared');
    expect(result.events[1].type).toBe('movement_locked');
    expect(result.events[0].sequence).toBe(session.events.length);
    expect(result.events[1].sequence).toBe(session.events.length + 1);
  });

  it('§5.4: rejects a declareMovement that targets a unit the guest does not own', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'host-0', // owned by host, not guest
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    });

    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unowned-unit');
  });

  it('rejects an attack declared from outside the WeaponAttack phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildDeclareAttackIntent(GUEST_PEER, {
      attackerId: 'guest-0',
      targetId: 'host-0',
      weapons: ['ml-1'],
      toHitNumber: 7,
    });

    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-phase');
  });

  it('translates a guest-owned declareAttack in the WeaponAttack phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.WeaponAttack);
    const intent = buildDeclareAttackIntent(GUEST_PEER, {
      attackerId: 'guest-0',
      targetId: 'host-0',
      weapons: ['ml-1'],
      toHitNumber: 7,
    });

    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.map((e: IGameEvent) => e.type)).toEqual([
      'attack_declared',
      'attack_locked',
    ]);
  });

  it('rejects an endPhase whose claimed phase does not match the session', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildEndPhaseIntent(GUEST_PEER, {
      phase: GamePhase.WeaponAttack,
    });
    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-phase');
  });

  it('rejects intents from a peer that owns no side', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildDeclareMovementIntent(ROGUE_PEER, {
      unitId: 'guest-0',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    });
    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unowned-unit');
  });

  it('rejects malformed payloads with a structured error', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent: IGameIntent = {
      type: 'declareMovement',
      payload: { unitId: 'guest-0' }, // missing required fields
      authorPeerId: GUEST_PEER,
    };
    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('malformed-payload');
  });

  it('marks unsupported intents as unsupported with a detail string', () => {
    const session = withPhase(fixtureSession(), GamePhase.Heat);
    const intent: IGameIntent = {
      type: 'confirmHeat',
      payload: { unitId: 'guest-0' },
      authorPeerId: GUEST_PEER,
    };
    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unsupported-intent');
    expect(result.detail).toBe('confirmHeat');
  });
});
