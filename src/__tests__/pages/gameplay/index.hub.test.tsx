import { render, screen } from '@testing-library/react';
import React from 'react';

import GameplayHubPage from '@/pages/gameplay/index';

describe('GameplayHubPage', () => {
  it('renders a live gameplay hub with every gameplay surface linked', () => {
    render(<GameplayHubPage />);

    expect(
      screen.getByRole('heading', { name: /^gameplay$/i }),
    ).toBeInTheDocument();

    const expectedLinks = [
      ['Quick Game', '/gameplay/quick'],
      ['Pilots', '/gameplay/pilots'],
      ['Forces', '/gameplay/forces'],
      ['Campaigns', '/gameplay/campaigns'],
      ['Encounters', '/gameplay/encounters'],
      ['Games', '/gameplay/games'],
      ['Multiplayer', '/multiplayer'],
    ] as const;

    for (const [label, href] of expectedLinks) {
      const matchingLinks = screen.getAllByRole('link', {
        name: new RegExp(label, 'i'),
      });
      expect(
        matchingLinks.some((link) => link.getAttribute('href') === href),
      ).toBe(true);
    }
  });
});
