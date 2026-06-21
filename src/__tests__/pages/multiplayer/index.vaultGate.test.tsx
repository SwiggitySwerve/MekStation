import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('@/components/multiplayer/CreateMatchForm', () => ({
  CreateMatchForm: () => <div data-testid="create-match-form" />,
}));
jest.mock('@/components/multiplayer/JoinMatchForm', () => ({
  JoinMatchForm: () => <div data-testid="join-match-form" />,
}));
jest.mock('@/components/multiplayer/MatchBrowser', () => ({
  MatchBrowser: () => <div data-testid="match-browser" />,
}));
jest.mock('@/types/multiplayer/Player', () => ({
  decodeTokenFromWire: jest.fn(),
}));

import MultiplayerHubPage from '@/pages/multiplayer/index';

describe('MultiplayerHubPage vault gate', () => {
  it('offers vault identity setup and a path-forward affordance before token minting', () => {
    render(<MultiplayerHubPage />);

    expect(screen.getByText(/vault password required/i)).toBeInTheDocument();

    const setupLink = screen.getByRole('link', {
      name: /set up vault identity/i,
    });
    expect(setupLink).toHaveAttribute('href', '/settings#vault');
    expect(
      screen.getByText(/create or unlock a vault identity/i),
    ).toBeInTheDocument();
  });
});
