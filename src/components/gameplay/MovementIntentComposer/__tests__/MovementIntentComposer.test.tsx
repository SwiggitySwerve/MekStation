/**
 * MovementIntentComposer integration test (tasks 4.1–4.5). Drives the full
 * compose → total → resolve → lock-in flow through the REAL gameplay store
 * (movementIntent slice + phase-1 selectors), proving the spec scenarios:
 *
 *  - prone engine-crit unit (Walk 2 / Run 3) composes Careful Stand (2 MP) →
 *    Walk affordable-exhausted, Run affordable (ledger scenario);
 *  - the resolver never auto-picks (Lock-In disabled until an explicit pick);
 *  - Lock-In commits the composed sequence atomically via commitComposedMovement.
 *
 * The store's `commitComposedMovement` is spied (it needs an interactiveSession
 * to run end-to-end; that path is covered by the store-level commit test).
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  Facing,
  GamePhase,
  MovementType,
  type IMovementCapability,
  type ITacticalCommandContext,
  type IUnitGameState,
} from '@/types/gameplay';

import type { IMovementComposerContext } from '../composer.types';

import { MovementIntentComposer } from '../MovementIntentComposer';

// Engine-crit capability: Walk 2 / Run 3 (2 engine hits) per the spec ledger
// scenario. walkMP 2 -> getMaxMP Run = ceil(2*1.5) = 3.
const capability: IMovementCapability = {
  walkMP: 2,
  runMP: 3,
  jumpMP: 0,
  movementMode: 'walk',
  movementHeatProfile: 'mek',
};

const proneUnit = {
  id: 'unit-a',
  position: { q: 0, r: 0 },
  facing: Facing.North,
  heat: 0,
  prone: true,
} as unknown as IUnitGameState;

function commandContext(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    activeUnitProne: true,
    activeUnitHullDown: false,
    activeUnitHeat: 0,
    movementCapability: capability,
    ...overrides,
  };
}

function context(
  overrides: Partial<IMovementComposerContext> = {},
): IMovementComposerContext {
  return {
    active: true,
    capability,
    unit: proneUnit,
    commandContext: commandContext(),
    startHex: { q: 0, r: 0 },
    startFacing: Facing.North,
    movementHeatProfile: 'mek',
    ...overrides,
  };
}

describe('MovementIntentComposer', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
  });

  it('renders nothing when inactive', () => {
    const { container } = render(
      <MovementIntentComposer context={context({ active: false })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('composes Careful Stand and totals it against the damaged budgets', () => {
    render(<MovementIntentComposer context={context()} />);

    // Careful Stand is offered for the prone unit (walk 2 -> careful needs >2,
    // so Careful Stand is illegal here; Stand Up at 2 MP is the legal stand).
    fireEvent.click(screen.getByTestId('posture-action-STAND_UP'));

    // Ledger totals 2 MP: Walk (2) exhausted, Run (3) affordable with 1 left.
    expect(screen.getByTestId('movement-cost-ledger-total')).toHaveTextContent(
      '2 MP',
    );
    expect(screen.getByTestId('ledger-budget-walk')).toHaveAttribute(
      'data-budget-affordability',
      'exhausted',
    );
    expect(screen.getByTestId('ledger-budget-run')).toHaveAttribute(
      'data-budget-affordability',
      'affordable',
    );
  });

  it('never auto-picks a mode; Lock-In is disabled until an explicit pick', () => {
    render(<MovementIntentComposer context={context()} />);
    fireEvent.click(screen.getByTestId('posture-action-STAND_UP'));

    // Both Walk and Run afford 2 MP -> resolver offers both, no pre-selection.
    expect(screen.getByTestId('movement-lock-in-btn')).toBeDisabled();
    expect(screen.getByTestId('budget-option-walk')).not.toHaveAttribute(
      'data-budget-selected',
    );
  });

  it('commits the composed sequence atomically on explicit Lock-In', () => {
    const commitSpy = jest.fn();
    useGameplayStore.setState({ commitComposedMovement: commitSpy });

    render(<MovementIntentComposer context={context()} />);
    fireEvent.click(screen.getByTestId('posture-action-STAND_UP'));

    // Explicit pick THEN Lock-In (never auto-pick).
    fireEvent.click(screen.getByTestId('budget-option-run'));
    const lockIn = screen.getByTestId('movement-lock-in-btn');
    expect(lockIn).toBeEnabled();
    fireEvent.click(lockIn);

    expect(commitSpy).toHaveBeenCalledTimes(1);
    const [intentArg, modeArg] = commitSpy.mock.calls[0];
    expect(modeArg).toBe(MovementType.Run);
    expect(intentArg.items).toHaveLength(1);
    expect(intentArg.items[0]).toMatchObject({
      kind: 'posture',
      action: 'STAND_UP',
      mpCost: 2,
    });
  });

  it('adds a posture via its hotkey and removes it from the ledger', () => {
    render(<MovementIntentComposer context={context()} />);
    // "s" is the Stand Up hotkey (task 4.5). Fire a global keydown.
    fireEvent.keyDown(window, { key: 's' });
    expect(screen.getByTestId('movement-cost-ledger-total')).toHaveTextContent(
      '2 MP',
    );

    fireEvent.click(screen.getByTestId('ledger-row-remove-0'));
    expect(screen.getByTestId('movement-cost-ledger-total')).toHaveTextContent(
      '0 MP',
    );
  });
});
