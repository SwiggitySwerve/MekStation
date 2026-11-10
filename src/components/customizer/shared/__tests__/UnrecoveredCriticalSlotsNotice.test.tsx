import { render, screen, within, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { createUnitStore, UnitStoreContext } from '@/stores/useUnitStore';

import crewSaveLosses from '../../../../../e2e/fixtures/mech-crew-save-losses.json';
import starLeagueCrab from '../../../../../public/data/units/battlemechs/2-star-league/advanced/King Crab KGC-000.json';
import crab from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/King Crab KGC-0000.json';
import celerity from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Celerity CLR-03-O.json';
import scarecrow from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Scarecrow UCU-F4.json';
import uni from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Uni ATAE-70 ArtilleryMech.json';
import { EditorLoadDiagnostics } from '../UnrecoveredCriticalSlotsNotice';

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

it.each([
  ['triskelion-trk-4v', undefined],
  ['triskelion-trk-4v', 105],
  ['poseidon-psd-v2', undefined],
  ['boreas-a', undefined],
] as const)(
  'matches the pinned crew-dialog groups for %s at %s tons',
  (id, tonnage) => {
    const pinned = crewSaveLosses.units[id];
    const source = parseUnit(
      JSON.parse(readFileSync(join(process.cwd(), pinned.sourcePath), 'utf8')),
    );
    const store = createUnitStore(
      new UnitLoaderService().mapToUnitState(source, true),
    );
    if (tonnage !== undefined) store.getState().setTonnage(tonnage);
    expect(store.getState().unrecoveredCriticalSlots).toEqual(pinned.entries);
    render(
      <UnitStoreContext.Provider value={store}>
        <EditorLoadDiagnostics />
      </UnitStoreContext.Provider>,
    );
    const region = screen.getByRole('region', {
      name: 'Unrecovered critical-slot entries',
    });
    const indexes = pinned.noticeGroups.flatMap((group) =>
      group.kinds.flatMap((kind) => kind.entryIndexes),
    );
    expect(indexes.slice().sort((a, b) => a - b)).toEqual(
      pinned.entries.map((_, i) => i),
    );
    const entryText = (index: number) => {
      const { text, location, slot } = pinned.entries[index];
      return `${text} — ${location} [${slot}]`;
    };
    expect(
      within(region)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(indexes.map(entryText));
    expect(
      within(region)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(
      pinned.noticeGroups.map(
        (group) =>
          `${group.title} (${group.kinds.flatMap((kind) => kind.entryIndexes).length})`,
      ),
    );
    for (const group of pinned.noticeGroups) {
      for (const kind of group.kinds) {
        const heading = within(region).getByRole('heading', {
          level: 4,
          name: `${kind.title} (${kind.entryIndexes.length})`,
        });
        const kindSection = heading.parentElement;
        if (!kindSection) throw new Error('Missing notice kind section');
        expect(
          within(kindSection)
            .getAllByRole('listitem')
            .map((item) => item.textContent),
        ).toEqual(kind.entryIndexes.map(entryText));
      }
    }
  },
);

it.each([
  [scarecrow, 13, 0],
  [celerity, 3, 0],
  [uni, 21, 0],
  [starLeagueCrab, 2, 0],
] as const)(
  'shows effect groups and counts for $chassis $model',
  (source, other, markers) => {
    const state = new UnitLoaderService().mapToUnitState(
      parseUnit(source),
      true,
    );
    render(
      <UnitStoreContext.Provider value={createUnitStore(state)}>
        <EditorLoadDiagnostics />
      </UnitStoreContext.Provider>,
    );
    const criticalNotice = within(
      screen.getByRole('note', {
        name: 'Critical-slot entries lost on save',
      }),
    );
    const headings = criticalNotice
      .getAllByRole('heading')
      .map((h) => h.textContent);
    expect(headings[0]).toBe(`Other critical-slot entries (${other})`);
    if (markers)
      expect(headings).toContain(`Placement markers only (${markers})`);
    else
      expect(
        headings.some((h) => h?.startsWith('Placement markers only')),
      ).toBe(false);
    expect(criticalNotice.getAllByRole('listitem')).toHaveLength(
      other + markers,
    );
  },
);

it.each([scarecrow, celerity, uni, crab])(
  'shows one exact loader-owned notice on open for $chassis $model',
  (source) => {
    const state = new UnitLoaderService().mapToUnitState(
      parseUnit(source),
      true,
    );
    const store = createUnitStore(state);
    render(
      <UnitStoreContext.Provider value={store}>
        <EditorLoadDiagnostics />
      </UnitStoreContext.Provider>,
    );
    const entries = state.unrecoveredCriticalSlots ?? [];
    if (entries.length === 0) {
      expect(screen.queryByRole('note')).toBeNull();
      return;
    }
    const notices = screen.getAllByRole('note', {
      name: 'Critical-slot entries lost on save',
    });
    expect(notices).toHaveLength(1);
    expect(
      within(notices[0])
        .getAllByRole('listitem')
        .map((item) => item.textContent)
        .sort(),
    ).toEqual(
      entries
        .map(({ text, location, slot }) => `${text} — ${location} [${slot}]`)
        .sort(),
    );
    expect(notices[0]).toHaveTextContent(
      'These critical-slot entries could not be loaded as equipment and will not be kept if you save. Saving will remove them from this design.',
    );
    expect(notices[0]).toHaveTextContent('Why?');
  },
);

it('refreshes an older draft against its actual allocations without hiding an unrecovered marker or overwriting edits', async () => {
  const source = parseUnit({
    ...crab,
    equipment: [],
    criticalSlots: { LEFT_TORSO: ['IS Ferro-Fibrous'] },
  });
  const state = new UnitLoaderService().mapToUnitState(source, true);
  // An old browser draft genuinely has no allocation rows, even though a new
  // canonical load can now recover them. Keep its user edits intact.
  const store = createUnitStore({
    ...state,
    equipment: [],
    model: 'edited legacy variant',
    unrecoveredCriticalSlots: undefined,
  });
  render(
    <UnitStoreContext.Provider value={store}>
      <EditorLoadDiagnostics />
    </UnitStoreContext.Provider>,
  );
  await waitFor(() =>
    expect(store.getState().unrecoveredCriticalSlots).toEqual([
      { text: 'IS Ferro-Fibrous', location: 'Left Torso', slot: 0 },
    ]),
  );
  expect(
    screen.getByRole('note', { name: 'Critical-slot entries lost on save' }),
  ).toHaveTextContent('IS Ferro-Fibrous');
  expect(store.getState().equipment).toEqual([]);
  expect(store.getState().model).toBe('edited legacy variant');
});
