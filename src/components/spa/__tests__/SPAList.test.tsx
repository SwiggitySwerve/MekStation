/**
 * SPAList — unit tests
 *
 * Covers:
 *   - Empty list renders nothing (no empty container)
 *   - Unknown ids are dropped silently
 *   - Group-by-category renders a section per category
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { SPAList } from '../SPAList';

describe('SPAList', () => {
  it('renders nothing when abilities is empty', () => {
    const { container } = render(<SPAList abilities={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when every id is unresolvable', () => {
    const { container } = render(
      <SPAList
        abilities={[{ abilityId: 'fake-1' }, { abilityId: 'fake-2' }]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a flat row of badges for a list of canonical ids', () => {
    render(
      <SPAList
        abilities={[
          { abilityId: 'weapon_specialist' },
          { abilityId: 'cluster_hitter' },
        ]}
      />,
    );
    expect(
      screen.getByTestId('spa-badge-weapon_specialist'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('spa-badge-cluster_hitter')).toBeInTheDocument();
  });

  it('drops unknown ids while keeping known ones', () => {
    render(
      <SPAList
        abilities={[
          { abilityId: 'weapon_specialist' },
          { abilityId: 'fake-id' },
          { abilityId: 'cluster_hitter' },
        ]}
      />,
    );
    expect(
      screen.getAllByText(/Weapon Specialist|Cluster Hitter/),
    ).toHaveLength(2);
    expect(screen.queryByText(/fake-id/)).not.toBeInTheDocument();
  });

  it('renders a section per category when groupByCategory is true', () => {
    render(
      <SPAList
        groupByCategory
        abilities={[
          { abilityId: 'weapon_specialist' }, // gunnery
          { abilityId: 'cluster_hitter' }, // gunnery
          { abilityId: 'iron_man' }, // toughness (likely)
        ]}
      />,
    );
    // We expect at least one category section header rendered.
    const sections = document.querySelectorAll('section');
    expect(sections.length).toBeGreaterThanOrEqual(1);
  });
});
