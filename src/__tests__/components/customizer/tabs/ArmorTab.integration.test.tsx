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
  // The app's "x / y" ratio: the Allocated label already says what it is.
  expect(screen.getByText('307 / 307')).toBeInTheDocument();
  expect(screen.queryByText(/\/ 307 max/)).toBeNull();
  // The Standard diagram adds no third copy of the totals or the unallocated
  // readout; the summary strip and the inspector row below carry them.
  const diagram = within(screen.getByTestId('armor-diagram'));
  expect(diagram.queryByText(/307/)).toBeNull();
  expect(diagram.queryByText(/points$/)).toBeNull();
  expect(
    screen.getByText('Unallocated Armor Points').parentElement,
  ).toHaveTextContent('5');
  // Leftover points are a warning: warning orange with its icon, not amber.
  const unallocated = screen.getByTestId('armor-unallocated-points');
  expect(unallocated).toHaveClass('text-warning');
  expect(unallocated).not.toHaveClass('text-amber-400');
  expect(
    unallocated.querySelector('[data-severity-icon="warning"]'),
  ).not.toBeNull();
  expect(
    screen.getByRole('button', { name: 'Auto Allocate (0 pts)' }),
  ).toBeDisabled();
  // 5 points are unallocated but cannot be placed: the button explains why.
  const reason = screen.getByText('All allocatable points assigned');
  expect(reason).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Auto Allocate (0 pts)' }),
  ).toHaveAccessibleDescription('All allocatable points assigned');
  expect(store.getState().armorAllocation).toBe(before);
});

test('states why Auto Allocate is disabled when every point is already assigned', () => {
  const store = createNewUnitStore({
    name: 'Atlas armor assigned',
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

  const button = screen.getByRole('button', { name: /^Auto Allocate/ });
  expect(button).toBeDisabled();
  expect(
    screen.getByText('Unallocated Armor Points').parentElement,
  ).toHaveTextContent('0');
  // A disabled button always shows its reason beside it, in secondary text.
  const reason = screen.getByTestId('armor-auto-allocate-reason');
  expect(reason).toHaveTextContent('All points assigned');
  expect(reason).toHaveClass('text-text-theme-secondary');
  expect(button).toHaveAccessibleDescription('All points assigned');
});

test('labels Maximize Tonnage with what it adds and shows tonnage in tonnes', () => {
  const store = createNewUnitStore({
    name: 'Atlas maximize',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
  });
  store.getState().setArmorTonnage(19);
  store.getState().autoAllocateArmor();
  const view = render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  // 19.5 t buys 312 points, but only 307 fit the chassis: +3 usable points.
  const maximize = screen.getByRole('button', {
    name: 'Maximize Tonnage (+0.5 t, +3 pts)',
  });
  expect(maximize).toBeEnabled();
  const tonnage = screen.getByRole('spinbutton', { name: 'Armor Tonnage' });
  expect(tonnage).toHaveValue(19);
  expect(tonnage).toHaveDisplayValue('19.0');

  fireEvent.click(maximize);
  expect(store.getState().armorTonnage).toBe(19.5);
  expect(
    screen.getByRole('button', { name: 'Maximize Tonnage' }),
  ).toBeDisabled();
  expect(tonnage).toHaveDisplayValue('19.5');
  view.unmount();
});

test('joins the Armor Tonnage stepper and keeps typed text while editing', () => {
  const store = makeStore();
  render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  const tonnage = screen.getByRole('spinbutton', { name: 'Armor Tonnage' });
  expect(tonnage).toHaveDisplayValue('10.0');
  fireEvent.click(
    screen.getByRole('button', { name: 'Increase armor tonnage' }),
  );
  expect(store.getState().armorTonnage).toBe(10.5);
  expect(tonnage).toHaveDisplayValue('10.5');
  fireEvent.click(
    screen.getByRole('button', { name: 'Decrease armor tonnage' }),
  );
  expect(store.getState().armorTonnage).toBe(10);

  // Typing commits each edit but shows the typed text until the field blurs.
  fireEvent.focus(tonnage);
  fireEvent.change(tonnage, { target: { value: '8' } });
  expect(store.getState().armorTonnage).toBe(8);
  expect(tonnage).toHaveDisplayValue('8');
  fireEvent.blur(tonnage);
  expect(tonnage).toHaveDisplayValue('8.0');
});

test('shows no Auto Allocate reason while the button is enabled', () => {
  render(
    <UnitStoreContext.Provider value={makeStore()}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );

  expect(screen.getByRole('button', { name: /^Auto Allocate/ })).toBeEnabled();
  expect(
    screen.queryByTestId('armor-auto-allocate-reason'),
  ).not.toBeInTheDocument();
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
    'Center Torso armor: 32 of 32 points, front 24, rear 8',
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
    screen.getByRole('spinbutton', { name: 'Armor Tonnage' }),
  ).toBeDisabled();
  expect(screen.getByRole('combobox', { name: 'Armor Type' })).toBeDisabled();
  const allocate = screen.getByRole('button', { name: /Auto Allocate/ });
  expect(allocate).toBeDisabled();
  expect(allocate).toHaveAccessibleDescription(
    'Read-only: armor cannot be changed.',
  );
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
  expect(screen.getByText('Fill = Points of Max')).toBeInTheDocument();
  act(() =>
    useCustomizerSettingsStore
      .getState()
      .setDraftArmorDiagramVariant('tactical-hud'),
  );
  expect(screen.getByText('HUD')).toBeInTheDocument();
  act(() => useCustomizerSettingsStore.getState().revertCustomizer());
  expect(screen.getByText('Fill = Points of Max')).toBeInTheDocument();
  act(() => {
    useCustomizerSettingsStore.getState().setDraftArmorDiagramMode('schematic');
    useCustomizerSettingsStore.getState().saveCustomizer();
  });
  expect(screen.queryByText('Fill = Points of Max')).not.toBeInTheDocument();
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
  expect(screen.queryByText('Fill = Points of Max')).not.toBeInTheDocument();
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
    expect(allocate).toHaveAccessibleDescription('All points assigned');
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
    '304 pts from 19.0 t · 3 more need +0.5 t',
  );
});

