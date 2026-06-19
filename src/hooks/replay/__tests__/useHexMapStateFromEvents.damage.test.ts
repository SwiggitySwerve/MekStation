import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IDamageAppliedPayload,
  IGameCreatedPayload,
  IGameEvent,
  IHexTerrain,
  ILocationDestroyedPayload,
  IMovementDeclaredPayload,
  ITerrainChangedPayload,
  IUnitDestroyedPayload,
  IUnitToken,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { logger } from '@/utils/logger';

import { deriveHexMapStateFromEvents } from '../useHexMapStateFromEvents';
import {
  makeEvent,
  makeStandardGameCreatedEvent,
  requireHumanoidArmorPipState,
  requireMechToken,
} from './useHexMapStateFromEvents.test-helpers';

describe('deriveHexMapStateFromEvents damage scenarios', () => {
  describe('edge case: DamageApplied without locationDestroyed leaves isDestroyed false', () => {
    it('treats armor-only damage as a no-op for token isDestroyed', () => {
      const damagePayload: IDamageAppliedPayload = {
        unitId: 'player-1',
        location: 'CT',
        damage: 5,
        armorRemaining: 10,
        structureRemaining: 20,
        locationDestroyed: false,
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.DamageApplied,
          payload: damagePayload,
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 1);

      expect(
        state.tokens.find((t) => t.unitId === 'player-1')?.isDestroyed,
      ).toBe(false);
    });
  });

  describe('edge case: out-of-band event types pass through silently', () => {
    it('does not mutate any token when an unhandled event type is encountered', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        // Phase change event is not a covered family — must pass through.
        makeEvent({
          sequence: 1,
          type: GameEventType.PhaseChanged,
          payload: {
            fromPhase: GamePhase.Movement,
            toPhase: GamePhase.WeaponAttack,
          } as never,
        }),
      ];

      const stateBefore = deriveHexMapStateFromEvents(events, 0);
      const stateAfter = deriveHexMapStateFromEvents(events, 1);

      expect(stateAfter.tokens).toEqual(stateBefore.tokens);
      expect(stateAfter.mapRadius).toBe(stateBefore.mapRadius);
    });
  });

  describe('edge case: cursor at MAX_SAFE_INTEGER applies all events', () => {
    it('walks the entire log when cursor exceeds the max sequence', () => {
      const destroyPayload: IUnitDestroyedPayload = {
        unitId: 'player-1',
        cause: 'damage',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 5,
          type: GameEventType.UnitDestroyed,
          payload: destroyPayload,
        }),
      ];

      const state = deriveHexMapStateFromEvents(
        events,
        Number.MAX_SAFE_INTEGER,
      );

      expect(
        state.tokens.find((t) => t.unitId === 'player-1')?.isDestroyed,
      ).toBe(true);
    });
  });

  describe('edge case: multi-unit damage isolation', () => {
    it('destroying one unit leaves the other intact', () => {
      const destroyPayload: IUnitDestroyedPayload = {
        unitId: 'opponent-2',
        cause: 'ammo_explosion',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.UnitDestroyed,
          payload: destroyPayload,
        }),
      ];

      const state = deriveHexMapStateFromEvents(events, 1);

      expect(
        state.tokens.find((t) => t.unitId === 'player-1')?.isDestroyed,
      ).toBe(false);
      expect(
        state.tokens.find((t) => t.unitId === 'opponent-2')?.isDestroyed,
      ).toBe(true);
    });
  });

  // ===========================================================================
  // add-replay-timeline-markers — ComponentDestroyed + CriticalHitResolved
  // populate IMechToken.armorPipState
  // ===========================================================================

  describe('spec scenario: ComponentDestroyed populates Mech armorPipState', () => {
    it('humanoid Mech: actuator on LA → leftArm transitions to structure', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.ComponentDestroyed,
          actorId: 'opponent-2',
          payload: {
            unitId: 'player-1',
            location: 'LA',
            componentType: 'actuator',
            slotIndex: 0,
          },
        }),
      ];
      const state = deriveHexMapStateFromEvents(events, 1);
      const mech = requireMechToken(
        state.tokens.find((t) => t.unitId === 'player-1'),
        'player-1',
      );
      // armorPipState should be populated.
      const pipState = requireHumanoidArmorPipState(mech.armorPipState);
      expect(pipState.locations.leftArm).toBe('structure');
      // All other locations remain 'full'.
      expect(pipState.locations.head).toBe('full');
      expect(pipState.locations.rightArm).toBe('full');
      expect(pipState.locations.centerTorso).toBe('full');
    });
  });

  describe('spec scenario: First non-internal damage transitions full → partial', () => {
    it('armor componentType on RT → rightTorso becomes partial', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.ComponentDestroyed,
          payload: {
            unitId: 'player-1',
            location: 'RT',
            componentType: 'armor',
            slotIndex: 0,
          },
        }),
      ];
      const state = deriveHexMapStateFromEvents(events, 1);
      const mech = requireMechToken(
        state.tokens.find((t) => t.unitId === 'player-1'),
        'player-1',
      );
      const pipState = requireHumanoidArmorPipState(mech.armorPipState);
      expect(pipState.locations.rightTorso).toBe('partial');
    });
  });

  describe('spec scenario: LocationDestroyed plus ComponentDestroyed transitions to destroyed', () => {
    it('LL: LocationDestroyed at seq 5 + ComponentDestroyed at seq 10 → leftLeg destroyed', () => {
      const locDestroyedPayload: ILocationDestroyedPayload = {
        unitId: 'player-1',
        location: 'LL',
      };
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 5,
          type: GameEventType.LocationDestroyed,
          payload: locDestroyedPayload,
        }),
        makeEvent({
          sequence: 10,
          type: GameEventType.ComponentDestroyed,
          payload: {
            unitId: 'player-1',
            location: 'LL',
            componentType: 'actuator',
            slotIndex: 0,
          },
        }),
      ];
      const state = deriveHexMapStateFromEvents(events, 10);
      const mech = requireMechToken(
        state.tokens.find((t) => t.unitId === 'player-1'),
        'player-1',
      );
      const pipState = requireHumanoidArmorPipState(mech.armorPipState);
      expect(pipState.locations.leftLeg).toBe('destroyed');
    });
  });

  describe('spec scenario: ComponentDestroyed on a vehicle is a no-op', () => {
    it('vehicle token has no armorPipState and reducer does not throw', () => {
      const vehiclePayload: IGameCreatedPayload = {
        config: {
          mapRadius: 17,
          turnLimit: 0,
          victoryConditions: ['destruction'],
          optionalRules: [],
        },
        units: [
          {
            id: 'tank-1',
            name: 'Test Tank',
            side: GameSide.Player,
            unitRef: 'tank-ref',
            pilotRef: 'pilot-tank',
            gunnery: 4,
            piloting: 5,
            // Force Vehicle path explicitly. UnitType.VEHICLE === 'Vehicle'.
            unitType: UnitType.VEHICLE,
          },
        ],
      };
      const events: IGameEvent[] = [
        makeEvent({
          sequence: 0,
          type: GameEventType.GameCreated,
          payload: vehiclePayload,
        }),
        makeEvent({
          sequence: 1,
          type: GameEventType.ComponentDestroyed,
          payload: {
            unitId: 'tank-1',
            location: 'turret',
            componentType: 'weapon',
            slotIndex: 0,
          },
        }),
      ];
      // Must not throw.
      const state = deriveHexMapStateFromEvents(events, 1);
      const tank = state.tokens.find((t) => t.unitId === 'tank-1');
      expect(tank).toBeDefined();
      expect(tank?.unitType).toBe(TokenUnitType.Vehicle);
      expect('armorPipState' in (tank ?? {})).toBe(false);
    });
  });

  describe('spec scenario: CriticalHitResolved follows the same projection rules', () => {
    it('engine on CT (internal) → centerTorso transitions to structure', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.CriticalHitResolved,
          payload: {
            unitId: 'player-1',
            location: 'CT',
            slotIndex: 0,
            componentType: 'engine',
            componentName: 'Engine',
            effect: 'destroyed',
            destroyed: true,
          },
        }),
      ];
      const state = deriveHexMapStateFromEvents(events, 1);
      const mech = requireMechToken(
        state.tokens.find((t) => t.unitId === 'player-1'),
        'player-1',
      );
      const pipState = requireHumanoidArmorPipState(mech.armorPipState);
      expect(pipState.locations.centerTorso).toBe('structure');
    });
  });

  describe('edge case: unrecognized location code is silently ignored', () => {
    it('does not throw and does not allocate armorPipState', () => {
      const events: IGameEvent[] = [
        makeStandardGameCreatedEvent(),
        makeEvent({
          sequence: 1,
          type: GameEventType.ComponentDestroyed,
          payload: {
            unitId: 'player-1',
            location: 'UNKNOWN_LOC',
            componentType: 'actuator',
            slotIndex: 0,
          },
        }),
      ];
      const state = deriveHexMapStateFromEvents(events, 1);
      const mech = requireMechToken(
        state.tokens.find((t) => t.unitId === 'player-1'),
        'player-1',
      );
      expect(mech.armorPipState).toBeUndefined();
    });
  });
});
