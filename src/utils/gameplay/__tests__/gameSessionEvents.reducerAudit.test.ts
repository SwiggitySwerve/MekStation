import {
  GameEventType,
  GameSide,
  type IGameState,
  type IGameEvent,
} from '@/types/gameplay';
import { appendEvent } from '@/utils/gameplay/gameSession';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';
import { applyEvent } from '@/utils/gameplay/gameState';
import {
  applyMotiveDamageToState,
  createMotiveDamageState,
} from '@/utils/gameplay/motiveDamage';

import { makeReconnectHostEvents } from './gameSessionEvents.fixtures';

const events = makeReconnectHostEvents();
const seed = hydrateGameSessionFromEvents('match-1', events.slice(0, 1));
const unitId = 'unit-1';
const groundObject = { id: 'object-1', name: 'Cargo', tonnage: 1 };

interface IReducerCase {
  readonly type: GameEventType;
  readonly payload: IGameEvent['payload'];
  readonly idempotent: boolean;
}

const cases: readonly IReducerCase[] = [
  {
    type: GameEventType.GroundObjectPickedUp,
    payload: {
      unitId,
      objectId: groundObject.id,
      object: groundObject,
      from: { q: 0, r: 0 },
      carryLocation: 'leftArm',
      capacityTonnage: 5,
      capacityMarginTonnage: 4,
    },
    idempotent: true,
  },
  {
    type: GameEventType.GroundObjectDropped,
    payload: {
      unitId,
      objectId: 'object-1',
      to: { q: 0, r: 0 },
      reason: 'drop',
    },
    idempotent: true,
  },
  {
    type: GameEventType.HeatGenerated,
    payload: { unitId, newTotal: 5 },
    idempotent: true,
  },
  {
    type: GameEventType.HeatDissipated,
    payload: { unitId, newTotal: 2 },
    idempotent: true,
  },
  {
    type: GameEventType.PilotHit,
    payload: {
      unitId,
      totalWounds: 2,
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: false,
    },
    idempotent: true,
  },
  {
    type: GameEventType.AmmoConsumed,
    payload: { unitId, binId: 'bin-1', roundsRemaining: 8 },
    idempotent: true,
  },
  {
    type: GameEventType.PSRTriggered,
    payload: {
      unitId,
      reason: 'damage',
      additionalModifier: 0,
      triggerSource: 'damage',
    },
    idempotent: false,
  },
  {
    type: GameEventType.PSRResolved,
    payload: { unitId, reason: 'damage', passed: true },
    idempotent: true,
  },
  {
    type: GameEventType.CriticalHitResolved,
    payload: {
      unitId,
      location: 'center_torso',
      slotIndex: 0,
      componentType: 'engine',
      destroyed: true,
    },
    idempotent: false,
  },
  {
    type: GameEventType.MoraleShifted,
    payload: {
      side: GameSide.Player,
      from: 'STEADY',
      to: 'SHAKEN',
      cause: 'test',
      turn: 1,
    },
    idempotent: true,
  },
  {
    type: GameEventType.ObjectiveProgress,
    payload: {
      objectiveId: 'objective-1',
      hexKey: '0,0',
      holdTurnsRequired: 3,
      turn: 1,
      controlSide: GameSide.Player,
      holdProgress: 2,
    },
    idempotent: true,
  },
  {
    type: GameEventType.ObjectiveCaptured,
    payload: {
      objectiveId: 'objective-1',
      hexKey: '0,0',
      turn: 1,
      capturingSide: GameSide.Player,
    },
    idempotent: true,
  },
  {
    type: GameEventType.ObjectiveLost,
    payload: {
      objectiveId: 'objective-1',
      hexKey: '0,0',
      turn: 1,
      losingSide: GameSide.Player,
    },
    idempotent: true,
  },
  {
    type: GameEventType.AttackResolved,
    payload: {
      targetId: unitId,
      attackerId: 'attacker',
      weaponId: 'laser',
      roll: 8,
      toHitNumber: 7,
      hit: true,
      edgePointsRemaining: 1,
    },
    idempotent: true,
  },
  {
    type: GameEventType.SwarmDismounted,
    payload: { unitId },
    idempotent: true,
  },
  {
    type: GameEventType.TerrainChanged,
    payload: {
      hex: { q: 0, r: 0 },
      terrain: 'rubble',
      elevation: 1,
      reason: 'battlefield_wreckage',
    },
    idempotent: true,
  },
  {
    type: GameEventType.MinefieldChanged,
    payload: {
      operation: 'detect',
      hex: { q: 0, r: 0 },
      detectingSide: GameSide.Player,
    },
    idempotent: true,
  },
  {
    type: GameEventType.EmpMinefieldEffectApplied,
    payload: { unitId, effect: 'shutdown', durationTurns: 2 },
    idempotent: true,
  },
  {
    type: GameEventType.DesignatorMarkerApplied,
    payload: {
      targetId: unitId,
      attackerId: 'attacker',
      weaponId: 'narc',
      persistent: true,
      turn: 1,
      marker: 'narc',
      teamId: 'team-1',
    },
    idempotent: true,
  },
  {
    type: GameEventType.SpottingDeclared,
    payload: { unitId, targetId: 'target' },
    idempotent: true,
  },
  {
    type: GameEventType.AMSInterception,
    payload: {
      defenderId: unitId,
      amsWeaponId: 'ams-1',
      targetId: unitId,
      attackerId: 'attacker',
      incomingWeaponId: 'lrm',
      resolution: 'cluster-table',
      incomingProjectiles: 5,
      projectilesIntercepted: 1,
      projectilesRemaining: 4,
      ammoConsumed: 1,
      roll: [3, 3],
    },
    idempotent: false,
  },
  {
    type: GameEventType.DamageApplied,
    payload: {
      unitId,
      location: 'center_torso',
      damage: 3,
      armorRemaining: 7,
      structureRemaining: 10,
      locationDestroyed: false,
    },
    idempotent: false,
  },
];

