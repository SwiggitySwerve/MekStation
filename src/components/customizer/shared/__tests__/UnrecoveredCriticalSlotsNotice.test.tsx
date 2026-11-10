import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { createUnitStore, UnitStoreContext } from '@/stores/useUnitStore';

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
        .map((item) => item.textContent),
    ).toEqual(
      entries.map(
        ({ text, location, slot }) => `${text} — ${location} [${slot}]`,
      ),
    );
    expect(notices[0]).toHaveTextContent(
      'These critical-slot entries could not be loaded as equipment and will not be kept if you save. Saving will remove them from this design.',
    );
    expect(notices[0]).toHaveTextContent('Why?');
  },
);
