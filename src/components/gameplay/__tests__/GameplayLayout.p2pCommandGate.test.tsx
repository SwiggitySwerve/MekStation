/**
 * The gate reaches the dock (umbrella 19.2, finding #61) - layout half.
 *
 * 3a gave `TacticalActionDock` a `commandGate` prop and nothing ever
 * passed one, so the dock's gate sat dormant on the only surface that
 * renders it. These rows walk the prop through the real layout chain
 * (`GameplayLayout` -> `GameplayLayoutView` -> `GameplayActionDockSlot`
 * -> `TacticalActionDock`); the page half - that the page computes the
 * gate from the P2P status at all - is pinned by the sibling page rows.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import type { CommandAvailability } from '@/types/gameplay/TacticalCommandInterfaces';

import { GameSide } from '@/types/gameplay';

import {
  createDemoHeatSinks,
  createDemoMaxArmor,
  createDemoMaxStructure,
  createDemoPilotNames,
  createDemoSession,
  createDemoUnitSpas,
  createDemoWeapons,
  GameplayLayout,
} from './addInteractiveCombatCoreUI.smoke.test-helpers';

const REFUSAL = 'The host left the match. Commands wait for their return.';

function renderLayout(
  commandGate?: CommandAvailability,
  onAction: (actionId: string, payload?: unknown) => void = jest.fn(),
) {
  const session = createDemoSession();
  render(
    <GameplayLayout
      session={session}
      selectedUnitId={null}
      onUnitSelect={jest.fn()}
      onAction={onAction}
      isPlayerTurn={true}
      unitWeapons={createDemoWeapons()}
      maxArmor={createDemoMaxArmor()}
      maxStructure={createDemoMaxStructure()}
      pilotNames={createDemoPilotNames()}
      heatSinks={createDemoHeatSinks()}
      unitSpas={createDemoUnitSpas()}
      playerSide={GameSide.Player}
      commandGate={commandGate}
    />,
  );
}

function commandButtons(): readonly HTMLElement[] {
  return screen
    .getAllByRole('button')
    .filter((button) =>
      (button.getAttribute('data-testid') ?? '').startsWith('command-btn-'),
    );
}

describe('GameplayLayout command gate plumbing', () => {
  it('disables every dock command when the gate refuses', () => {
    renderLayout({ available: false, reason: REFUSAL });
    const buttons = commandButtons();
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });

  it('names the refusal on each disabled command through a resolvable description', () => {
    // Finding #42's lesson: a description naming no element in the
    // document reaches nobody. The dock already writes the id; this row
    // proves the gate's words are what lands in it.
    renderLayout({ available: false, reason: REFUSAL });
    for (const button of commandButtons()) {
      const describedBy = button.getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      const description = document.getElementById(describedBy as string);
      expect(description).not.toBeNull();
      expect(description?.textContent).toBe(REFUSAL);
    }
  });

  it('leaves the dock alone when no gate is supplied', () => {
    // The single-player carve-out at the dock: an absent gate must keep
    // the pre-19.2 behaviour rather than silently refusing commands
    // that were always safe.
    renderLayout(undefined);
    const enabled = commandButtons().filter(
      (button) => !button.hasAttribute('disabled'),
    );
    expect(enabled.length).toBeGreaterThan(0);
    for (const button of enabled) {
      expect(button).not.toHaveAttribute('aria-describedby');
    }
  });
  it('leaves no reachable way to apply a command while the gate refuses', () => {
    // A P2P refusal that only greys the button would be worthless: the
    // danger is not the mouse, it is the command reaching `commit` and
    // moving a board the absent peer will never see. So this row does
    // not merely check the attribute - it forces every control back to
    // enabled (the `disabled` PROPERTY, not just the attribute) and
    // clicks it, and requires that nothing still reaches `onAction`.
    //
    // MEASURED LIMIT, stated rather than implied: this row cannot fail
    // when only the dock's internal dispatch guard is removed, because
    // a gated dock renders every dispatch surface - command buttons and
    // context-menu items alike - as a disabled button, and React does
    // not deliver a click to one whichever way the test re-enables it.
    // What the row does prove is that no reachable surface applies a
    // command while the gate refuses. The dock's dispatch guard is a
    // second line behind that, and proving IT needs a handle the dock
    // does not export today (reported, not patched here).
    const confirmSpy = jest
      .spyOn(window, 'confirm')
      .mockImplementation(() => true);
    const onAction = jest.fn();
    renderLayout({ available: false, reason: REFUSAL }, onAction);

    for (const button of commandButtons()) {
      (button as HTMLButtonElement).disabled = false;
      button.click();
    }

    expect(onAction).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('lets those same forced clicks through when no gate refuses', () => {
    // The control that keeps the row above from being vacuous. A dock
    // whose buttons never dispatch at all would pass any "nothing was
    // applied" assertion; the identical clicks MUST reach `onAction`
    // when no gate refuses. Without this row the pair proves nothing
    // about the gate - which is the failure mode the pair exists to
    // avoid, and the one the sibling dock suite fell into.
    const confirmSpy = jest
      .spyOn(window, 'confirm')
      .mockImplementation(() => true);
    const onAction = jest.fn();
    renderLayout(undefined, onAction);

    for (const button of commandButtons()) {
      (button as HTMLButtonElement).disabled = false;
      button.click();
    }

    expect(onAction).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
