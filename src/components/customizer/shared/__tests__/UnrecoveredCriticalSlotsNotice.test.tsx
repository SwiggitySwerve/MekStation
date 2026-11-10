import { render, screen, within, waitFor } from '@testing-library/react';
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