test('keeps the click and keyboard instructions for screen readers only', () => {
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
  // The FRONT and REAR headers replace the old visible caption.
  expect(screen.queryByText(/click a location to edit/i)).toBeNull();
  expect(screen.queryByText(/^(Left|Right)$/)).toBeNull();
  expect(
    screen.getByText(/Tab to a location or move between locations/),
  ).toHaveClass('sr-only');
});

test('every biped location shows its max and torsos show one total against the location max', () => {
  const store = makeStore();
  const { container } = render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );

  // Every front plate uses one stack: the armor value with its " / max"
  // lighter on the same baseline (head, four limbs and three torso totals);
  // front torsos add their front share under it.
  const frontValues = Array.from(
    container.querySelectorAll('[data-testid="armor-diagram"] text'),
  ).filter((node) => /^\d+ \/ \d+$/.test(node.textContent ?? ''));
  expect(frontValues).toHaveLength(8);
  for (const value of frontValues) {
    expect(value.querySelectorAll('tspan')).toHaveLength(1);
    expect(value.querySelector('tspan')?.textContent).toMatch(/^ \/ \d+$/);
  }
  const headButton = screen.getByRole('button', { name: /^Head armor:/ });
  expect(headButton).toHaveTextContent(/\d+ \/ \d+/);
  // No torso cell carries a total line any more.
  expect(container.querySelector('[data-armor-total]')).toBeNull();
  // Torso: 32-point location holding 20 front and 8 rear. The front plate
  // shows the 28 total against the one location max with "F 20" under it,
  // and the rear inset plate shows "R 8"; no per-side maximum is drawn.
  const faces = (location: MechLocation) =>
    Array.from(
      container.querySelectorAll(`[data-armor-face-location="${location}"]`),
    ).map((node) => node.textContent);
  expect(faces(MechLocation.CENTER_TORSO)).toEqual(['F 20', 'R 8']);
  expect(
    container.querySelector('[data-armor-total-location="Center Torso"]')
      ?.textContent,
  ).toBe('28 / 32');
  expect(container.querySelectorAll('[data-armor-face]')).toHaveLength(6);

  // The location editor uses one header pattern for every location: plain
  // Front / Rear labels (the values sit in the inputs) and one total against
  // the location max; the sliders keep the face-maximum ranges.
  fireEvent.click(screen.getByRole('button', { name: /^Center Torso armor:/ }));
  const editor = within(screen.getByTestId('location-armor-editor'));
  expect(editor.getByText('Front')).toBeInTheDocument();
  expect(editor.getByText('Rear')).toBeInTheDocument();
  expect(editor.queryByText(/^max \d+/i)).toBeNull();
  expect(editor.getByText('Total')).toBeInTheDocument();
  expect(editor.getByText(/^28/)).toHaveTextContent('28 / 32');
  const sliders = editor.getAllByRole('slider');
  expect(sliders.map((slider) => slider.getAttribute('max'))).toEqual([
    '24',
    '12',
  ]);
});