describe('appendEvent delta-shaped reducer audit', () => {
  it('MotiveDamaged uses an additive penalty until immobilization', () => {
    const payload = { mpPenalty: 1, immobilized: false };
    const once = applyMotiveDamageToState(createMotiveDamageState(5), payload);
    const twice = applyMotiveDamageToState(once, payload);
    expect(once.penaltyMP).toBe(1);
    expect(twice.penaltyMP).toBe(2);
  });
  it.each(cases)(
    '$type: repeated reducer application is idempotent=$idempotent; append admits it once',
    ({ type, payload, idempotent }) => {
      const event = { ...events[1], id: 'audit-event', type, payload };
      const state: IGameState = {
        ...seed.currentState,
        units: {
          ...seed.currentState.units,
          [unitId]: {
            ...seed.currentState.units[unitId],
            ammoState: {
              'bin-1': {
                binId: 'bin-1',
                weaponType: 'AC/5',
                location: 'left_torso',
                remainingRounds: 10,
                maxRounds: 20,
                damagePerRound: 5,
                isExplosive: true,
              },
            },
            pendingPSRs: [
              {
                entityId: unitId,
                reason: 'damage',
                additionalModifier: 0,
                triggerSource: 'damage',
              },
            ],
            isSwarming: true,
            carriedGroundObjectIds: ['object-1'],
            rightArmCarryingCargo: true,
          },
        },
        objectives: {
          '0,0': {
            id: 'objective-1',
            hexKey: '0,0',
            objectiveType: 'capture',
            owningSide: 'neutral',
            controlRule: 'sole-occupancy',
            holdTurnsRequired: 3,
            controlSide: GameSide.Opponent,
            holdProgress: 3,
          },
        },
        minefields: { '0,0': { damagePerLeg: 5 } },
        groundObjects: {
          'object-1': {
            ...groundObject,
            carriedByUnitId: unitId,
            carryLocation: 'rightArm',
          },
        },
      };
      const once = applyEvent(state, event);
      const twice = applyEvent(once, event);
      if (idempotent) expect(twice).toStrictEqual(once);
      else expect(twice).not.toStrictEqual(once);
      expect(once).not.toStrictEqual(state);

      const admitted = appendEvent(seed, event);
      expect(appendEvent(admitted, event)).toBe(admitted);
    },
  );
});
