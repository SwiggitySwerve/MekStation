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

  it('never interrupts with an assertive region, even when blocked', () => {
    render(<TacticalLifecycleStateBanner posture={posture('blocked')} />);

    expect(screen.getByRole('status')).not.toHaveAttribute(
      'aria-live',
      'assertive',
    );
  });
});
