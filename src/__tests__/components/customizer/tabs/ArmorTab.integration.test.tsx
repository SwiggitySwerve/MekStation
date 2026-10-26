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

  // The points-from-tonnage line lives in the summary strip only.
  expect(screen.getAllByText(/312 pts from 19.5 t/)).toHaveLength(1);
  expect(screen.getByTestId('armor-points-explanation')).toHaveTextContent(
    '312 pts from 19.5 t',
  );
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
    screen.getByText('Front view · click a location to edit'),
  ).toBeInTheDocument();
  act(() =>
    useCustomizerSettingsStore
      .getState()
      .setDraftArmorDiagramVariant('tactical-hud'),
  );
  expect(screen.getByText('HUD')).toBeInTheDocument();
  act(() => useCustomizerSettingsStore.getState().revertCustomizer());
  expect(
    screen.getByText('Front view · click a location to edit'),
  ).toBeInTheDocument();
  act(() => {
    useCustomizerSettingsStore.getState().setDraftArmorDiagramMode('schematic');
    useCustomizerSettingsStore.getState().saveCustomizer();
  });
  expect(
    screen.queryByText('Front view · click a location to edit'),
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
    screen.queryByText('Front view · click a location to edit'),
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

test('explains the gap between allocated points and the chassis max in plain words', () => {
  const store = createNewUnitStore({
    name: 'Atlas gap',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
  });
  store.getState().setArmorTonnage(19);
  store.getState().autoAllocateArmor();
  render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );

  expect(screen.getByTestId('armor-points-explanation')).toHaveTextContent(
    '304 pts from 19 t · 3 more need +0.5 t',
  );
});

test('shows one short instruction, with the keyboard hint for screen readers only', () => {
  const store = makeStore();
  render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );

  expect(screen.queryByTestId('location-armor-editor-empty')).toBeNull();
  expect(
    screen.queryByText(/Select a location on the diagram/),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('Click a location to edit armor values'),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/Torsos list front/)).not.toBeInTheDocument();
  expect(screen.getAllByText(/click a location to edit/i)).toHaveLength(1);
  expect(screen.getByText(/Tab to a location, then press Enter/)).toHaveClass(
    'sr-only',
  );
});

test('every biped location shows its max and torsos show front and rear against their own maxima', () => {
  const store = makeStore();
  const { container } = render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );

  const diagram = within(screen.getByTestId('armor-diagram'));
  // Every location uses one stack: the front value with its "/max" muted on
  // the same baseline (head, four limbs and three torso fronts); torsos add a
  // rear line under it.
  const frontValues = Array.from(
    container.querySelectorAll('[data-testid="armor-diagram"] text'),
  ).filter((node) => /^\d+\/\d+$/.test(node.textContent ?? ''));
  expect(frontValues).toHaveLength(8);
  for (const value of frontValues) {
    expect(value.querySelectorAll('tspan')).toHaveLength(1);
    expect(value.querySelector('tspan')?.textContent).toMatch(/^\/\d+$/);
  }
  const headButton = screen.getByRole('button', { name: /^Head armor:/ });
  expect(headButton).toHaveTextContent(/\d+\/\d+/);
  // No torso cell carries a total line any more.
  expect(container.querySelector('[data-armor-total]')).toBeNull();
  // Torso: 32-point location holding 20 front and 8 rear. Each face's max is
  // the location max minus what the other face uses (24 front, 12 rear).
  const faces = (location: MechLocation) =>
    Array.from(
      container.querySelectorAll(`[data-armor-face-location="${location}"]`),
    ).map((node) => node.textContent);
  expect(faces(MechLocation.CENTER_TORSO)).toEqual(['20/24', 'R 8/12']);
  expect(container.querySelectorAll('[data-armor-face]')).toHaveLength(6);

  // The location editor derives the same maxima.
  fireEvent.click(screen.getByRole('button', { name: /^Center Torso armor:/ }));
  const editor = within(screen.getByTestId('location-armor-editor'));
  expect(editor.getByText('max 24')).toBeInTheDocument();
  expect(editor.getByText('max 12')).toBeInTheDocument();
  expect(editor.getByText('Total')).toBeInTheDocument();
});

test('the inspector carries the diagram legend on wide layouts for biped silhouettes only', () => {
  const biped = render(
    <UnitStoreContext.Provider value={makeStore()}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  const legend = screen.getByTestId('armor-inspector-legend');
  expect(legend).toHaveClass('hidden', 'xl:flex', 'border-t');
  expect(legend).toHaveTextContent('R = rear armor');
  expect(legend).toHaveTextContent('Armor % of max:');
  expect(legend).toHaveTextContent('60%+');
  // The diagram's own footer steps aside from xl up so the readout is not
  // repeated beside the inspector's Unallocated Armor Points row.
  expect(screen.getByTestId('armor-allocation-footer')).toHaveClass(
    'xl:hidden',
  );
  biped.unmount();

  render(
    <UnitStoreContext.Provider value={makeStore(MechConfiguration.QUAD)}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  expect(screen.queryByTestId('armor-inspector-legend')).toBeNull();
  expect(screen.queryByTestId('armor-allocation-footer')).toBeNull();
});

test('lists every location in a table that selects like the figure', () => {
  const store = makeStore();
  render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );

  const table = within(screen.getByTestId('armor-location-table'));
  // Headers say what each column holds, and the note sits right under them.
  expect(table.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
    'Location',
    'Front',
    'Rear',
    'Max',
  ]);
  const note = table.getByTestId('armor-location-table-note');
  expect(note.closest('thead')).not.toBeNull();
  expect(note).toHaveClass('text-[13px]');
  expect(note).toHaveTextContent('Max is the whole location.');
  // Same data and face maxima as the plates: 20/24 front, 8/12 rear, 32 max.
  const torsoRow = table
    .getByRole('button', { name: 'Center Torso' })
    .closest('tr') as HTMLElement;
  expect(
    within(torsoRow)
      .getAllByRole('cell')
      .map((c) => c.textContent),
  ).toEqual(['20/24', '8/12', '32']);
  const armRow = table
    .getByRole('button', { name: 'Left Arm' })
    .closest('tr') as HTMLElement;
  expect(within(armRow).getByText('No rear armor')).toBeInTheDocument();

  fireEvent.click(table.getByRole('button', { name: 'Center Torso' }));
  expect(screen.getByTestId('location-armor-editor')).toBeInTheDocument();
  expect(table.getByRole('button', { name: 'Center Torso' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(
    screen.getByRole('button', { name: /^Center Torso armor:/ }),
  ).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(table.getByRole('button', { name: 'Center Torso' }));
  expect(screen.queryByTestId('location-armor-editor')).toBeNull();
});

test('the location editor opens inside the inspector and yields the controls on wide layouts', () => {
  const store = makeStore();
  render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  const controls = screen.getByTestId('armor-inspector-controls');
  expect(controls).toHaveClass('flex');
  expect(controls).not.toHaveClass('xl:hidden');

  fireEvent.click(screen.getByRole('button', { name: /^Center Torso armor:/ }));
  const inspector = screen.getByRole('heading', { name: 'Armor inspector' })
    .parentElement as HTMLElement;
  expect(inspector).toContainElement(
    screen.getByTestId('location-armor-editor'),
  );
  // Below xl everything stays stacked and reachable; from xl the editor takes
  // the controls' place so nothing is pushed below the fold.
  expect(controls).toHaveClass('flex', 'xl:hidden');
  expect(inspector).toContainElement(controls);
  expect(
    screen.getByRole('spinbutton', { name: 'Armor tonnage' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Unallocated Armor Points')).toBeInTheDocument();
});
