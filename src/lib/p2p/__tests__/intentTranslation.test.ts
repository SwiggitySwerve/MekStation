/**
 * Unit tests for the host-side intent translator.
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 5
 */

import type { IWeapon } from '@/simulation/ai/types';

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
import { createHexGrid } from '@/utils/gameplay/hexGrid';

import {
  buildActivateMovementEnhancementIntent,
  buildConcedeIntent,
  buildDeclareAttackIntent,
  buildDeclareMovementIntent,
  buildDeclarePhysicalIntent,
  buildEjectIntent,
  buildEndPhaseIntent,
  buildGoProneIntent,
  buildRequestSpotIntent,
  buildStandIntent,
  buildTorsoTwistIntent,
  buildWithdrawIntent,
  type IIntentTranslationAuthorityContext,
  translateIntentToEvents,
} from '../intentTranslation';

const FIXED_TIMESTAMP = '2026-04-30T00:00:00.000Z';
const HOST_PEER = 'host-peer';
const GUEST_PEER = 'guest-peer';
const ROGUE_PEER = 'rogue-peer';

function fixtureWeapon(): IWeapon {
  return {
    id: 'ml-1',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

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

function withGuestAbilities(
  session: IGameSession,
  abilities: readonly string[],
): IGameSession {
  return {
    ...session,
    currentState: {
      ...session.currentState,
      units: {
        ...session.currentState.units,
        'guest-0': {
          ...session.currentState.units['guest-0'],
          abilities,
        },
      },
    },
  };
}

function authority(): IIntentTranslationAuthorityContext {
  return {
    movementGrid: createHexGrid({ radius: 8 }),
    movementByUnit: new Map([['guest-0', { walkMP: 4, runMP: 6, jumpMP: 0 }]]),
    weaponsByUnit: new Map([['guest-0', [fixtureWeapon()]]]),
  };
}

function guestForwardMove(session: IGameSession): {
  readonly from: { readonly q: number; readonly r: number };
  readonly to: { readonly q: number; readonly r: number };
  readonly facing: Facing;
} {
  const guest = session.currentState.units['guest-0'];
  return {
    from: guest.position,
    to: { q: guest.position.q, r: guest.position.r + 1 },
    facing: guest.facing,
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
    const move = guestForwardMove(session);
    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      from: move.from,
      to: move.to,
      facing: move.facing,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    });

    const result = translateIntentToEvents(intent, session, authority());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(2);
    expect(result.events[0].type).toBe('movement_declared');
    expect(result.events[1].type).toBe('movement_locked');
    expect(result.events[0].sequence).toBe(session.events.length);
    expect(result.events[1].sequence).toBe(session.events.length + 1);
  });

  it('rejects declareMovement when the guest origin does not match host state', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const move = guestForwardMove(session);
    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      from: { q: 4, r: 4 },
      to: move.to,
      facing: move.facing,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    });

    const result = translateIntentToEvents(intent, session, authority());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unsupported-intent');
    expect(result.detail).toContain('origin');
  });

  it('recomputes declareMovement MP and heat from host authority', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const move = guestForwardMove(session);
    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      from: move.from,
      to: move.to,
      facing: move.facing,
      movementType: MovementType.Walk,
      mpUsed: 99,
      heatGenerated: 99,
    });

    const result = translateIntentToEvents(intent, session, authority());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events[0].payload).toMatchObject({
      mpUsed: 1,
      heatGenerated: 1,
    });
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

  it('translates guest-owned TacOps Evade with authoritative run-mode heat', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const move = guestForwardMove(session);
    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      from: move.from,
      to: move.to,
      facing: move.facing,
      movementType: MovementType.Evade,
      mpUsed: 99,
      heatGenerated: 99,
    });

    const result = translateIntentToEvents(intent, session, authority());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events[0].payload).toMatchObject({
      unitId: 'guest-0',
      movementType: MovementType.Evade,
      mode: MovementType.Run,
      mpUsed: 1,
      heatGenerated: 4,
    });
  });

  it('translates guest-owned TacOps Sprint with authoritative run-mode animation and sprint heat', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const move = guestForwardMove(session);
    const intent = buildDeclareMovementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      from: move.from,
      to: move.to,
      facing: move.facing,
      movementType: MovementType.Sprint,
      mpUsed: 99,
      heatGenerated: 99,
    });

    const result = translateIntentToEvents(intent, session, authority());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events[0].payload).toMatchObject({
      unitId: 'guest-0',
      movementType: MovementType.Sprint,
      mode: MovementType.Run,
      mpUsed: 1,
      heatGenerated: 3,
    });
    expect(result.events[1].type).toBe('movement_locked');
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

  it('translates a guest-owned movement enhancement activation into a host command', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildActivateMovementEnhancementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      enhancement: 'Supercharger',
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toEqual([]);
    expect('command' in result).toBe(true);
    if (!('command' in result)) return;
    expect(result.command).toEqual({
      kind: 'activateMovementEnhancement',
      unitId: 'guest-0',
      enhancement: 'Supercharger',
    });
  });

  it('rejects movement enhancement activation outside the Movement phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.WeaponAttack);
    const intent = buildActivateMovementEnhancementIntent(GUEST_PEER, {
      unitId: 'guest-0',
      enhancement: 'MASC',
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-phase');
  });

  it('translates a guest-owned torso twist into FacingChanged', () => {
    const base = withPhase(fixtureSession(), GamePhase.WeaponAttack);
    const session = {
      ...base,
      currentState: {
        ...base.currentState,
        units: {
          ...base.currentState.units,
          'guest-0': {
            ...base.currentState.units['guest-0'],
            facing: Facing.North,
            secondaryFacing: Facing.North,
          },
        },
      },
    };
    const intent = buildTorsoTwistIntent(GUEST_PEER, {
      unitId: 'guest-0',
      secondaryFacing: Facing.Northeast,
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('facing_changed');
    expect(result.events[0].sequence).toBe(session.events.length);
    expect(result.events[0].payload).toMatchObject({
      unitId: 'guest-0',
      secondaryFacing: Facing.Northeast,
    });
  });

  it('rejects torso twist outside the WeaponAttack phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent = buildTorsoTwistIntent(GUEST_PEER, {
      unitId: 'guest-0',
      secondaryFacing: Facing.Northeast,
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-phase');
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

    const result = translateIntentToEvents(intent, session, authority());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.map((e: IGameEvent) => e.type)).toEqual([
      'attack_declared',
      'attack_locked',
    ]);
  });

  it('translates a guest-owned requestSpot in the WeaponAttack phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.WeaponAttack);
    const intent = buildRequestSpotIntent(GUEST_PEER, {
      unitId: 'guest-0',
      targetId: 'host-0',
    });

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('spotting_declared');
    expect(result.events[0].sequence).toBe(session.events.length);
    expect(result.events[0].payload).toMatchObject({
      unitId: 'guest-0',
      targetId: 'host-0',
      turn: session.currentState.turn,
    });
  });

  it('rejects requestSpot outside WeaponAttack or for an unowned unit', () => {
    const movementSession = withPhase(fixtureSession(), GamePhase.Movement);
    const wrongPhase = translateIntentToEvents(
      buildRequestSpotIntent(GUEST_PEER, {
        unitId: 'guest-0',
        targetId: 'host-0',
      }),
      movementSession,
    );
    expect(wrongPhase.ok).toBe(false);
    if (!wrongPhase.ok) expect(wrongPhase.reason).toBe('wrong-phase');

    const weaponSession = withPhase(fixtureSession(), GamePhase.WeaponAttack);
    const unowned = translateIntentToEvents(
      buildRequestSpotIntent(GUEST_PEER, {
        unitId: 'host-0',
        targetId: 'guest-0',
      }),
      weaponSession,
    );
    expect(unowned.ok).toBe(false);
    if (!unowned.ok) expect(unowned.reason).toBe('unowned-unit');
  });

  it('translates a guest-owned declarePhysical in the PhysicalAttack phase', () => {
    const session = withPhase(fixtureSession(), GamePhase.PhysicalAttack);
    const intent = buildDeclarePhysicalIntent(GUEST_PEER, {
      attackerId: 'guest-0',
      targetId: 'host-0',
      attackType: 'kick',
      limb: 'leftLeg',
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
      limb: 'leftLeg',
    });
  });

  it('rejects a second physical declaration from a non-Melee Master unit', () => {
    const session = withPhase(fixtureSession(), GamePhase.PhysicalAttack);
    const firstIntent = buildDeclarePhysicalIntent(GUEST_PEER, {
      attackerId: 'guest-0',
      targetId: 'host-0',
      attackType: 'punch',
    });

    const first = translateIntentToEvents(firstIntent, session);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const secondIntent = buildDeclarePhysicalIntent(GUEST_PEER, {
      attackerId: 'guest-0',
      targetId: 'host-0',
      attackType: 'kick',
    });
    const second = translateIntentToEvents(secondIntent, {
      ...session,
      events: [...session.events, ...first.events],
    });

    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe('physical-attack-limit-reached');
  });

  it('rejects a Melee Master physical declaration that reuses the same limb over P2P', () => {
    const session = withGuestAbilities(
      withPhase(fixtureSession(), GamePhase.PhysicalAttack),
      ['melee_master'],
    );
    const firstIntent = buildDeclarePhysicalIntent(GUEST_PEER, {
      attackerId: 'guest-0',
      targetId: 'host-0',
      attackType: 'kick',
      limb: 'leftLeg',
    });

    const first = translateIntentToEvents(firstIntent, session);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const secondIntent = buildDeclarePhysicalIntent(GUEST_PEER, {
      attackerId: 'guest-0',
      targetId: 'host-0',
      attackType: 'kick',
      limb: 'leftLeg',
    });
    const second = translateIntentToEvents(secondIntent, {
      ...session,
      events: [...session.events, ...first.events],
    });

    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe('physical-attack-limb-used');
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

  it('translates confirmHeat in the Heat phase into an advance-phase command', () => {
    const session = withPhase(fixtureSession(), GamePhase.Heat);
    const intent: IGameIntent = {
      type: 'confirmHeat',
      payload: {},
      authorPeerId: GUEST_PEER,
    };
    const result = translateIntentToEvents(intent, session);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toEqual([]);
    expect('command' in result).toBe(true);
    if (!('command' in result)) return;
    expect(result.command).toEqual({
      kind: 'advancePhase',
      phase: GamePhase.Heat,
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

  it('rejects declareMovement with invalid enum-shaped values before mutating state', () => {
    const session = withPhase(fixtureSession(), GamePhase.Movement);
    const intent: IGameIntent = {
      type: 'declareMovement',
      payload: {
        unitId: 'guest-0',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        facing: 9,
        movementType: 'teleport',
        mpUsed: 1,
        heatGenerated: 0,
      },
      authorPeerId: GUEST_PEER,
    };

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('malformed-payload');
  });

  it('rejects declareAttack when weaponAttacks contains malformed weapon data', () => {
    const session = withPhase(fixtureSession(), GamePhase.WeaponAttack);
    const intent: IGameIntent = {
      type: 'declareAttack',
      payload: {
        attackerId: 'guest-0',
        targetId: 'host-0',
        weapons: ['ml-1'],
        toHitNumber: 7,
        weaponAttacks: [
          {
            weaponId: 'ml-1',
            weaponName: 'Medium Laser',
            damage: '5',
            heat: 3,
          },
        ],
      },
      authorPeerId: GUEST_PEER,
    };

    const result = translateIntentToEvents(intent, session);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('malformed-payload');
  });
});
