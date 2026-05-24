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
  buildConcedeIntent,
  buildDeclareAttackIntent,
  buildDeclareMovementIntent,
  buildDeclarePhysicalIntent,
  buildEjectIntent,
  buildEndPhaseIntent,
  buildGoProneIntent,
  buildStandIntent,
  buildWithdrawIntent,
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

  it('translates a guest-owned stand intent into an authoritative host command', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildStandIntent(GUEST_PEER, { unitId: 'guest-0' });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toEqual([]);
    expect('command' in result).toBe(true);
    if (!('command' in result)) return;
    expect(result.command).toEqual({
      kind: 'stand',
      unitId: 'guest-0',
    });
  });

  it('rejects stand outside the Movement phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.WeaponAttack);
    const intent = buildStandIntent(GUEST_PEER, { unitId: 'guest-0' });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-phase');
  });

  it('rejects stand for a unit the guest does not own', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildStandIntent(GUEST_PEER, { unitId: 'host-0' });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unowned-unit');
  });

  it('translates a guest-owned go-prone intent into an authoritative host command', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildGoProneIntent(GUEST_PEER, { unitId: 'guest-0' });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toEqual([]);
    expect('command' in result).toBe(true);
    if (!('command' in result)) return;
    expect(result.command).toEqual({
      kind: 'goProne',
      unitId: 'guest-0',
    });
  });

  it('rejects go-prone outside the Movement phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.WeaponAttack);
    const intent = buildGoProneIntent(GUEST_PEER, { unitId: 'guest-0' });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-phase');
  });

  it('rejects go-prone for a unit the guest does not own', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildGoProneIntent(GUEST_PEER, { unitId: 'host-0' });

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

  it('translates a guest-owned declarePhysical in the PhysicalAttack phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.PhysicalAttack);
    const intent = buildDeclarePhysicalIntent(GUEST_PEER, {
      attackerId: 'guest-0',
      targetId: 'host-0',
      attackType: 'kick',
      toHitNumber: 6,
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('physical_attack_declared');
    expect(result.events[0].sequence).toBe(session.events.length);
    expect(result.events[0].payload).toMatchObject({
      attackerId: 'guest-0',
      targetId: 'host-0',
      attackType: 'kick',
      toHitNumber: 6,
    });
  });

  it('rejects declarePhysical outside the PhysicalAttack phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.WeaponAttack);
    const intent = buildDeclarePhysicalIntent(GUEST_PEER, {
      attackerId: 'guest-0',
      targetId: 'host-0',
      attackType: 'kick',
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-phase');
  });

  it('rejects declarePhysical for a unit the guest does not own', () => {
    const session = withPhase(fixtureSession(), GamePhase.PhysicalAttack);
    const intent = buildDeclarePhysicalIntent(GUEST_PEER, {
      attackerId: 'host-0',
      targetId: 'guest-0',
      attackType: 'kick',
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unowned-unit');
  });

  it('translates a guest-owned eject intent into UnitEjected', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildEjectIntent(GUEST_PEER, { unitId: 'guest-0' });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('unit_ejected');
    expect(result.events[0].sequence).toBe(session.events.length);
    expect(result.events[0].payload).toMatchObject({
      unitId: 'guest-0',
      reason: 'player_declared',
    });
  });

  it('rejects eject for a unit the guest does not own', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildEjectIntent(GUEST_PEER, { unitId: 'host-0' });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unowned-unit');
  });

  it('translates a guest-owned withdraw intent into WithdrawalDeclared', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildWithdrawIntent(GUEST_PEER, {
      unitId: 'guest-0',
      edge: 'north',
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('withdrawal_declared');
    expect(result.events[0].sequence).toBe(session.events.length);
    expect(result.events[0].payload).toMatchObject({
      unitId: 'guest-0',
      edge: 'north',
      declaredBy: 'player',
    });
  });

  it('rejects withdraw for a unit the guest does not own', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildWithdrawIntent(GUEST_PEER, {
      unitId: 'host-0',
      edge: 'north',
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unowned-unit');
  });

  it('translates a guest-owned concede intent into an authoritative host command', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildConcedeIntent(GUEST_PEER, {
      side: GameSide.Opponent,
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toEqual([]);
    expect('command' in result).toBe(true);
    if (!('command' in result)) return;
    expect(result.command).toEqual({
      kind: 'concede',
      side: GameSide.Opponent,
    });
  });

  it('rejects concede for a side the peer does not own', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildConcedeIntent(GUEST_PEER, {
      side: GameSide.Player,
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unowned-unit');
  });

  it('rejects malformed concede payloads with a structured error', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent: IGameIntent = {
      type: 'concede',
      payload: { side: 'spectator' },
      authorPeerId: GUEST_PEER,
    };

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('malformed-payload');
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

  it('translates confirmHeat in the Heat phase into an advance-phase marker', () => {
    const session = withPhase(fixtureSession(), GamePhase.Heat);
    const intent: IGameIntent = {
      type: 'confirmHeat',
      payload: {},
      authorPeerId: GUEST_PEER,
    };
    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('phase_changed');
    expect(result.events[0].sequence).toBe(session.events.length);
    expect(result.events[0].payload).toMatchObject({
      fromPhase: GamePhase.Heat,
      toPhase: GamePhase.Heat,
    });
  });

  it('rejects confirmHeat outside the Heat phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent: IGameIntent = {
      type: 'confirmHeat',
      payload: {},
      authorPeerId: GUEST_PEER,
    };
    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-phase');
  });
});
