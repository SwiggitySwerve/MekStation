/**
 * ProtoMech Main Gun tab, driven through real stores built by the production
 * mapper from real catalog units (no store mocks).
 *
 * MegaMekLab 62bf193 PMChassisView exposes the Main Gun mount as a checkbox;
 * the weapons in it are assigned through its Equipment and Assign Criticals
 * tabs. The limits shown here come from TestProtoMek.maxSlotsByLocation
 * (MegaMek 48fcb2f64): one slot, two for a quad that is also ultraheavy.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import { ProtoMechStructureTab } from '@/components/customizer/protomech/ProtoMechStructureTab';
import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import {
  createProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';
import { IEquipmentItem } from '@/types/equipment';

import { ProtoMechMainGunTab } from '../ProtoMechMainGunTab';

type Store = ReturnType<typeof createProtoMechStore>;

function unit(file: string): Store {
  const definition = JSON.parse(
    fs
      .readFileSync(
        path.join(process.cwd(), 'public/data/units/protomechs', file),
        'utf8',
      )
      .replace(/^﻿/, ''),
  );
  return createProtoMechStore(mapProtoMechDefinitionToState(definition));
}

function renderWith(
  store: Store,
  ui: React.ReactElement = <ProtoMechMainGunTab />,
): void {
  render(
    <ProtoMechStoreContext.Provider value={store}>
      {ui}
    </ProtoMechStoreContext.Provider>,
  );
}

const mountsAt = (store: Store, location: L) =>
  store.getState().equipment.filter((m) => m.location === location);

describe('ProtoMechMainGunTab', () => {
  it('is a real editor, not the placeholder', () => {
    renderWith(unit('Centaur.json'));
    expect(screen.getByTestId('protomech-main-gun-tab')).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('shows the mount state and contents of a unit that has a Main Gun', () => {
    const store = unit('Centaur.json');
    renderWith(store);
    expect(screen.getByLabelText('Main Gun mount')).toBeChecked();
    expect(screen.getByTestId('protomech-main-gun-slots')).toHaveTextContent(
      '1 / 1',
    );
    expect(screen.getByTestId('protomech-main-gun-contents')).toHaveTextContent(
      'CLERMicroLaser',
    );
  });

  it('shows an unchecked mount with no slots in use for a unit without one', () => {
    renderWith(unit('Basilisk 3.json'));
    expect(screen.getByLabelText('Main Gun mount')).not.toBeChecked();
  });

  it('turns the mount on through the store and opens its slot', () => {
    const store = unit('Basilisk 3.json');
    renderWith(store);
    fireEvent.click(screen.getByLabelText('Main Gun mount'));
    expect(store.getState().hasMainGun).toBe(true);
    expect(store.getState().structureByLocation[L.MAIN_GUN]).toBe(1);
    expect(screen.getByTestId('protomech-main-gun-slots')).toHaveTextContent(
      '0 / 1',
    );
    expect(screen.getByTestId('protomech-main-gun-empty')).toBeInTheDocument();
  });

  it('allows two slots on the quad ultraheavy Boggart (TestProtoMek.java:621)', () => {
    renderWith(unit('Boggart Ultraheavy ProtoMech.json'));
    expect(screen.getByTestId('protomech-main-gun-slots')).toHaveTextContent(
      '1 / 2',
    );
  });

  it('removes a mounted weapon and clears the main gun label with it', () => {
    const store = unit('Centaur.json');
    expect(store.getState().mainGunWeaponId).toBe('CLERMicroLaser');
    renderWith(store);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove CLERMicroLaser from Main Gun',
      }),
    );
    expect(mountsAt(store, L.MAIN_GUN)).toHaveLength(0);
    expect(store.getState().mainGunWeaponId).toBeUndefined();
    expect(screen.getByTestId('protomech-main-gun-slots')).toHaveTextContent(
      '0 / 1',
    );
    expect(screen.getByTestId('protomech-main-gun-empty')).toBeInTheDocument();
  });

  it('keeps the next weapon as the label when one of two is removed', () => {
    const store = unit('Boggart Ultraheavy ProtoMech.json');
    const before = mountsAt(store, L.MAIN_GUN).map((m) => m.equipmentId);
    act(() =>
      store
        .getState()
        .addEquipment(
          { id: 'CLERSmallLaser', name: 'CLERSmallLaser' } as IEquipmentItem,
          L.MAIN_GUN,
        ),
    );
    renderWith(store);
    fireEvent.click(
      screen.getByRole('button', { name: `Remove ${before[0]} from Main Gun` }),
    );
    expect(store.getState().mainGunWeaponId).toBe('CLERSmallLaser');
  });

  it('reports a second weapon on a unit with one slot', () => {
    const store = unit('Centaur.json');
    renderWith(store);
    expect(screen.queryByTestId('protomech-main-gun-errors')).toBeNull();
    act(() =>
      store
        .getState()
        .addEquipment(
          { id: 'CLERSmallLaser', name: 'CLERSmallLaser' } as IEquipmentItem,
          L.MAIN_GUN,
        ),
    );
    expect(screen.getByTestId('protomech-main-gun-errors')).toHaveTextContent(
      'Exceeds 1 slot limit in Main Gun (2 mounted).',
    );
  });

  it('reports contents left in a Main Gun that has been switched off', () => {
    const store = unit('Centaur.json');
    renderWith(store);
    fireEvent.click(screen.getByLabelText('Main Gun mount'));
    expect(store.getState().hasMainGun).toBe(false);
    expect(screen.getByTestId('protomech-main-gun-errors')).toHaveTextContent(
      'Main Gun equipment or armor requires a main-gun mount',
    );
  });

  it('disables the controls when read-only', () => {
    renderWith(unit('Centaur.json'), <ProtoMechMainGunTab readOnly />);
    expect(screen.getByLabelText('Main Gun mount')).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: 'Remove CLERMicroLaser from Main Gun',
      }),
    ).toBeDisabled();
  });
});

describe('ProtoMechStructureTab: Main Gun moved to its own tab', () => {
  it('no longer carries the mount toggle or the hand-written weapon picker', () => {
    renderWith(unit('Centaur.json'), <ProtoMechStructureTab />);
    expect(screen.queryByLabelText('Main Gun mount')).toBeNull();
    expect(screen.queryByText('Main Gun Mount')).toBeNull();
    expect(screen.queryByText('-- select weapon --')).toBeNull();
  });
});
