/**
 * HexContextMenu — component test.
 *
 * Verifies hex-targeted commands surface in the hex menu and dispatch
 * through the SAME onAction the dock uses.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';

import {
  GamePhase,
  MovementType,
  type IMovementRangeHex,
  type ITacticalCommandContext,
} from '@/types/gameplay';

import { HexContextMenu } from '../HexContextMenu';

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

function makeMovementProjection(
  overrides: Partial<IMovementRangeHex> = {},
): IMovementRangeHex {
  return {
    hex: { q: 3, r: 4 },
    mpCost: 9,
    reachable: false,
    movementType: MovementType.Walk,
    blockedReason: 'Destination hex is occupied',
    movementInvalidReason: 'DestinationOccupied',
    movementInvalidDetails: 'Destination hex is occupied',
    ...overrides,
  };
}

describe('HexContextMenu', () => {
  it('renders with hex coordinate data attributes', () => {
    render(
      <HexContextMenu
        hex={{ q: 3, r: 4 }}
        ctx={makeCtx()}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={() => {}}
        onAction={() => {}}
      />,
    );
    const menu = screen.getByTestId('hex-context-menu');
    expect(menu).toBeInTheDocument();
    expect(menu.getAttribute('data-hex-q')).toBe('3');
    expect(menu.getAttribute('data-hex-r')).toBe('4');
  });

  it('surfaces only hex-targeting commands (movement family)', () => {
    render(
      <HexContextMenu
        hex={{ q: 3, r: 4 }}
        ctx={makeCtx()}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={() => {}}
        onAction={() => {}}
      />,
    );
    // Movement walk/run/jump all flag targetsHex=true.
    expect(
      screen.getByTestId('hex-menu-item-movement.walk'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('hex-menu-item-movement.run'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('hex-menu-item-movement.jump'),
    ).toBeInTheDocument();
    // Facing / utility commands are not hex-targeting -> absent.
    expect(screen.queryByTestId('hex-menu-item-facing.rotate-left')).toBeNull();
    expect(screen.queryByTestId('hex-menu-item-utility.concede')).toBeNull();
  });

  it('shows the empty state when no hex commands are available in this phase', () => {
    render(
      <HexContextMenu
        hex={{ q: 0, r: 0 }}
        ctx={makeCtx({ phase: GamePhase.Heat })}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={() => {}}
        onAction={() => {}}
      />,
    );
    expect(screen.getByTestId('hex-context-menu-empty')).toBeInTheDocument();
  });

  it('dispatches actionId with payload through onAction and closes on activation', () => {
    const onAction = jest.fn();
    const onClose = jest.fn();
    render(
      <HexContextMenu
        hex={{ q: 3, r: 4 }}
        ctx={makeCtx()}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={onClose}
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByTestId('hex-menu-item-movement.walk'));
    expect(onAction).toHaveBeenCalledWith('lock', { mode: 'walk' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not dispatch heat-blocked movement modes from the hex menu', () => {
    const onAction = jest.fn();
    const onClose = jest.fn();
    render(
      <HexContextMenu
        hex={{ q: 3, r: 4 }}
        ctx={makeCtx({
          activeUnitHeat: 30,
          movementCapability: { walkMP: 4, runMP: 6, jumpMP: 4 },
        })}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={onClose}
        onAction={onAction}
      />,
    );

    const run = screen.getByTestId('hex-menu-item-movement.run');
    expect(run).toBeDisabled();
    expect(
      screen.getByTestId('hex-menu-item-reason-movement.run'),
    ).toHaveTextContent('Heat penalty leaves no run MP.');
    fireEvent.click(run);
    expect(onAction).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses the clicked hex projection to disable blocked movement commands', () => {
    const onAction = jest.fn();
    const onClose = jest.fn();
    render(
      <HexContextMenu
        hex={{ q: 3, r: 4 }}
        ctx={makeCtx({
          movementProjectionByHex: {
            '3,4': makeMovementProjection(),
          },
        })}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={onClose}
        onAction={onAction}
      />,
    );

    const walk = screen.getByTestId('hex-menu-item-movement.walk');
    expect(walk).toBeDisabled();
    expect(
      screen.getByTestId('hex-menu-item-reason-movement.walk'),
    ).toHaveTextContent('Destination hex is occupied');
    fireEvent.click(walk);
    expect(onAction).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape closes the menu', () => {
    const onClose = jest.fn();
    render(
      <HexContextMenu
        hex={{ q: 0, r: 0 }}
        ctx={makeCtx()}
        shellMode="combat"
        anchor={{ x: 0, y: 0 }}
        onClose={onClose}
        onAction={() => {}}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
