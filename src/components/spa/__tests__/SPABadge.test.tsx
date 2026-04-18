/**
 * SPABadge — unit tests
 *
 * Covers:
 *   - Renders the SPA's displayName + category accent
 *   - Renders designation suffix when supplied
 *   - Returns null for unknown ids (silent skip)
 *   - Tooltip body exposes description + source
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SPABadge } from '../SPABadge';

describe('SPABadge', () => {
  it('renders displayName + category for a known canonical SPA', () => {
    render(<SPABadge spaId="weapon_specialist" />);
    const badge = screen.getByTestId('spa-badge-weapon_specialist');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-category', 'gunnery');
    expect(badge).toHaveTextContent('Weapon Specialist');
  });

  it('appends the designation displayLabel when provided', () => {
    render(
      <SPABadge
        spaId="weapon_specialist"
        designation={{
          kind: 'weapon_type',
          weaponTypeId: 'medium_laser',
          displayLabel: 'Medium Laser',
        }}
      />,
    );
    expect(screen.getByText(/\(Medium Laser\)/)).toBeInTheDocument();
  });

  it('returns null when the SPA id cannot be resolved', () => {
    const { container } = render(<SPABadge spaId="not-a-real-spa-id-12345" />);
    expect(container.firstChild).toBeNull();
  });

  it('exposes description + source in the hover tooltip', () => {
    render(<SPABadge spaId="weapon_specialist" />);
    const badge = screen.getByTestId('spa-badge-weapon_specialist');

    // Hover triggers the tooltip via the wrapper span.
    fireEvent.mouseEnter(badge.parentElement!);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent(/Weapon Specialist/);
    expect(tooltip).toHaveTextContent(/Source:/);
  });

  it('renders xpSpent badge in expanded variant', () => {
    render(
      <SPABadge spaId="weapon_specialist" xpSpent={50} variant="expanded" />,
    );
    expect(screen.getByText('50 XP')).toBeInTheDocument();
  });
});
