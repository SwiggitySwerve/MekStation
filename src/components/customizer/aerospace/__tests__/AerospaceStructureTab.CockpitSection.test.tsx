/**
 * Structural integrity stepper: read-only for fighters, whose SI is derived
 * (MegaMek Aero.java:804-808), editable for small craft, which keep an
 * explicit value (BLKSmallCraftFile.java:125-128).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/aerospace-unit-system/spec.md
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import {
  createNewAerospaceStore,
  AerospaceStoreContext,
} from '@/stores/useAerospaceStore';
import { TechBase } from '@/types/enums/TechBase';

import { CockpitSection } from '../AerospaceStructureTab.CockpitSection';

function renderSection(isSmallCraft: boolean, readOnly = false) {
  const store = createNewAerospaceStore({
    name: 'Test Craft',
    tonnage: isSmallCraft ? 100 : 50,
    techBase: TechBase.INNER_SPHERE,
    isSmallCraft,
  });
  render(
    <AerospaceStoreContext.Provider value={store}>
      <CockpitSection readOnly={readOnly} />
    </AerospaceStoreContext.Provider>,
  );
  return store;
}

afterEach(cleanup);

describe('CockpitSection structural integrity stepper', () => {
  it('shows the derived SI and disables both buttons for a fighter', () => {
    const store = renderSection(false);
    expect(screen.getByTestId('aerospace-si-input')).toHaveValue(
      store.getState().structuralIntegrity,
    );
    expect(screen.getByTestId('aerospace-si-decrease')).toBeDisabled();
    expect(screen.getByTestId('aerospace-si-increase')).toBeDisabled();
  });

  it('leaves a fighter SI unchanged when a button is clicked', () => {
    const store = renderSection(false);
    const before = store.getState().structuralIntegrity;
    fireEvent.click(screen.getByTestId('aerospace-si-increase'));
    expect(store.getState().structuralIntegrity).toBe(before);
    fireEvent.click(screen.getByTestId('aerospace-si-decrease'));
    expect(store.getState().structuralIntegrity).toBe(before);
  });

  it('explains that fighter SI is derived', () => {
    renderSection(false);
    expect(screen.getByTestId('aerospace-si-derived-note')).toHaveTextContent(
      'Derived from the chassis and thrust.',
    );
  });

  it('keeps the stepper editable for a small craft', () => {
    const store = renderSection(true);
    const before = store.getState().structuralIntegrity;
    expect(screen.getByTestId('aerospace-si-increase')).toBeEnabled();
    fireEvent.click(screen.getByTestId('aerospace-si-increase'));
    expect(store.getState().structuralIntegrity).toBe(before + 1);
    fireEvent.click(screen.getByTestId('aerospace-si-decrease'));
    expect(store.getState().structuralIntegrity).toBe(before);
    expect(screen.queryByTestId('aerospace-si-derived-note')).toBeNull();
  });

  it('still honours readOnly for a small craft', () => {
    renderSection(true, true);
    expect(screen.getByTestId('aerospace-si-increase')).toBeDisabled();
    expect(screen.getByTestId('aerospace-si-decrease')).toBeDisabled();
  });
});
