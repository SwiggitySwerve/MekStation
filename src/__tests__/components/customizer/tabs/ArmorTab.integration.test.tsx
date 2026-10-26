import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { ArmorTab } from '@/components/customizer/tabs/ArmorTab';
import { useCustomizerSettingsStore } from '@/stores/useCustomizerSettingsStore';
import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBase } from '@/types/enums/TechBase';

function makeStore(configuration = MechConfiguration.BIPED) {
  const store = createNewUnitStore({
    name: 'Armor integration',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  store.getState().setConfiguration(configuration);
  store.getState().setArmorTonnage(10);
  store.getState().setLocationArmor(MechLocation.CENTER_TORSO, 20, 8);
  return store;
}

beforeEach(() => {
  useCustomizerSettingsStore.getState().resetToDefaults();
});

test('labels tonnage points, allocated capacity, and unallocated excess distinctly', () => {
  const store = createNewUnitStore({
    name: 'Atlas armor summary',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
  });
  store.getState().setArmorTonnage(19.5);
  store.getState().autoAllocateArmor();
  const before = store.getState().armorAllocation;
  render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );

  expect(screen.getByText('312 pts from 19.5 t')).toBeInTheDocument();
  expect(screen.getByText('307 / 307 max')).toBeInTheDocument();
  expect(
    within(screen.getByTestId('armor-diagram')).getByText('5 points'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Unallocated Armor Points').parentElement,
  ).toHaveTextContent('5');
  expect(
    screen.getByRole('button', { name: 'Auto Allocate (0 pts)' }),
  ).toBeDisabled();
  expect(
    screen.getByText('All allocatable points assigned'),
  ).toBeInTheDocument();
  expect(store.getState().armorAllocation).toBe(before);
});

test('real armor actions enforce shared cap and update the selected SVG values', () => {
  const store = makeStore();
  render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  const torso = screen.getByRole('button', { name: /^Center Torso armor:/ });
  fireEvent.click(torso);
  fireEvent.change(
    screen.getByRole('spinbutton', { name: 'Center Torso front armor' }),
    { target: { value: '24' } },
  );
  fireEvent.change(
    screen.getByRole('spinbutton', { name: 'Center Torso rear armor' }),
    { target: { value: '99' } },
  );
  expect(store.getState().armorAllocation[MechLocation.CENTER_TORSO]).toBe(24);
  expect(store.getState().armorAllocation.centerTorsoRear).toBe(8);
  expect(torso).toHaveAttribute(
    'aria-label',
    'Center Torso armor: 24 of 32, rear: 8 of 8',
  );
  fireEvent.keyDown(torso, { key: ' ' });
  expect(screen.queryByTestId('location-armor-editor')).not.toBeInTheDocument();
});

test('read-only armor remains inspectable without exposing mutations', () => {
  const store = makeStore();
  const before = store.getState().armorAllocation;
  render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab readOnly />
    </UnitStoreContext.Provider>,
  );
  fireEvent.keyDown(
    screen.getByRole('button', { name: /^Center Torso armor:/ }),
    { key: 'Enter' },
  );
  const editor = screen.getByTestId('location-armor-editor');
  for (const input of within(editor).getAllByRole('spinbutton'))
    expect(input).toBeDisabled();
  for (const input of within(editor).getAllByRole('slider'))
    expect(input).toBeDisabled();
  expect(
    screen.getByRole('spinbutton', { name: 'Armor tonnage' }),
  ).toBeDisabled();
  expect(screen.getByRole('combobox', { name: 'Armor type' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Auto Allocate/ })).toBeDisabled();
  expect(store.getState().armorAllocation).toBe(before);
});

test('draft appearance changes can revert or save without mutating armor', () => {
  const store = makeStore();
  const before = store.getState().armorAllocation;
  render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  expect(
    screen.getByText('Front view · rear armor shown inside torso'),
  ).toBeInTheDocument();
  act(() =>
    useCustomizerSettingsStore
      .getState()
      .setDraftArmorDiagramVariant('tactical-hud'),
  );
  expect(screen.getByText('HUD')).toBeInTheDocument();
  act(() => useCustomizerSettingsStore.getState().revertCustomizer());
  expect(
    screen.getByText('Front view · rear armor shown inside torso'),
  ).toBeInTheDocument();
  act(() => {
    useCustomizerSettingsStore.getState().setDraftArmorDiagramMode('schematic');
    useCustomizerSettingsStore.getState().saveCustomizer();
  });
  expect(
    screen.queryByText('Front view · rear armor shown inside torso'),
  ).not.toBeInTheDocument();
  expect(useCustomizerSettingsStore.getState().armorDiagramMode).toBe(
    'schematic',
  );
  expect(store.getState().armorAllocation).toBe(before);
});

test.each([
  MechConfiguration.QUAD,
  MechConfiguration.TRIPOD,
  MechConfiguration.LAM,
  MechConfiguration.QUADVEE,
])('preserves the %s configuration renderer', (configuration) => {
  const store = makeStore(configuration);
  render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  expect(screen.getByTestId('armor-diagram')).toBeInTheDocument();
  expect(
    screen.queryByText('Front view · rear armor shown inside torso'),
  ).not.toBeInTheDocument();
});

test.each([0, 10])(
  'auto allocation remains available for a nonzero delta at %s tons',
  (armorTonnage) => {
    const store = makeStore();
    store.getState().setArmorTonnage(armorTonnage);
    render(
      <UnitStoreContext.Provider value={store}>
        <ArmorTab />
      </UnitStoreContext.Provider>,
    );
    const allocate = screen.getByRole('button', { name: /Auto Allocate/ });
    expect(allocate).toBeEnabled();
    expect(
      screen.queryByText('All allocatable points assigned'),
    ).not.toBeInTheDocument();
    fireEvent.click(allocate);
    expect(allocate).toBeDisabled();
    expect(allocate).toHaveAccessibleDescription(
      'All allocatable points assigned',
    );
  },
);
