/**
 * ProtoMech Armor tab, driven through a real store (no store mocks).
 *
 * Expected figures are hand-computed from the pinned MegaMek tables, not from
 * the construction owner, so the tests cannot agree with a wrong owner:
 *   TestProtoMek.java (48fcb2f64) MAX_ARMOR_FACTOR = 15,17,22,24,33,...;
 *   maxArmorFactor(weight, mainGun) adds 3 (6 above 9 t) for a main gun;
 *   maxArmorFactor(proto, loc): head 2 + weight/2, arms 2/4/6 (0 on a quad),
 *   other locations 2x original structure, main gun 3x original structure.
 * Original structure comes from ProtoMek.autoSetInternal (structure.ts).
 *
 * MegaMekLab 62bf193 BAProtoArmorView / ArmorAllocationView supply the fields.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ProtoMechStructureTab } from '@/components/customizer/protomech/ProtoMechStructureTab';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import {
  createProtoMechStore,
  createNewProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { ProtoMechArmorTab } from '../ProtoMechArmorTab';

type Store = ReturnType<typeof createNewProtoMechStore>;

it('changes armor through the real store, refreshes BV once, and retains a full torso', () => {
  const state = createDefaultProtoMechState({ tonnage: 5 });
  const equipment = ['one', 'two'].map((id) => ({
    id,
    name: 'Micro Laser',
    equipmentId: 'CLERMicroLaser',
    location: L.TORSO,
  }));
  const store = createProtoMechStore({ ...state, equipment });
  renderWith(store);
  setArmor('Head', 3);
  fireEvent.change(screen.getByLabelText('Armor type'), {
    target: { value: '18' },
  });
  expect(store.getState().armorType).toBe(18);
  expect(store.getState().equipment).toEqual(expect.arrayContaining(equipment));
  expect(store.getState().equipment).toHaveLength(3);
  expect(store.getState().bvBreakdown?.offensiveEquipmentBV).toBe(32);
  expect(screen.getByTestId('protomech-armor-weight')).toHaveTextContent(
    '0.225',
  );
  expect(screen.getByTestId('protomech-armor-errors')).toHaveTextContent(
    'Exceeds 2 slot limit in Torso (3 mounted).',
  );
  fireEvent.change(screen.getByLabelText('Armor type'), {
    target: { value: '42' },
  });
  expect(store.getState().equipment).toEqual(equipment);
  expect(store.getState().bvBreakdown?.offensiveEquipmentBV).toBe(0);
  expect(screen.queryByTestId('protomech-armor-errors')).toBeNull();
});

it('reselecting EDP retains a single armor mount and read-only mode cannot change it', () => {
  const store = createNewProtoMechStore({});
  store.getState().setArmorType(18);
  const mounts = store.getState().equipment;
  store.getState().setArmorType(18);
  expect(store.getState().equipment).toHaveLength(1);
  expect(store.getState().equipment[0].id).toBe(mounts[0]?.id);
  renderWith(store, <ProtoMechArmorTab readOnly />);
  expect(screen.getByLabelText('Armor type')).toBeDisabled();
});

function renderWith(
  store: Store,
  ui: React.ReactElement = <ProtoMechArmorTab />,
): void {
  render(
    <ProtoMechStoreContext.Provider value={store}>
      {ui}
    </ProtoMechStoreContext.Provider>,
  );
}

function setArmor(label: string, value: number): void {
  fireEvent.change(screen.getByLabelText(`${label} armor points`), {
    target: { value: String(value) },
  });
}

function armorOf(store: Store): Record<string, number> {
  return { ...store.getState().armorByLocation };
}

describe('ProtoMechArmorTab: armor panel', () => {
  it('is a real editor, not the placeholder', () => {
    renderWith(createNewProtoMechStore({ tonnage: 5 }));
    expect(screen.getByTestId('protomech-armor-tab')).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('offers the pinned Standard and Experimental EDP armor choices without tech filtering', () => {
    renderWith(createNewProtoMechStore({ tonnage: 5 }));
    const select = screen.getByLabelText('Armor type') as HTMLSelectElement;
    expect(
      Array.from(select.options).map((option) => option.textContent),
    ).toEqual([
      'Standard ProtoMech',
      'Electric Discharge ProtoMech (Experimental)',
    ]);
    expect(select.value).toBe('42');
  });

  it.each([
    // [tonnage, hasMainGun, chassis, expected total cap]
    [2, false, ProtoChassis.BIPED, 15],
    [5, false, ProtoChassis.BIPED, 24],
    [5, true, ProtoChassis.BIPED, 27],
    [9, false, ProtoChassis.BIPED, 42],
    [10, true, ProtoChassis.ULTRAHEAVY, 57],
  ])(
    'shows the pinned total cap for %s t (main gun %s, %s): %s',
    (tonnage, hasMainGun, chassisType, cap) => {
      const store = createNewProtoMechStore({ tonnage, chassisType });
      store.getState().setMainGun(hasMainGun);
      renderWith(store);
      expect(screen.getByTestId('protomech-armor-total-max')).toHaveTextContent(
        String(cap),
      );
    },
  );

  it('shows the running total from the store', () => {
    const store = createNewProtoMechStore({ tonnage: 5 });
    renderWith(store);
    setArmor('Head', 3);
    setArmor('Torso', 7);
    expect(screen.getByTestId('protomech-armor-total-used')).toHaveTextContent(
      '10',
    );
  });
});

describe('ProtoMechArmorTab: allocation', () => {
  it('shows pinned per-location maxima for a 5 t biped', () => {
    renderWith(createNewProtoMechStore({ tonnage: 5 }));
    const max = (loc: L) => screen.getByTestId(`proto-armor-max-${loc}`);
    // head 2 + 5/2, torso 2x5, arms 2 (<6 t), legs 2x3
    expect(max(L.HEAD)).toHaveTextContent('4');
    expect(max(L.TORSO)).toHaveTextContent('10');
    expect(max(L.LEFT_ARM)).toHaveTextContent('2');
    expect(max(L.RIGHT_ARM)).toHaveTextContent('2');
    expect(max(L.LEGS)).toHaveTextContent('6');
    expect(screen.queryByTestId(`proto-armor-max-${L.MAIN_GUN}`)).toBeNull();
  });

  it('shows the maximum armor, not the structure, beside each field', () => {
    renderWith(createNewProtoMechStore({ tonnage: 5 }));
    // Legs structure is 3; the armor maximum is 6.
    expect(
      screen.getByTestId(`proto-armor-max-${L.LEGS}`),
    ).not.toHaveTextContent(/^\s*\/?\s*3\s*$/);
    expect(screen.getByTestId(`proto-armor-max-${L.LEGS}`)).toHaveTextContent(
      '6',
    );
  });

  it('gives a quad no arm armor and 2x quad-leg structure in the legs', () => {
    renderWith(
      createNewProtoMechStore({ tonnage: 5, chassisType: ProtoChassis.QUAD }),
    );
    expect(
      screen.getByTestId(`proto-armor-max-${L.LEFT_ARM}`),
    ).toHaveTextContent('0');
    expect(
      screen.getByTestId(`proto-armor-max-${L.RIGHT_ARM}`),
    ).toHaveTextContent('0');
    // 5 t quad legs structure 5 -> 10
    expect(screen.getByTestId(`proto-armor-max-${L.LEGS}`)).toHaveTextContent(
      '10',
    );
  });

  it('adds a Main Gun row with 3x its structure when the mount is on', () => {
    const store = createNewProtoMechStore({ tonnage: 5 });
    renderWith(store);
    expect(screen.queryByTestId(`proto-armor-max-${L.MAIN_GUN}`)).toBeNull();
    act(() => store.getState().setMainGun(true));
    // 5 t main gun structure 1 -> 3
    expect(
      screen.getByTestId(`proto-armor-max-${L.MAIN_GUN}`),
    ).toHaveTextContent('3');
    expect(screen.getByTestId('protomech-armor-total-max')).toHaveTextContent(
      '27',
    );
  });

  it('writes each location to its own store field', () => {
    const store = createNewProtoMechStore({ tonnage: 5 });
    renderWith(store);
    setArmor('Head', 3);
    setArmor('Torso', 7);
    setArmor('Left Arm', 1);
    setArmor('Right Arm', 2);
    setArmor('Legs', 5);
    expect(armorOf(store)).toMatchObject({
      [L.HEAD]: 3,
      [L.TORSO]: 7,
      [L.LEFT_ARM]: 1,
      [L.RIGHT_ARM]: 2,
      [L.LEGS]: 5,
    });
  });

  it('keeps an over-cap value and reports it, never repairing it', () => {
    const store = createNewProtoMechStore({ tonnage: 5 });
    renderWith(store);
    expect(screen.queryByTestId('protomech-armor-errors')).toBeNull();
    setArmor('Head', 9);
    expect(store.getState().armorByLocation[L.HEAD]).toBe(9);
    expect(screen.getByTestId('protomech-armor-errors')).toHaveTextContent(
      'Head armor 9 exceeds maximum 4',
    );
  });

  it('Auto fills the legal total and Clear empties it', () => {
    const store = createNewProtoMechStore({ tonnage: 5 });
    renderWith(store);
    fireEvent.click(screen.getByRole('button', { name: 'Auto' }));
    const total = Object.values(armorOf(store)).reduce((a, b) => a + b, 0);
    expect(total).toBe(24);
    expect(screen.getByTestId('protomech-armor-total-used')).toHaveTextContent(
      '24',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(Object.values(armorOf(store)).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('refreshes the BV breakdown when armor changes', () => {
    const store = createNewProtoMechStore({ tonnage: 5 });
    renderWith(store);
    const before = store.getState().bvBreakdown;
    setArmor('Torso', 7);
    expect(store.getState().bvBreakdown).not.toEqual(before);
  });

  it('disables every control when read-only', () => {
    renderWith(
      createNewProtoMechStore({ tonnage: 5 }),
      <ProtoMechArmorTab readOnly />,
    );
    expect(screen.getByLabelText('Armor type')).toBeDisabled();
    expect(screen.getByLabelText('Head armor points')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Auto' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });
});

describe('ProtoMechArmorTab: persistence', () => {
  it('keeps edited armor when the unit store is rebuilt from storage', async () => {
    const id = `armor-tab-persist-${Date.now()}`;
    const store = createNewProtoMechStore({ id, tonnage: 5 });
    renderWith(store);
    setArmor('Head', 3);
    setArmor('Legs', 5);

    // The factory returns a plain StoreApi; the persist middleware adds this.
    const reopened = createProtoMechStore(
      createDefaultProtoMechState({ id }),
    ) as Store & { persist: { rehydrate: () => Promise<void> | void } };
    await reopened.persist.rehydrate();
    expect(reopened.getState().armorByLocation).toMatchObject({
      [L.HEAD]: 3,
      [L.LEGS]: 5,
    });
  });
});

describe('ProtoMechStructureTab: armor moved to the Armor tab', () => {
  it('no longer carries the allocation section or armor diagram', () => {
    renderWith(
      createNewProtoMechStore({ tonnage: 5 }),
      <ProtoMechStructureTab />,
    );
    expect(screen.queryByText('Armor Allocation')).toBeNull();
    expect(screen.queryByTestId('protomech-armor-diagram')).toBeNull();
  });
});
