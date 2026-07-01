/**
 * BudgetResolver tests (task 4.4). Proves consequence lines (heat + attacker
 * to-hit), Forced Mode single-option-still-explicit, never-auto-pick (Lock-In
 * disabled until an explicit mode pick), atomic Lock-In dispatch, and the
 * world-change lock-block. Covers the spec scenarios "Multiple affordable modes
 * require an explicit choice", "Forced Mode is still explicit", and "Lock-In
 * commits the whole sequence".
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IBudgetOption } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

import { BudgetResolver } from '../BudgetResolver';

function budget(
  mode: MovementType,
  budgetMp: number,
  heatGenerated: number,
  attackerToHitModifier: number,
): IBudgetOption {
  return {
    mode,
    budgetMp,
    affordable: true,
    heatGenerated,
    attackerToHitModifier,
  };
}

describe('BudgetResolver', () => {
  it('offers Walk and Run with heat + to-hit consequences and pre-commits nothing', () => {
    render(
      <BudgetResolver
        affordableBudgets={[
          budget(MovementType.Walk, 4, 1, 1),
          budget(MovementType.Run, 6, 2, 2),
        ]}
        pendingMode={null}
        lockBlocked={false}
        onPickMode={() => {}}
        onLockIn={() => {}}
      />,
    );
    expect(screen.getByTestId('budget-option-walk')).toBeInTheDocument();
    expect(screen.getByTestId('budget-consequences-run')).toHaveTextContent(
      'Heat +2',
    );
    expect(screen.getByTestId('budget-consequences-run')).toHaveTextContent(
      '+2',
    );
    // No mode is pre-selected.
    expect(screen.getByTestId('budget-option-walk')).not.toHaveAttribute(
      'data-budget-selected',
    );
    // Lock-In is disabled until the player explicitly picks a mode.
    expect(screen.getByTestId('movement-lock-in-btn')).toBeDisabled();
  });

  it('never auto-picks: Lock-In does not fire without an explicit selection', () => {
    const onLockIn = jest.fn();
    render(
      <BudgetResolver
        affordableBudgets={[
          budget(MovementType.Walk, 4, 1, 1),
          budget(MovementType.Run, 6, 2, 2),
        ]}
        pendingMode={null}
        lockBlocked={false}
        onPickMode={() => {}}
        onLockIn={onLockIn}
      />,
    );
    fireEvent.click(screen.getByTestId('movement-lock-in-btn'));
    expect(onLockIn).not.toHaveBeenCalled();
  });

  it('commits the picked mode on Lock-In', () => {
    const onLockIn = jest.fn();
    render(
      <BudgetResolver
        affordableBudgets={[
          budget(MovementType.Walk, 4, 1, 1),
          budget(MovementType.Run, 6, 2, 2),
        ]}
        pendingMode={MovementType.Run}
        lockBlocked={false}
        onPickMode={() => {}}
        onLockIn={onLockIn}
      />,
    );
    const lockIn = screen.getByTestId('movement-lock-in-btn');
    expect(lockIn).toBeEnabled();
    fireEvent.click(lockIn);
    expect(onLockIn).toHaveBeenCalledWith(MovementType.Run);
  });

  it('renders a single Forced Mode option that still requires explicit Lock-In', () => {
    render(
      <BudgetResolver
        affordableBudgets={[budget(MovementType.Run, 6, 2, 2)]}
        pendingMode={null}
        lockBlocked={false}
        onPickMode={() => {}}
        onLockIn={() => {}}
      />,
    );
    expect(screen.getByTestId('movement-budget-resolver')).toHaveAttribute(
      'data-resolver-forced',
      'true',
    );
    expect(screen.getByTestId('budget-forced-badge-run')).toBeInTheDocument();
    // Still requires an explicit pick before Lock-In enables.
    expect(screen.getByTestId('movement-lock-in-btn')).toBeDisabled();
  });

  it('blocks Lock-In in the world-change recompose state even with a pending mode', () => {
    const onLockIn = jest.fn();
    render(
      <BudgetResolver
        affordableBudgets={[]}
        pendingMode={MovementType.Run}
        lockBlocked
        onPickMode={() => {}}
        onLockIn={onLockIn}
      />,
    );
    const lockIn = screen.getByTestId('movement-lock-in-btn');
    expect(lockIn).toBeDisabled();
    fireEvent.click(lockIn);
    expect(onLockIn).not.toHaveBeenCalled();
  });
});
