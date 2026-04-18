/**
 * Tests for the `add-combat-phase-ui-flows` additions to
 * `useGameplayStore`: `plannedMovement` and `attackPlan` state plus the
 * setter / commit actions.
 *
 * Covers:
 *  - setPlannedMovement / clearPlannedMovement update state
 *  - commitPlannedMovement calls applyMovement on the interactive
 *    session and clears the plan
 *  - togglePlannedWeapon adds + removes ids from selectedWeapons
 *  - setAttackTarget syncs attackPlan + ui.targetUnitId
 *  - clearAttackPlan resets both fields
 *  - commitAttack calls applyAttack on the session and clears the plan
 *
 * @spec openspec/changes/add-combat-phase-ui-flows/tasks.md
 */

import type { InteractiveSession } from '@/engine/GameEngine';

import { useGameplayStore } from '@/stores/useGameplayStore';
import { Facing, MovementType } from '@/types/gameplay';

interface FakeSessionCalls {
  movement: Array<{
    unitId: string;
    to: { q: number; r: number };
    facing: Facing;
    type: MovementType;
  }>;
  attacks: Array<{
    attackerId: string;
    targetId: string;
    weaponIds: readonly string[];
  }>;
}

/**
 * Build a minimal fake `InteractiveSession` that records the calls
 * made to `applyMovement` / `applyAttack` and returns a stable
 * snapshot from `getSession()` so the store's `set({ session: ... })`
 * has something to land on.
 */
function buildFakeSession(): {
  session: InteractiveSession;
  calls: FakeSessionCalls;
} {
  const calls: FakeSessionCalls = { movement: [], attacks: [] };

  const sessionSnapshot = {
    id: 'fake-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [],
    events: [],
    currentState: {
      gameId: 'fake-session',
      status: 'active',
      turn: 1,
      phase: 'movement',
      activationIndex: 0,
      units: {},
      turnEvents: [],
    },
  };

  const fake = {
    applyMovement: (
      unitId: string,
      to: { q: number; r: number },
      facing: Facing,
      type: MovementType,
    ) => {
      calls.movement.push({ unitId, to, facing, type });
    },
    applyAttack: (
      attackerId: string,
      targetId: string,
      weaponIds: readonly string[],
    ) => {
      calls.attacks.push({ attackerId, targetId, weaponIds });
    },
    getSession: () => sessionSnapshot,
    getState: () => sessionSnapshot.currentState,
    isGameOver: () => false,
    getResult: () => null,
    advancePhase: () => undefined,
    runAITurn: () => undefined,
    getAvailableActions: () => ({ validMoves: [], validTargets: [] }),
    concede: () => undefined,
  };

  return {
    session: fake as unknown as InteractiveSession,
    calls,
  };
}

describe('useGameplayStore — combat-phase planning actions', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
  });

  describe('plannedMovement', () => {
    it('starts as null', () => {
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
    });

    it('setPlannedMovement stores the plan verbatim', () => {
      const plan = {
        destination: { q: 1, r: 2 },
        facing: Facing.Northeast,
        movementType: MovementType.Walk,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 1 },
          { q: 1, r: 2 },
        ],
      };
      useGameplayStore.getState().setPlannedMovement(plan);
      expect(useGameplayStore.getState().plannedMovement).toEqual(plan);
    });

    it('clearPlannedMovement resets to null', () => {
      useGameplayStore.getState().setPlannedMovement({
        destination: { q: 1, r: 1 },
        facing: Facing.North,
        movementType: MovementType.Run,
        path: [],
      });
      useGameplayStore.getState().clearPlannedMovement();
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
    });

    it('commitPlannedMovement is a no-op without session/plan/selectedUnit', () => {
      const fake = buildFakeSession();
      // No session set — should not throw, no calls made.
      useGameplayStore.getState().commitPlannedMovement();
      expect(fake.calls.movement).toHaveLength(0);
    });

    it('commitPlannedMovement calls applyMovement and clears the plan', () => {
      const fake = buildFakeSession();
      useGameplayStore.setState({
        interactiveSession: fake.session,
        plannedMovement: {
          destination: { q: 3, r: -1 },
          facing: Facing.Southeast,
          movementType: MovementType.Run,
          path: [
            { q: 0, r: 0 },
            { q: 3, r: -1 },
          ],
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });
      useGameplayStore.getState().commitPlannedMovement();

      expect(fake.calls.movement).toHaveLength(1);
      expect(fake.calls.movement[0]).toEqual({
        unitId: 'unit-a',
        to: { q: 3, r: -1 },
        facing: Facing.Southeast,
        type: MovementType.Run,
      });
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
      expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    });
  });

  describe('attackPlan', () => {
    it('starts with null target and empty weapons', () => {
      expect(useGameplayStore.getState().attackPlan).toEqual({
        targetUnitId: null,
        selectedWeapons: [],
      });
    });

    it('setAttackTarget sets both attackPlan.targetUnitId and ui.targetUnitId', () => {
      useGameplayStore.getState().setAttackTarget('enemy-1');
      expect(useGameplayStore.getState().attackPlan.targetUnitId).toBe(
        'enemy-1',
      );
      expect(useGameplayStore.getState().ui.targetUnitId).toBe('enemy-1');
    });

    it('togglePlannedWeapon adds an id, then removes it on second toggle', () => {
      useGameplayStore.getState().togglePlannedWeapon('med-laser');
      expect(useGameplayStore.getState().attackPlan.selectedWeapons).toEqual([
        'med-laser',
      ]);
      useGameplayStore.getState().togglePlannedWeapon('ac20');
      expect(useGameplayStore.getState().attackPlan.selectedWeapons).toEqual([
        'med-laser',
        'ac20',
      ]);
      useGameplayStore.getState().togglePlannedWeapon('med-laser');
      expect(useGameplayStore.getState().attackPlan.selectedWeapons).toEqual([
        'ac20',
      ]);
    });

    it('clearAttackPlan resets target and weapons', () => {
      useGameplayStore.getState().setAttackTarget('enemy-1');
      useGameplayStore.getState().togglePlannedWeapon('med-laser');
      useGameplayStore.getState().clearAttackPlan();
      expect(useGameplayStore.getState().attackPlan).toEqual({
        targetUnitId: null,
        selectedWeapons: [],
      });
      expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    });

    it('commitAttack is a no-op without session/target/weapons', () => {
      const fake = buildFakeSession();
      useGameplayStore.setState({
        interactiveSession: fake.session,
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'attacker',
        },
      });
      useGameplayStore.getState().commitAttack();
      expect(fake.calls.attacks).toHaveLength(0);
    });

    it('commitAttack calls applyAttack with attacker/target/weapons and clears the plan', () => {
      const fake = buildFakeSession();
      useGameplayStore.setState({
        interactiveSession: fake.session,
        attackPlan: {
          targetUnitId: 'enemy-1',
          selectedWeapons: ['med-laser', 'ac20'],
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'attacker',
        },
      });
      useGameplayStore.getState().commitAttack();

      expect(fake.calls.attacks).toHaveLength(1);
      expect(fake.calls.attacks[0]).toEqual({
        attackerId: 'attacker',
        targetId: 'enemy-1',
        weaponIds: ['med-laser', 'ac20'],
      });
      expect(useGameplayStore.getState().attackPlan).toEqual({
        targetUnitId: null,
        selectedWeapons: [],
      });
    });
  });
});
