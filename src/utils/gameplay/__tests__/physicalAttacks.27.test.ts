import {
  GameEventType,
  GamePhase,
  LockState,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('event reducers (via gameState)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { applyEvent, createInitialGameState } = require('../gameState');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      GameEventType: GE,
      GamePhase: GP,
      LockState: LS,
    } = require('@/types/gameplay');

    function makeState() {
      const state = createInitialGameState('test-game');
      return {
        ...state,
        units: {
          'unit-1': {
            id: 'unit-1',
            side: 'player',
            position: { q: 0, r: 0 },
            facing: 'N',
            heat: 0,
            movementThisTurn: 'stationary',
            hexesMovedThisTurn: 0,
            armor: {},
            structure: {},
            destroyedLocations: [],
            destroyedEquipment: [],
            ammo: {},
            pilotWounds: 0,
            pilotConscious: true,
            destroyed: false,
            lockState: LS.Pending,
            damageThisPhase: 0,
          },
          'unit-2': {
            id: 'unit-2',
            side: 'opponent',
            position: { q: 1, r: 0 },
            facing: 'S',
            heat: 0,
            movementThisTurn: 'stationary',
            hexesMovedThisTurn: 0,
            armor: {},
            structure: {},
            destroyedLocations: [],
            destroyedEquipment: [],
            ammo: {},
            pilotWounds: 0,
            pilotConscious: true,
            destroyed: false,
            lockState: LS.Pending,
            damageThisPhase: 0,
          },
        },
      };
    }

    it('PhysicalAttackDeclared should set attacker to Planning', () => {
      const state = makeState();
      const event = {
        id: 'evt-1',
        gameId: 'test-game',
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackDeclared,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'punch',
          toHitNumber: 5,
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-1'].lockState).toBe(LS.Planning);
    });

    it('PhysicalAttackResolved (hit) should accumulate damageThisPhase on target', () => {
      const state = makeState();
      const event = {
        id: 'evt-2',
        gameId: 'test-game',
        sequence: 2,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackResolved,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'punch',
          roll: 8,
          toHitNumber: 5,
          hit: true,
          damage: 8,
          location: 'center_torso',
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-2'].damageThisPhase).toBe(8);
    });

    it('PhysicalAttackResolved should replay physical displacement payloads', () => {
      const state = makeState();
      const event = {
        id: 'evt-2b',
        gameId: 'test-game',
        sequence: 3,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackResolved,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'push',
          roll: 8,
          toHitNumber: 4,
          hit: true,
          damage: 0,
          displacements: [
            {
              unitId: 'unit-2',
              from: { q: 1, r: 0 },
              to: { q: 1, r: 1 },
              reason: 'push',
            },
            {
              unitId: 'unit-1',
              from: { q: 0, r: 0 },
              to: { q: 1, r: 0 },
              reason: 'push',
            },
          ],
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-2'].position).toEqual({ q: 1, r: 1 });
      expect(newState.units['unit-1'].position).toEqual({ q: 1, r: 0 });
    });

    it('PhysicalAttackResolved (miss) should not change state', () => {
      const state = makeState();
      const event = {
        id: 'evt-3',
        gameId: 'test-game',
        sequence: 3,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackResolved,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'punch',
          roll: 3,
          toHitNumber: 5,
          hit: false,
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-2'].damageThisPhase).toBe(0);
    });
  });
});
