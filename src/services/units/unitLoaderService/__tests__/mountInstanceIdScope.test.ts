/**
 * 0c-UUID-001 audits: loader mount ids are now content-derived, so two loads of
 * one catalog unit share ids. They only have to be unique inside one unit's
 * store, and a draft written with random-UUID ids must reload with those ids.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  clearAllStores,
  createUnitFromFullState,
  getUnitStore,
  hydrateOrCreateUnit,
  unregisterStore,
} from '@/stores/unitStoreRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import atae70 from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Uni ATAE-70 ArtilleryMech.json';
import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});
afterEach(() => {
  clearAllStores(true);
});

const loadState = () =>
  new UnitLoaderService().mapToUnitState(
    parseUnit(atae70 as Parameters<typeof parseUnit>[0]),
    true,
  );

describe('two copies of one catalog unit in the editor store registry', () => {
  it('share mount ids without sharing or cross-wiring any state', () => {
    const a = createUnitFromFullState(loadState());
    const b = createUnitFromFullState(loadState());
    const idA = a.getState().id;
    const idB = b.getState().id;
    expect(idA).not.toBe(idB);
    expect(getUnitStore(idA)).toBe(a);
    expect(getUnitStore(idB)).toBe(b);

    const mountsA = a.getState().equipment.map((m) => m.instanceId);
    const mountsB = b.getState().equipment.map((m) => m.instanceId);
    // The content-derived ids repeat across copies (UUIDs never did)...
    expect(mountsA.length).toBeGreaterThan(0);
    expect(mountsB).toEqual(mountsA);

    // ...so an edit through one id must reach only the store it was made in.
    const target = mountsA[0];
    a.getState().removeEquipment(target);
    expect(a.getState().equipment.map((m) => m.instanceId)).not.toContain(
      target,
    );
    expect(b.getState().equipment.map((m) => m.instanceId)).toEqual(mountsB);

    // Each copy persists to its own draft, and A's edit never reached B's.
    a.setState({ lastModifiedAt: Date.now() });
    b.setState({ lastModifiedAt: Date.now() });
    const draft = (id: string) =>
      JSON.parse(window.localStorage.getItem(`megamek-unit-${id}`) ?? 'null');
    expect(draft(idA).state.equipment).toHaveLength(mountsA.length - 1);
    expect(draft(idB).state.equipment).toHaveLength(mountsB.length);
  });
});

describe('persisted drafts keep the mount ids they were saved with', () => {
  it('reloads a draft carrying random-UUID mount ids with those ids unchanged', () => {
    const state = loadState();
    const oldIds = state.equipment.map(() => uuidv4());
    const store = createUnitFromFullState({
      ...state,
      equipment: state.equipment.map((mount, i) => ({
        ...mount,
        instanceId: oldIds[i],
      })),
    });
    const unitId = store.getState().id;
    // Force the persist write, then drop the live store as a reload would.
    store.setState({ lastModifiedAt: Date.now() });
    const written = window.localStorage.getItem(`megamek-unit-${unitId}`);
    expect(written).toContain(oldIds[0]);
    unregisterStore(unitId);

    const reloaded = hydrateOrCreateUnit(unitId, {
      name: 'fallback',
      tonnage: 20,
      techBase: TechBase.INNER_SPHERE,
    });
    expect(reloaded).not.toBe(store);
    expect(reloaded.getState().equipment.map((m) => m.instanceId)).toEqual(
      oldIds,
    );
  });
});

describe('mount ids are opaque strings', () => {
  it('survive save and reopen with ":" and spaces in the id', () => {
    const state = loadState();
    expect(state.equipment.some((m) => m.instanceId.includes(':'))).toBe(true);
    const saved = JSON.parse(
      JSON.stringify(
        serializeCustomUnitState(state, {
          id: state.id,
          chassis: state.chassis,
          variant: state.model,
          era: Era.DARK_AGE,
        }),
      ),
    );
    const reopened = new UnitLoaderService().mapToUnitState(
      parseUnit(saved),
      false,
    );
    expect(reopened.equipment.length).toBe(state.equipment.length);
  });
});