test('marks the location the low-armor warning names on its plates and list row', () => {
  jest.useFakeTimers();
  try {
    const store = createNewUnitStore({
      name: 'Atlas low arm',
      tonnage: 100,
      techBase: TechBase.INNER_SPHERE,
    });
    store.getState().setArmorTonnage(19);
    store.getState().autoAllocateArmor();
    store.getState().setLocationArmor(MechLocation.LEFT_ARM, 12);
    const { container } = render(
      <UnitStoreContext.Provider value={store}>
        <ArmorTab />
      </UnitStoreContext.Provider>,
    );
    // Validation is debounced like the issue banner it agrees with.
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const plates = screen.getAllByRole('button', {
      name: /^Left Arm armor: 12 of 34 points, low armor warning$/,
    });
    expect(plates).toHaveLength(1);
    expect(plates[0]).toHaveClass('isWarning');
    expect(
      plates[0].querySelector('[data-armor-issue="warning"]'),
    ).not.toBeNull();
    const row = screen.getByRole('button', {
      name: 'Left Arm: front 12, total 12 of 34, low armor warning',
    });
    expect(row.querySelector('[data-severity-icon="warning"]')).not.toBeNull();
    // Only the flagged location carries a status mark.
    expect(container.querySelectorAll('[data-armor-issue]')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: /^Right Arm armor:/ }),
    ).not.toHaveClass('isWarning');
  } finally {
    jest.useRealTimers();
  }
});

test('the inspector carries the diagram legend on wide layouts for status-colour biped silhouettes only', () => {
  // Standard (Blueprint) encodes coverage by fill height alone, so neither the
  // diagram nor the inspector shows the status-colour legend or the F/R line.
  const standard = render(
    <UnitStoreContext.Provider value={makeStore()}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  expect(screen.queryByTestId('armor-inspector-legend')).toBeNull();
  expect(screen.queryByTestId('armor-allocation-footer')).toBeNull();
  expect(screen.queryByText(/Armor % of max/)).toBeNull();
  expect(screen.queryByText(/F = front/)).toBeNull();
  expect(screen.getAllByText('Fill = Points of Max')).toHaveLength(1);
  standard.unmount();

  useCustomizerSettingsStore.getState().setArmorDiagramVariant('neon-operator');
  const biped = render(
    <UnitStoreContext.Provider value={makeStore()}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  const legend = screen.getByTestId('armor-inspector-legend');
  expect(legend).toHaveClass('hidden', 'xl:flex', 'border-t');
  expect(legend).toHaveTextContent('F = front · R = rear armor');
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
  // Standard (Blueprint) has its own compact list beside the rear inset
  // instead of this table.
  const standard = render(
    <UnitStoreContext.Provider value={store}>
      <ArmorTab />
    </UnitStoreContext.Provider>,
  );
  expect(screen.queryByTestId('armor-location-table')).toBeNull();
  const list = within(screen.getByTestId('armor-location-list'));
  fireEvent.click(list.getByRole('button', { name: /^Center Torso:/ }));
  expect(screen.getByTestId('location-armor-editor')).toBeInTheDocument();
  standard.unmount();

  // The other silhouette styles keep it.
  useCustomizerSettingsStore.getState().setArmorDiagramVariant('neon-operator');
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
    'Total',
  ]);
  const note = table.getByTestId('armor-location-table-note');
  expect(note.closest('thead')).not.toBeNull();
  expect(note).toHaveClass('text-[13px]');
  expect(note).toHaveTextContent('Front + rear share the location max.');
  // Same data as the plates: 20 front, 8 rear, 28 of the 32 max.
  const torsoRow = table
    .getByRole('button', { name: 'Center Torso' })
    .closest('tr') as HTMLElement;
  expect(
    within(torsoRow)
      .getAllByRole('cell')
      .map((c) => c.textContent),
  ).toEqual(['20', '8', '28 / 32']);
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
  const inspector = screen.getByRole('heading', { name: 'Armor Inspector' })
    .parentElement as HTMLElement;
  expect(inspector).toContainElement(
    screen.getByTestId('location-armor-editor'),
  );
  // Below xl everything stays stacked and reachable; from xl the editor takes
  // the controls' place so nothing is pushed below the fold.
  expect(controls).toHaveClass('flex', 'xl:hidden');
  expect(inspector).toContainElement(controls);
  expect(
    screen.getByRole('spinbutton', { name: 'Armor Tonnage' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Unallocated Armor Points')).toBeInTheDocument();
});
