import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import React from 'react';

import type { TacticalLifecycleState } from '@/lib/multiplayer/tacticalLifecycleState';

import { TacticalLifecycleStateBanner } from '../TacticalLifecycleStateBanner';

const STATES: readonly TacticalLifecycleState[] = [
  'pending',
  'sealed',
  'finalized',
  'syncing',
  'reconnecting',
  'behind',
  'blocked',
  'rewound',
  'rebuilding',
  'live',
];

function posture(state: TacticalLifecycleState) {
  return {
    commandsEnabled: state === 'live',
    message: `Tactical lifecycle posture: ${state}.`,
    state,
  };
}

describe('tactical lifecycle banner a11y', () => {
  it.each(STATES)('renders %s with no axe violations', async (state) => {
    const { container } = render(
      <TacticalLifecycleStateBanner posture={posture(state)} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it.each(STATES)('announces %s through a live region', (state) => {
    render(<TacticalLifecycleStateBanner posture={posture(state)} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(`Tactical lifecycle posture: ${state}.`);
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
  });

  it('carries no digits in any state, so no announcement leaks a distance', () => {
    // Parity with the campaign banner's rule (umbrella 19.4). A spoken
    // "twelve events behind" rebuilds the same inference channel the
    // scoped-projection proofs closed for the printed one - and the
    // tactical surface is the one with a live opponent on the other end.
    for (const state of STATES) {
      const { unmount } = render(
        <TacticalLifecycleStateBanner posture={posture(state)} />,
      );
      expect(screen.getByRole('status').textContent ?? '').not.toMatch(/\d/);
      unmount();
    }
  });

  it('never interrupts with an assertive region, even when blocked', () => {
    render(<TacticalLifecycleStateBanner posture={posture('blocked')} />);

    expect(screen.getByRole('status')).not.toHaveAttribute(
      'aria-live',
      'assertive',
    );
  });
});
