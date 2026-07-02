/**
 * HexContextMenu — component test.
 *
 * Verifies hex-targeted commands surface in the hex menu and dispatch
 * through the SAME onAction the dock uses.
 *
 * tactical-movement-intent-composer (Single Movement Authority): the dock's
 * movement-verb commands (walk / run / jump) — the only `targetsHex` commands —
 * are removed. The Movement Intent Composer's click-is-a-waypoint interaction is
 * the sole hex-driven movement surface now, so the hex context menu no longer
 * offers movement commands and renders its empty state during Movement.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';

import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

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

  it('no longer surfaces movement-verb hex commands (composer owns hex clicks)', () => {
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
    // Walk / Run / Jump are removed from the dock command set — Single Movement
    // Authority: the composer's waypoint interaction is the sole hex surface.
    expect(screen.queryByTestId('hex-menu-item-movement.walk')).toBeNull();
    expect(screen.queryByTestId('hex-menu-item-movement.run')).toBeNull();
    expect(screen.queryByTestId('hex-menu-item-movement.jump')).toBeNull();
    // No hex-targeting commands remain in Movement -> empty state.
    expect(screen.getByTestId('hex-context-menu-empty')).toBeInTheDocument();
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
