import { render, screen } from '@testing-library/react';

import { ModeSelection } from '@/components/gameplay/pages/ModeSelection';
import {
  modeAvailability,
  type MultiplayerMode,
} from '@/lib/multiplayer/modeAvailability';

import { JoinMatchForm } from '../JoinMatchForm';
import { MatchBrowser } from '../MatchBrowser';
import { ModeAvailabilityNotice } from '../ModeAvailabilityNotice';

describe('multiplayer availability notices', () => {
  it.each<MultiplayerMode>(['hosted', 'coop', 'p2p'])(
    'shows %s as text with its exact limitation',
    async (mode) => {
      render(<ModeAvailabilityNotice mode={mode} />);
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(
        screen.getByText(modeAvailability[mode].sentence),
      ).toBeInTheDocument();
    },
  );

  it.each<MultiplayerMode>(['hosted', 'coop', 'p2p'])(
    'removes all %s warning text when available',
    (mode) => {
      const status = modeAvailability[mode].status;
      try {
        jest.replaceProperty(modeAvailability[mode], 'status', 'available');
        const { container } = render(<ModeAvailabilityNotice mode={mode} />);
        expect(container).toBeEmptyDOMElement();
      } finally {
        jest.replaceProperty(modeAvailability[mode], 'status', status);
      }
    },
  );

  it('allows compact text without repeating the sentence', () => {
    render(<ModeAvailabilityNotice mode="hosted" compact />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(
      screen.queryByText(modeAvailability.hosted.sentence),
    ).not.toBeInTheDocument();
  });
});

describe('availability on selection surfaces', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(['preview', 'available'] as const)(
    'discloses the %s join form',
    (status) => {
      jest.replaceProperty(modeAvailability.hosted, 'status', status);
      render(<JoinMatchForm onSubmit={jest.fn()} />);
      expect(
        screen.queryByText(modeAvailability.hosted.sentence) !== null,
      ).toBe(status !== 'available');
    },
  );
  it.each(['preview', 'available'] as const)(
    'discloses the %s match browser',
    (status) => {
      jest.replaceProperty(modeAvailability.hosted, 'status', status);
      render(<MatchBrowser wireToken={null} onJoinLobby={jest.fn()} />);
      expect(
        screen.queryByText(modeAvailability.hosted.sentence) !== null,
      ).toBe(status !== 'available');
    },
  );
  it.each(['disabled', 'available'] as const)(
    'discloses the %s pre-battle option',
    (status) => {
      jest.replaceProperty(modeAvailability.p2p, 'status', status);
      render(
        <ModeSelection
          onAutoResolve={jest.fn()}
          onInteractive={jest.fn()}
          onSpectate={jest.fn()}
          onNetworked1v1={jest.fn()}
          isResolving={false}
        />,
      );
      expect(screen.queryByText(modeAvailability.p2p.sentence) !== null).toBe(
        status !== 'available',
      );
      if (status === 'available')
        expect(screen.getByTestId('networked-1v1-btn')).toBeEnabled();
      else expect(screen.getByTestId('networked-1v1-btn')).toBeDisabled();
    },
  );
});
