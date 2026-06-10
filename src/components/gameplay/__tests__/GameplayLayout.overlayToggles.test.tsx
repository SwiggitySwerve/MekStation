/**
 * Overlay-toggle survival tests for GameplayLayout.
 *
 * Audit 2026-06-09 G cluster (remediation W5.1a): the tactical-lens
 * applicator effect keyed its dep array on the WHOLE `lensState`
 * object (fresh identity every render) and the churning
 * `mapInteraction` object, so it re-ran on every layout render and
 * reset all unlocked layers to lens defaults. Net effect: the A
 * (firing arcs) and L (line of sight) hotkey toggles were reverted
 * within the same commit — "hotkeys dead".
 *
 * Contract under test: a manual overlay toggle must survive (a) the
 * re-render caused by the toggle itself and (b) subsequent unrelated
 * re-renders, for as long as the active lens does not change.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
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
import { GameSide, type IGameSession } from '@/types/gameplay';

/**
 * Render the full layout with demo data. Returns a `rerenderLayout`
 * helper that re-renders with fresh prop identities (new arrays /
 * callbacks) to simulate an unrelated parent re-render.
 */
function renderLayout() {
  const session: IGameSession = createDemoSession();
  const buildProps = () => ({
    session,
    selectedUnitId: null,
    onUnitSelect: jest.fn(),
    onAction: jest.fn(),
    isPlayerTurn: true,
    unitWeapons: createDemoWeapons(),
    maxArmor: createDemoMaxArmor(),
    maxStructure: createDemoMaxStructure(),
    pilotNames: createDemoPilotNames(),
    heatSinks: createDemoHeatSinks(),
    unitSpas: createDemoUnitSpas(),
    validTargetIds: [] as readonly string[],
    playerSide: GameSide.Player,
  });

  const view = render(<GameplayLayout {...buildProps()} />);
  const rerenderLayout = (): void => {
    view.rerender(<GameplayLayout {...buildProps()} />);
  };
  return { ...view, rerenderLayout };
}

describe('overlay hotkey toggles survive lens effect re-runs', () => {
  it('keeps the firing-arc overlay OFF after the A hotkey toggles it', () => {
    const { rerenderLayout } = renderLayout();

    // Firing arcs are visible by default.
    expect(screen.getByTestId('overlay-toggle-arcs')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Uppercase A toggles the firing-arc overlay off. With the buggy
    // dep array the lens effect re-ran on the resulting re-render and
    // immediately reset the layer back to its default (visible).
    fireEvent.keyDown(window, { key: 'A' });
    expect(screen.getByTestId('overlay-toggle-arcs')).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    // The toggle must also survive an unrelated parent re-render with
    // fresh prop identities.
    rerenderLayout();
    expect(screen.getByTestId('overlay-toggle-arcs')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('keeps the LOS overlay ON after the L hotkey toggles it', () => {
    const { rerenderLayout } = renderLayout();

    expect(screen.getByTestId('overlay-toggle-los')).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    fireEvent.keyDown(window, { key: 'L' });
    expect(screen.getByTestId('overlay-toggle-los')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    rerenderLayout();
    expect(screen.getByTestId('overlay-toggle-los')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
