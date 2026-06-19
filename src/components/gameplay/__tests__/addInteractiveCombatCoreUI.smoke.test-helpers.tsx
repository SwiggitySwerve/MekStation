/**
 * Per-change smoke test for `add-interactive-combat-core-ui`.
 *
 * Covers the four integration scenarios in tasks.md § 12:
 *   12.1 Clicking two different tokens in sequence swaps the action
 *        panel content.
 *   12.2 Emitting a phase change advances the phase tracker.
 *   12.3 Emitting a damage event adds an event log entry.
 *   12.4 Resizing the viewport below 1024px collapses the action
 *        panel into a drawer.
 *
 * @spec openspec/changes/add-interactive-combat-core-ui/tasks.md § 12
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { PhysicalAttackIntent } from '@/components/gameplay/PhysicalAttackPanel';
import type { InteractiveSession } from '@/engine/InteractiveSession';

import {
  createDemoHeatSinks,
  createDemoMaxArmor,
  createDemoMaxStructure,
  createDemoPilotNames,
  createDemoSession,
  createDemoUnitSpas,
  createDemoWeapons,
} from '@/__fixtures__/gameplay';
import { GameplayLayout } from '@/components/gameplay/GameplayLayout';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  type IDamageAppliedPayload,
  type IGameEvent,
  type IGameSession,
  type IHexGrid,
  type IWeaponStatus,
} from '@/types/gameplay';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper: renders `<GameplayLayout>` with demo data
 * and overridable selection. Keeps each scenario terse while
 * exercising the same prop surface the real page uses.
 */
function renderLayout(
  opts: {
    session?: IGameSession;
    selectedUnitId?: string | null;
    onUnitSelect?: (id: string | null) => void;
    physicalAttackIntent?: PhysicalAttackIntent | null;
    validTargetIds?: readonly string[];
    unitWeapons?: Record<string, readonly IWeaponStatus[]>;
    interactiveSession?: InteractiveSession;
  } = {},
) {
  const session = opts.session ?? createDemoSession();
  const selectedUnitId = opts.selectedUnitId ?? null;
  const onUnitSelect = opts.onUnitSelect ?? jest.fn();
  const unitWeapons = opts.unitWeapons ?? createDemoWeapons();

  return {
    session,
    onUnitSelect,
    ...render(
      <GameplayLayout
        session={session}
        selectedUnitId={selectedUnitId}
        onUnitSelect={onUnitSelect}
        onAction={jest.fn()}
        isPlayerTurn={true}
        unitWeapons={unitWeapons}
        maxArmor={createDemoMaxArmor()}
        maxStructure={createDemoMaxStructure()}
        pilotNames={createDemoPilotNames()}
        heatSinks={createDemoHeatSinks()}
        unitSpas={createDemoUnitSpas()}
        physicalAttackIntent={opts.physicalAttackIntent}
        validTargetIds={opts.validTargetIds}
        interactiveSession={opts.interactiveSession}
        playerSide={GameSide.Player}
      />,
    ),
  };
}

function createInteractiveSessionStub(
  session: IGameSession,
  gridOverride?: IHexGrid,
): InteractiveSession {
  const grid = gridOverride ?? createMinimalGrid(session.config.mapRadius);

  return {
    getGrid: () => grid,
    getMovementCapability: () => ({ walkMP: 4, runMP: 6, jumpMP: 0 }),
    declareWithdrawal: jest.fn(),
    concede: jest.fn(),
    isGameOver: () => false,
    getSession: () => session,
  } as unknown as InteractiveSession;
}

function createSmallLaser(): IWeaponStatus {
  return {
    id: 'small-laser',
    name: 'Small Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 1,
    damage: 3,
    ranges: { short: 1, medium: 2, long: 3 },
  };
}

function createWeaponPhaseSession(targetQ: number): IGameSession {
  const session = createDemoSession();

  return {
    ...session,
    currentState: {
      ...session.currentState,
      phase: GamePhase.WeaponAttack,
      units: {
        ...session.currentState.units,
        'unit-player-1': {
          ...session.currentState.units['unit-player-1'],
          position: { q: 0, r: 0 },
          facing: Facing.Southeast,
        },
        'unit-opponent-1': {
          ...session.currentState.units['unit-opponent-1'],
          position: { q: targetQ, r: 0 },
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// 12.1 — Token selection swaps action panel content
// ---------------------------------------------------------------------------

export {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameplayLayout,
  React,
  act,
  createDemoHeatSinks,
  createDemoMaxArmor,
  createDemoMaxStructure,
  createDemoPilotNames,
  createDemoSession,
  createDemoUnitSpas,
  createDemoWeapons,
  createInteractiveSessionStub,
  createMinimalGrid,
  createSmallLaser,
  createWeaponPhaseSession,
  fireEvent,
  render,
  renderLayout,
  screen,
  usePhysicalAttackPlanStore,
};

export type {
  IDamageAppliedPayload,
  IGameEvent,
  IGameSession,
  IHexGrid,
  IWeaponStatus,
  InteractiveSession,
  PhysicalAttackIntent,
};
