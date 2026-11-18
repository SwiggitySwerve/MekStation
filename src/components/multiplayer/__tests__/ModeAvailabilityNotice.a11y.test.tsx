import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

import type { MultiplayerMode } from '@/lib/multiplayer/modeAvailability';

import { ModeSelection } from '@/components/gameplay/pages/ModeSelection';

import { ModeAvailabilityNotice } from '../ModeAvailabilityNotice';

it.each<MultiplayerMode>(['hosted', 'coop', 'p2p'])(
  '%s availability is accessible text',
  async (mode) => {
    const { container } = render(<ModeAvailabilityNotice mode={mode} />);
    expect(await axe(container)).toHaveNoViolations();
  },
);

it('keeps the pre-battle preview option accessible', async () => {
  const { container } = render(
    <ModeSelection
      onAutoResolve={jest.fn()}
      onInteractive={jest.fn()}
      onSpectate={jest.fn()}
      onNetworked1v1={jest.fn()}
      isResolving={false}
    />,
  );
  expect(await axe(container)).toHaveNoViolations();
});
