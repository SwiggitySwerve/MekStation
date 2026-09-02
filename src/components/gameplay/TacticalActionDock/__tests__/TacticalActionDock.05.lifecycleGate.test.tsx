/**
 * The dock honours a surface-level command gate (umbrella 19.2).
 *
 * This is the GAMEPLAY-layer half of the gate. It knows nothing about
 * lifecycles or multiplayer: it takes a `CommandAvailability`, a type this
 * layer already owns, and asserts that a refusing gate disables every
 * command WITH a reason. The posture-to-gate translation is tested in
 * `src/lib/multiplayer/__tests__/tacticalCommandGate.test.ts`, and the
 * wiring that joins them in `NetworkedGameSurface`.
 *
 * That split is deliberate. No component under `src/components/gameplay`
 * imports from `src/lib/multiplayer` - a grep returns zero files - and the
 * dock is the shared tactical surface, single-player included. Typing this
 * prop as a lifecycle posture would have made the single-player dock
 * depend on a networked concept to satisfy a test.
 *
 * The reason rows are the point. A disabled control that says nothing is
 * the dead button 19.2 exists to prevent: the player sees an action they
 * cannot take and is told neither why nor what would change it.
 */

import type { CommandAvailability } from '@/types/gameplay';

import * as H from './TacticalActionDock.test-helpers';

const { TacticalActionDock, makeCtx, render, screen } = H;

const REFUSED: CommandAvailability = {
  available: false,
  reason: 'Catching up on match updates. Your board is behind the server.',
};

const ALLOWED: CommandAvailability = { available: true };

function renderDock(commandGate?: CommandAvailability) {
  return render(
    <TacticalActionDock
      ctx={makeCtx()}
      shellMode="combat"
      onAction={jest.fn()}
      commandGate={commandGate}
    />,
  );
}

/** Every command button the dock rendered. */
function commandButtons(): HTMLElement[] {
  return screen
    .queryAllByRole('button')
    .filter((button) =>
      (button.getAttribute('data-testid') ?? '').startsWith('command-btn-'),
    );
}

describe('tactical dock command gate', () => {
  it('withholds every command while the gate refuses', () => {
    renderDock(REFUSED);
    const buttons = commandButtons();

    // Guards the guard: a dock that rendered no commands at all would
    // satisfy the disabled assertion vacuously.
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });

  it('never disables a command without a reason', () => {
    // The anti-dead-button row: a disabled control that says nothing is
    // worse than no control, because the player cannot tell a rule from a
    // bug.
    //
    // This row found a real defect rather than confirming a design. The
    // button has carried `aria-describedby="command-disabled-reason-<id>"`
    // since the dock shipped, but NOTHING ever set that id - the tooltip
    // marks its reason with `data-testid`, which is not an id - so the
    // reference always dangled and the description reached nobody. Hover
    // could not have rescued it either: a disabled button is out of the
    // tab order, so `onFocus` never fires for exactly the controls whose
    // reason matters, leaving it mouse-hover-only.
    //
    // So the assertion is deliberately made on the RENDER-TIME DOM, with
    // no hover and no focus: the description a screen reader resolves must
    // exist whenever the control is disabled, not only once a pointer has
    // found it.
    renderDock(REFUSED);

    for (const button of commandButtons()) {
      const describedBy = button.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(
        document.getElementById(describedBy ?? '')?.textContent ?? '',
      ).toContain('behind the server');
    }
  });

  it('leaves commands to answer for themselves when the gate allows', () => {
    renderDock(ALLOWED);

    expect(
      commandButtons().some((button) => !button.hasAttribute('disabled')),
    ).toBe(true);
  });

  it('leaves the dock exactly as it was when no gate is supplied', () => {
    // Surfaces with no gate behind them - the single-player dock - must
    // not start refusing commands because a networked concept arrived.
    renderDock(undefined);

    expect(
      commandButtons().some((button) => !button.hasAttribute('disabled')),
    ).toBe(true);
  });

  it('refuses the dispatch itself, not merely the button', () => {
    // The gate has to hold on the dispatch path too. A gate that only
    // disabled the button would still let a programmatic activation
    // through - which is exactly the silent retry 19.2 forbids.
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
        commandGate={REFUSED}
      />,
    );

    for (const button of commandButtons()) {
      button.removeAttribute('disabled');
      button.click();
    }

    expect(onAction).not.toHaveBeenCalled();
  });
});
