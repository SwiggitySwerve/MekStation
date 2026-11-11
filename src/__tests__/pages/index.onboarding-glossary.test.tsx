import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { modeAvailability } from '@/lib/multiplayer/modeAvailability';
import HomePage from '@/pages/index';

describe('HomePage onboarding entry', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(['preview', 'available'] as const)(
    'shows dashboard multiplayer availability for %s',
    async (status) => {
      for (const entry of Object.values(modeAvailability))
        jest.replaceProperty(entry, 'status', status);
      render(<HomePage />);
      expect(
        screen.getByText(
          /Start quick games, campaigns, encounters, and multiplayer/,
        ).textContent,
      ).toBe(
        `Start quick games, campaigns, encounters, and multiplayer${status === 'available' ? '' : ' (Preview)'}`,
      );
      await waitFor(() =>
        expect(screen.getByText('3,025')).toBeInTheDocument(),
      );
    },
  );

  beforeEach(() => {
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn(
      async (url: string) => {
        if (url === '/api/catalog') {
          return { json: async () => ({ count: 3025 }) };
        }
        if (url === '/api/equipment/catalog') {
          return { json: async () => ({ count: 812 }) };
        }
        throw new Error(`Unexpected fetch ${url}`);
      },
    );
  });

  it('links first-run players to onboarding and glossary guidance', async () => {
    render(<HomePage />);

    const onboarding = screen.getByText(/onboarding/i);
    const link = onboarding.closest('a');

    expect(link).toHaveAttribute('href', '/onboarding');
    await waitFor(() => {
      expect(screen.getByText('3,025')).toBeInTheDocument();
    });
  });

  it('links players directly to the gameplay hub from the dashboard', async () => {
    render(<HomePage />);

    const gameplay = screen.getByText('Gameplay');
    expect(gameplay.closest('a')).toHaveAttribute('href', '/gameplay');
    await waitFor(() => {
      expect(screen.getByText('3,025')).toBeInTheDocument();
    });
  });
});
