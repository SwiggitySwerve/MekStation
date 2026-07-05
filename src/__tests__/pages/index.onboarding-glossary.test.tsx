import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import HomePage from '@/pages/index';

describe('HomePage onboarding entry', () => {
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
