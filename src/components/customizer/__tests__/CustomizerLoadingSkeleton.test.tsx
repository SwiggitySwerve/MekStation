/**
 * Every customizer loading boundary shows the shared skeleton, announced as a
 * status, instead of bare "Loading ..." text (row 4.1 "loading skeletons").
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { CustomizerLoadingSkeleton } from '@/components/customizer/CustomizerLoadingSkeleton';
import { UnitStoreProvider } from '@/stores/UnitStoreProvider';
import { TechBase } from '@/types/enums/TechBase';

jest.mock('@/stores/unitStoreRegistry', () => ({
  ...jest.requireActual('@/stores/unitStoreRegistry'),
  getUnitStore: () => undefined,
  hydrateOrCreateUnit: () => undefined,
}));

it('renders a labelled status skeleton with tab, status and form placeholders', () => {
  render(<CustomizerLoadingSkeleton label="Loading unit" />);
  const status = screen.getByRole('status', { name: 'Loading unit' });
  expect(status).toHaveAttribute('aria-busy', 'true');
  expect(status.querySelectorAll('.animate-pulse').length).toBeGreaterThan(4);
  expect(screen.queryByText(/Loading unit\.\.\./)).toBeNull();
});

it('shows the skeleton while the mech unit store is not ready', () => {
  render(
    <UnitStoreProvider
      activeTab={{
        id: 'pending-unit',
        name: 'Pending',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }}
    >
      <div>editor</div>
    </UnitStoreProvider>,
  );
  expect(screen.getByRole('status', { name: 'Loading unit' })).toBeVisible();
  expect(screen.queryByText('Loading unit...')).toBeNull();
  expect(screen.queryByText('editor')).toBeNull();
});
