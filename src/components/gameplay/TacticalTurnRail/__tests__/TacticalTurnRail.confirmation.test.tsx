import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { GamePhase, GameSide } from '@/types/gameplay';

import type { TacticalTurnRailProps } from '../TacticalTurnRail.types';

import { TacticalTurnRail } from '../TacticalTurnRail';

function railProps(onAdvance = jest.fn()): TacticalTurnRailProps {
  return {
    projection: {
      round: 1,
      phase: GamePhase.Movement,
      activeSide: GameSide.Player,
      activeUnitId: null,
      initiativeOrder: [],
      unresolvedUnits: [],
      blockers: [],
    },
    gameUnits: [],
    unitStates: {},
    shellMode: 'combat',
    playerSide: GameSide.Player,
    turn: 1,
    phase: GamePhase.Movement,
    selectedUnitId: null,
    onUnitSelect: jest.fn(),
    phaseAdvanceControl: {
      label: 'End Phase',
      disabled: false,
      blockerReasons: [],
      requiresConfirmation: true,
      onAdvance,
    },
  };
}

function openConfirmation(): void {
  fireEvent.click(screen.getByTestId('sp-advance-phase-button'));
}

describe('phase rail confirmation', () => {
  it('keeps cancellation and Escape non-mutating, then confirms once', () => {
    const onAdvance = jest.fn();
    render(<TacticalTurnRail {...railProps(onAdvance)} />);
    openConfirmation();
    expect(screen.getByRole('dialog', { name: 'End Phase?' })).toBeVisible();
    expect(onAdvance).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    openConfirmation();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onAdvance).not.toHaveBeenCalled();
    openConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm End Phase' }));
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('prevents opening while blocked and rechecks blockers before confirmation', () => {
    const props = railProps();
    const control = props.phaseAdvanceControl!;
    const blocked = {
      ...control,
      disabled: true,
      disabledReason: 'Movement required',
    };
    const view = render(
      <TacticalTurnRail {...props} phaseAdvanceControl={blocked} />,
    );
    openConfirmation();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<TacticalTurnRail {...props} />);
    openConfirmation();
    view.rerender(
      <TacticalTurnRail {...props} phaseAdvanceControl={blocked} />,
    );
    expect(
      screen.getByRole('button', { name: 'Confirm End Phase' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm End Phase' }));
    expect(control.onAdvance).not.toHaveBeenCalled();
  });

  it('discards a pending confirmation when the phase or round changes', () => {
    const props = railProps();
    const view = render(<TacticalTurnRail {...props} />);
    openConfirmation();
    view.rerender(
      <TacticalTurnRail {...props} phase={GamePhase.WeaponAttack} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(props.phaseAdvanceControl!.onAdvance).not.toHaveBeenCalled();
    openConfirmation();
    view.rerender(
      <TacticalTurnRail {...props} phase={GamePhase.WeaponAttack} turn={2} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(props.phaseAdvanceControl!.onAdvance).not.toHaveBeenCalled();
  });

  it('immediately dispatches commands that do not require confirmation', () => {
    const props = railProps();
    render(
      <TacticalTurnRail
        {...props}
        phaseAdvanceControl={{
          ...props.phaseAdvanceControl!,
          requiresConfirmation: false,
        }}
      />,
    );
    openConfirmation();
    expect(props.phaseAdvanceControl!.onAdvance).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
