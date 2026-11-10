import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

import {
  classifyCriticalSlotNoticeIdentity,
  CriticalSlotRecoveryResponsibility,
} from '../criticalSlotNoticeEffects';
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

it.each(['Bomb Bay', 'ISBombBay', 'bomb-bay', 'Bomb Bay (OMNIPOD)'])(
  'attributes %s to Celerity without changing its notice kind/rule',
  (lookupToken) => {
    const result = classifyCriticalSlotNoticeIdentity({ lookupToken });
    expect(result.kind).toBe('other');
    expect(result.ruleId).toBe('08-other');
    expect(result.effect.id).toBe('bomb-bay');
    expect(result.effect.responsibility).toBe(
      CriticalSlotRecoveryResponsibility.CELERITY,
    );
  },
);

// COUNT.md:23,39: all seven crit-bearing catalog designs are in Celerity's
// already-supported bomb-bay scope. Notice lengths are from the frozen census.
it.each([
  ['5-civil-war/experimental/Waneta S-WN-1LAM', 4, 10],
  ['5-civil-war/standard/Pwwka S-PW-1LAM', 1, 12],
  ['5-civil-war/standard/Wasp LAM WSP-110', 5, 11],
  ['5-civil-war/standard/Yurei S-YR-1LAM', 1, 12],
  ['2-star-league/advanced/Screamer LAM SCR-1X-LAM', 4, 10],
  ['2-star-league/experimental/Wasp LAM Mk I WSP-100', 5, 10],
  ['2-star-league/standard/Shadow Hawk LAM SHD-X2', 4, 10],
] as const)(
  'keeps recovered bays and the notice count for %s',
  (file, bays, noticeCount) => {
    const source = parseUnit(
      JSON.parse(
        readFileSync(
          join(process.cwd(), 'public/data/units/battlemechs', `${file}.json`),
          'utf8',
        ),
      ),
    );
    const state = new UnitLoaderService().mapToUnitState(source, true);
    const mounts = state.equipment.filter(
      (item) => item.equipmentId === 'bomb-bay',
    );
    expect(mounts).toHaveLength(bays);
    const residual = state.unrecoveredCriticalSlots;
    expect(residual).toHaveLength(noticeCount);
    for (const mount of mounts) {
      expect(mount.slots).toHaveLength(1);
      expect(
        residual?.some(
          (entry) =>
            entry.location === mount.location &&
            mount.slots?.includes(entry.slot),
        ),
      ).toBe(false);
    }
  },
);
