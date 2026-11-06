import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import {
  AerospaceStoreContext,
  createNewAerospaceStore,
} from '@/stores/useAerospaceStore';
import { TechBase } from '@/types/enums/TechBase';

import { AerospaceVelocityTab } from '../AerospaceVelocityTab';

afterEach(cleanup);

function renderTab(isSmallCraft = false, readOnly = false) {
  const store = createNewAerospaceStore({
    name: 'Velocity test',
    tonnage: isSmallCraft ? 100 : 50,
    techBase: TechBase.INNER_SPHERE,
    isSmallCraft,
  });
  render(
    <AerospaceStoreContext.Provider value={store}>
      <AerospaceVelocityTab readOnly={readOnly} />
    </AerospaceStoreContext.Provider>,
  );
  return store;
}

describe('Aerospace Velocity form', () => {
  it.each([false, true])(
    'edits thrust and fuel through the store (small craft: %s)',
    (smallCraft) => {
      const store = renderTab(smallCraft);
      const before = store.getState().safeThrust;
      fireEvent.click(screen.getByTestId('aerospace-thrust-increase'));
      expect(store.getState().safeThrust).toBe(before + 1);
      expect(screen.getByTestId('aerospace-safe-thrust-input')).toHaveValue(
        store.getState().safeThrust,
      );
      expect(screen.getByTestId('aerospace-max-thrust')).toHaveTextContent(
        `Max: ${store.getState().maxThrust}`,
      );
      fireEvent.change(screen.getByTestId('aerospace-fuel-tons-input'), {
        target: { value: '2.5' },
      });
      expect(store.getState().fuelTons).toBe(2.5);
      expect(
        screen.getByText(
          new RegExp(`^${store.getState().fuelPoints} fuel points`),
        ),
      ).toBeVisible();
      expect(screen.queryByText(/Coming soon/)).not.toBeInTheDocument();
    },
  );

  it('honors readOnly for every movement control', () => {
    const store = renderTab(false, true);
    const before = store.getState().safeThrust;
    fireEvent.click(screen.getByTestId('aerospace-thrust-increase'));
    expect(store.getState().safeThrust).toBe(before);
    for (const id of [
      'aerospace-thrust-increase',
      'aerospace-thrust-decrease',
      'aerospace-fuel-tons-input',
      'aerospace-engine-type-select',
      'aerospace-legacy-engine-select',
    ]) {
      expect(screen.getByTestId(id)).toBeDisabled();
    }
  });
});
