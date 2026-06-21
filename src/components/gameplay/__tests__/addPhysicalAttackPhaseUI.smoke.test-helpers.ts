/**
 * Per-change smoke test for add-physical-attack-phase-ui.
 *
 * Covers:
 *  - PhysicalAttackTypePicker: renders rows for the standard attack
 *    types and disables them when the matching restriction helper
 *    rejects the input (destroyed shoulder, hip damaged, weapons fired
 *    from arm, etc.). onSelect fires with the right type for enabled
 *    rows and is suppressed for disabled ones.
 *  - PhysicalAttackForecastModal: renders the TN, modifier list,
 *    expected damage, and hit-table label for an allowed attack;
 *    surfaces the restriction reason when the attack is blocked;
 *    Confirm / Back buttons fire the right callbacks.
 *  - usePhysicalAttackPlanStore: setPhysicalAttackTarget /
 *    setPhysicalAttackType / clearPhysicalAttackPlan update the store,
 *    and commitPhysicalAttack pushes a `PhysicalAttackDeclared` event
 *    onto the underlying session.
 *
 * @spec openspec/changes/add-physical-attack-phase-ui/tasks.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { InteractiveSession } from '@/engine/GameEngine';
import type {
  IPhysicalAttackInput,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import { PhysicalAttackForecastModal } from '@/components/gameplay/PhysicalAttackForecastModal';
import { PhysicalAttackTypePicker } from '@/components/gameplay/PhysicalAttackTypePicker';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  type IComponentDamageState,
  type IGameSession,
  type IINarcPodState,
  type IPhysicalAttackDeclaredPayload,
} from '@/types/gameplay';
import {
  declarePhysicalAttack,
  type IPhysicalAttackContext,
} from '@/utils/gameplay/gameSession';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const EMPTY_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

function withActuator(
  actuator: ActuatorType,
  base: IComponentDamageState = EMPTY_DAMAGE,
): IComponentDamageState {
  return { ...base, actuators: { ...base.actuators, [actuator]: true } };
}

function buildAttackInput(
  attackType: PhysicalAttackType,
  overrides: Partial<IPhysicalAttackInput> = {},
): IPhysicalAttackInput {
  return {
    attackerTonnage: 50,
    pilotingSkill: 4,
    componentDamage: EMPTY_DAMAGE,
    attackType,
    heat: 0,
    ...overrides,
  };
}

function buildSession(
  overrides: {
    readonly attackerAbilities?: readonly string[];
    readonly attackerMovementThisTurn?: MovementType;
    readonly defenderINarcPods?: readonly IINarcPodState[];
  } = {},
): IGameSession {
  return {
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
      phase: GamePhase.PhysicalAttack,
      activationIndex: 0,
      units: {
        attacker: {
          id: 'attacker',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: 0,
          heat: 0,
          movementThisTurn:
            overrides.attackerMovementThisTurn ?? MovementType.Walk,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: 'unlocked',
          ...(overrides.attackerAbilities !== undefined
            ? { abilities: overrides.attackerAbilities }
            : {}),
        },
        defender: {
          id: 'defender',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
          facing: 0,
          heat: 0,
          movementThisTurn: MovementType.Walk,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: 'unlocked',
          ...(overrides.defenderINarcPods !== undefined
            ? { iNarcPods: overrides.defenderINarcPods }
            : {}),
        },
      },
      turnEvents: [],
    },
  } as unknown as IGameSession;
}

function buildFakeInteractiveSession(
  sessionOverride?: IGameSession,
): InteractiveSession {
  let session = sessionOverride ?? buildSession();
  return {
    getSession: () => session,
    getState: () => session.currentState,
    isGameOver: () => false,
    getResult: () => null,
    advancePhase: () => undefined,
    runAITurn: () => undefined,
    getAvailableActions: () => ({ validMoves: [], validTargets: [] }),
    concede: () => undefined,
    applyMovement: () => undefined,
    applyAttack: () => undefined,
    applyPhysicalAttack: (
      attackerId: string,
      targetId: string,
      attackType: PhysicalAttackType,
      limb?: PhysicalAttackLimb,
      options?: Partial<IPhysicalAttackContext>,
    ) => {
      const attackerState = session.currentState.units[attackerId] ?? null;
      session = declarePhysicalAttack(
        session,
        attackerId,
        targetId,
        attackType,
        {
          attackerTonnage: 50,
          targetTonnage: 50,
          pilotingSkill: 4,
          hexesMoved: attackerState?.hexesMovedThisTurn ?? 0,
          ...options,
          limb,
        },
      );
    },
    __setSession: (nextSession: IGameSession) => {
      session = nextSession;
    },
  } as unknown as InteractiveSession;
}

// ---------------------------------------------------------------------------
// PhysicalAttackTypePicker
// ---------------------------------------------------------------------------

export {
  ActuatorType,
  EMPTY_DAMAGE,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  PhysicalAttackForecastModal,
  PhysicalAttackTypePicker,
  React,
  buildAttackInput,
  buildFakeInteractiveSession,
  buildSession,
  fireEvent,
  render,
  screen,
  usePhysicalAttackPlanStore,
  withActuator,
};

export type {
  IComponentDamageState,
  IGameSession,
  IINarcPodState,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackInput,
  InteractiveSession,
  PhysicalAttackType,
};
