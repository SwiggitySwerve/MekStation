/**
 * ProtoMech Equipment tab, driven through real stores: the production unit
 * mapper, the real ProtoMech store, the real equipment store seeded from the
 * real catalog (only the browser's file transport is replaced).
 *
 * MegaMekLab 62bf193 PMEquipmentTab lists the equipment database filtered by
 * ProtoMekUtil.isProtoMekEquipment, and a loadout list without jump jets, MASC,
 * partial wing, magnetic clamp and UMU. Slot and weight limits per location come
 * from TestProtoMek (MegaMek 48fcb2f64) through getProtoPlacementErrors.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '@/services/equipment/EquipmentLookupService';
import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import {
  createProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';
import { Era } from '@/types/temporal/Era';
import { serializeCustomSmallUnitState } from '@/utils/serialization/CustomUnitSerializer.smallUnits';

import { ProtoMechEquipmentTab } from '../ProtoMechEquipmentTab';

// Exercise the official parser and lookup; replace only browser transport.
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (filePath: string) =>
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/equipment/official', filePath),
        'utf8',
      ),
    ),
}));

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
  ui: React.ReactElement = <ProtoMechEquipmentTab />,
): void {
  render(
    <ProtoMechStoreContext.Provider value={store}>
      {ui}
    </ProtoMechStoreContext.Provider>,
  );
}

let protoLaser: IEquipmentItem;
let mechLaser: IEquipmentItem;

beforeAll(async () => {
  getEquipmentLoader().clear();
  resetEquipmentLookupService();
  const service = getEquipmentLookupService();
  await service.initialize();
  const all = service.getAllEquipment();
  const found = all.find(
    (e) =>
      e.category === EquipmentCategory.ENERGY_WEAPON &&
      e.allowedUnitTypes?.includes('ProtoMech') &&
      e.battleValue > 0,
  );
  if (!found) throw new Error('catalog has no ProtoMech energy weapon');
  protoLaser = found;
  // Pinned ISBombastLaser.java:94 removes F_PROTO_WEAPON from the energy default
  // that gives every other laser (the Medium Laser included) to ProtoMechs.
  const excluded = service.getById('bombast-laser');
  if (
    !excluded?.allowedUnitTypes ||
    excluded.allowedUnitTypes.includes('ProtoMech')
  )
    throw new Error(
      'catalog does not exclude the Bombast Laser from ProtoMechs',
    );
  mechLaser = excluded;
});

beforeEach(() => {
  localStorage.clear();
  const equipment = useEquipmentStore.getState();
  equipment.clearFilters();
  equipment.setUnitContext(null, null, []);
  equipment.setEquipment([protoLaser, mechLaser]);
});

const mountsOf = (store: Store, equipmentId: string) =>
  store.getState().equipment.filter((m) => m.equipmentId === equipmentId);

describe('ProtoMechEquipmentTab', () => {
  it('is a real editor, not the placeholder', () => {
    renderWith(unit('Centaur.json'));
    expect(screen.getByTestId('protomech-equipment-tab')).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('offers a ProtoMech weapon and not one the pin excludes from ProtoMechs', () => {
    renderWith(unit('Centaur.json'));
    expect(
      screen.getByRole('button', { name: `Add ${protoLaser.name}` }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: `Add ${mechLaser.name}` }),
    ).toBeNull();
  });

  it('adds the weapon to the store at the Torso and moves the unit BV', () => {
    const store = unit('Centaur.json');
    const before = store.getState().bvBreakdown?.final;
    renderWith(store);
    fireEvent.click(
      screen.getByRole('button', { name: `Add ${protoLaser.name}` }),
    );
    const [mount] = mountsOf(store, protoLaser.id);
    expect(mount.location).toBe(L.TORSO);
    expect(store.getState().bvBreakdown?.final).toBeGreaterThan(before ?? 0);
    expect(
      within(screen.getByTestId('protomech-equipment-mounted')).getByText(
        protoLaser.name,
      ),
    ).toBeInTheDocument();
  });

  it('moves a mount to an arm through the store', () => {
    const store = unit('Centaur.json');
    renderWith(store);
    fireEvent.click(
      screen.getByRole('button', { name: `Add ${protoLaser.name}` }),
    );
    fireEvent.change(screen.getByLabelText(`Location of ${protoLaser.name}`), {
      target: { value: L.RIGHT_ARM },
    });
    expect(mountsOf(store, protoLaser.id)[0].location).toBe(L.RIGHT_ARM);
  });

  it('offers the Main Gun only when the unit has one', () => {
    const withGun = unit('Centaur.json');
    act(() => withGun.getState().addEquipment(protoLaser, L.TORSO));
    renderWith(withGun);
    const options = (label: string) =>
      within(screen.getByLabelText(label))
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value);
    expect(options(`Location of ${protoLaser.name}`)).toEqual([
      L.TORSO,
      L.LEFT_ARM,
      L.RIGHT_ARM,
      L.MAIN_GUN,
    ]);
  });

  it('does not offer the Main Gun without a mount, nor arms on a quad', () => {
    const store = unit('Basilisk ProtoMech (Quad) B.json');
    expect(store.getState().hasMainGun).toBe(false);
    act(() => store.getState().addEquipment(protoLaser, L.TORSO));
    renderWith(store);
    const values = within(
      screen.getByLabelText(`Location of ${protoLaser.name}`),
    )
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value);
    expect(values).toEqual([L.TORSO]);
  });

  it('reports a second slot-taking mount in one arm in the verifier wording', () => {
    const store = unit('Centaur.json');
    renderWith(store);
    expect(screen.queryByTestId('protomech-equipment-errors')).toBeNull();
    act(() => {
      store.getState().addEquipment(protoLaser, L.RIGHT_ARM);
      store.getState().addEquipment(protoLaser, L.RIGHT_ARM);
    });
    expect(screen.getByTestId('protomech-equipment-errors')).toHaveTextContent(
      'Exceeds 1 slot limit in Right Arm (2 mounted).',
    );
  });

  it('lists loadout mounts and hides jump jets, MASC, partial wing, clamp and UMU', () => {
    const store = unit('Centaur.json');
    act(() => {
      for (const id of [
        'ProtoMechJumpJet',
        'ProtoMagneticClamp',
        'ProtoMechPartialWing',
        'ProtoMechMASC',
        'ProtoMechUMU',
      ])
        store.getState().addEquipment({ id, name: id } as IEquipmentItem);
    });
    expect(store.getState().equipment.length).toBeGreaterThan(5);
    renderWith(store);
    const listed = screen.getByTestId('protomech-equipment-mounted');
    expect(listed).toHaveTextContent('CLERMicroLaser');
    expect(listed).toHaveTextContent('EIInterface');
    expect(listed).not.toHaveTextContent(/jump ?jet/i);
    expect(listed).not.toHaveTextContent(/magnetic|partial ?wing|masc|umu/i);
    expect(within(listed).getAllByRole('listitem')).toHaveLength(
      store.getState().equipment.length - 5,
    );
  });

  it('does not list the Electric Discharge armor mount, which the armor type owns', () => {
    const store = unit('Basilisk ProtoMech (Quad) B.json');
    const armorMount = store
      .getState()
      .equipment.find((m) =>
        /electricdischarge/i.test(m.equipmentId.replace(/\W/g, '')),
      );
    expect(armorMount).toBeDefined();
    renderWith(store);
    expect(
      screen.getByTestId('protomech-equipment-mounted'),
    ).not.toHaveTextContent(/electric discharge/i);
    expect(
      screen.queryByRole('button', { name: `Remove ${armorMount?.name}` }),
    ).toBeNull();
  });

  it('removes a mount through the store', () => {
    const store = unit('Centaur.json');
    renderWith(store);
    fireEvent.click(
      screen.getByRole('button', { name: `Add ${protoLaser.name}` }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: `Remove ${protoLaser.name}` }),
    );
    expect(mountsOf(store, protoLaser.id)).toHaveLength(0);
  });

  it('disables add, move and remove when read-only', () => {
    const store = unit('Centaur.json');
    act(() => store.getState().addEquipment(protoLaser, L.TORSO));
    renderWith(store, <ProtoMechEquipmentTab readOnly />);
    expect(
      screen.getByLabelText(`Location of ${protoLaser.name}`),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: `Remove ${protoLaser.name}` }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: `Add ${protoLaser.name}` }),
    );
    expect(mountsOf(store, protoLaser.id)).toHaveLength(1);
  });
});

describe('ProtoMech Equipment edits survive save and reopen', () => {
  it('keeps the added mount and its arm through the serializer and the loader', () => {
    const store = unit('Centaur.json');
    renderWith(store);
    fireEvent.click(
      screen.getByRole('button', { name: `Add ${protoLaser.name}` }),
    );
    fireEvent.change(screen.getByLabelText(`Location of ${protoLaser.name}`), {
      target: { value: L.LEFT_ARM },
    });

    const saved = serializeCustomSmallUnitState(store.getState(), {
      id: 'flow-centaur',
      chassis: 'Flow Centaur',
      variant: 'Equip',
      era: Era.CLAN_INVASION,
    });
    const reopened = mapProtoMechDefinitionToState(
      JSON.parse(JSON.stringify(saved)),
    );

    const mount = reopened.equipment.find(
      (m) => m.equipmentId === protoLaser.id,
    );
    expect(mount?.location).toBe(L.LEFT_ARM);
    expect(reopened.equipment).toHaveLength(store.getState().equipment.length);
  });
});
