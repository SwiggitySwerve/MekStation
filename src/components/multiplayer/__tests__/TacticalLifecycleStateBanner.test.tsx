import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

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

describe('tactical lifecycle banner', () => {
  it.each(STATES)('renders the stable %s locator', (state) => {
    render(
      <TacticalLifecycleStateBanner
        posture={{
          commandsEnabled: state === 'live',
          message: `Tactical lifecycle posture: ${state}.`,
          state,
        }}
      />,
    );

    const banner = screen.getByTestId('tactical-lifecycle-state');
    expect(banner).toHaveAttribute('data-state', state);
    expect(banner).toHaveTextContent(`Tactical lifecycle posture: ${state}.`);
  });
});
