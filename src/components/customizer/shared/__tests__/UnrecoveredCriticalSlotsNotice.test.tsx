import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { createUnitStore, UnitStoreContext } from '@/stores/useUnitStore';

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
  [scarecrow, 13, 7],
  [celerity, 3, 14],
  [uni, 21, 0],
  [starLeagueCrab, 2, 14],
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
    const headings = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(headings[0]).toBe(`Other critical-slot entries (${other})`);
    if (markers)
      expect(headings).toContain(`Placement markers only (${markers})`);
    else
      expect(
        headings.some((h) => h?.startsWith('Placement markers only')),
      ).toBe(false);
    expect(screen.getAllByRole('listitem')).toHaveLength(other + markers);
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
