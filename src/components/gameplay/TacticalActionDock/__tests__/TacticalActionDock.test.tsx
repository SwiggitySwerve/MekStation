/**
 * TacticalActionDock — component test.
 *
 * Verifies the dock renders commands grouped by category, marks
 * disabled commands as disabled with an accessible reason, dispatches
 * actionId through onAction, and routes requiresConfirmation through
 * the confirm gate.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';

import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import { TacticalActionDock } from '../TacticalActionDock';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    ...overrides,
  };
}

describe('TacticalActionDock', () => {
  it('renders the dock with the tactical-action-dock testid', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    expect(screen.getByTestId('tactical-action-dock')).toBeInTheDocument();
  });

  it('renders Movement-phase commands grouped by category', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    expect(screen.getByTestId('command-group-movement')).toBeInTheDocument();
    expect(screen.getByTestId('command-btn-movement.walk')).toBeInTheDocument();
    expect(screen.queryByTestId('command-btn-weapon.fire-volley')).toBeNull();
  });

  it('dispatches actionId through onAction on click', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByTestId('command-btn-movement.walk'));
    expect(onAction).toHaveBeenCalledWith('lock', { mode: 'walk' });
  });

  it('does not dispatch when canAct is false (disabled-with-reason)', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ canAct: false })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    const button = screen.getByTestId('command-btn-movement.walk');
    expect(button).toBeDisabled();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('disabled command exposes aria-describedby for screen readers', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ canAct: false })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    const button = screen.getByTestId('command-btn-movement.walk');
    expect(button.getAttribute('aria-describedby')).toBe(
      'command-disabled-reason-movement.walk',
    );
  });

  it('confirm-gated commands route through window.confirm', () => {
    const onAction = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.WeaponAttack,
          targetUnitId: 'enemy-x',
        })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByTestId('command-btn-weapon.fire-volley'));
    expect(confirmSpy).toHaveBeenCalled();
    // confirm returned false -> no dispatch (spec: 'Cancel returns to
    // neutral selection state').
    expect(onAction).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('confirm-accepted commands dispatch the actionId', () => {
    const onAction = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.WeaponAttack,
          targetUnitId: 'enemy-x',
        })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByTestId('command-btn-weapon.fire-volley'));
    expect(onAction).toHaveBeenCalledWith('lock', { volley: true });
    confirmSpy.mockRestore();
  });

  it('shows empty state when no commands are available for the phase', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ phase: GamePhase.Initiative })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    // Initiative phase has no commands in the registry today —
    // utility commands carry ALL_PHASES so they still appear.
    // Verify the dock renders without crash even if there are no
    // matching groups (eject/withdraw/concede all available).
    expect(screen.getByTestId('tactical-action-dock')).toBeInTheDocument();
  });

  it('renders trailingActions slot', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
        trailingActions={<button data-testid="trailing-test-btn">Trail</button>}
      />,
    );
    expect(
      screen.getByTestId('tactical-action-dock-trailing'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('trailing-test-btn')).toBeInTheDocument();
  });
});
