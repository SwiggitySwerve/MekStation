import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import vocabulary from '@/types/formats/mtf-component-vocabulary.json';
import {
  isLegacyEquipmentId,
  isRegistryEquipment,
} from '@/utils/construction/equipmentBVCatalogData';

import { recognizeCriticalSlotEntries } from '../criticalSlotEquipment';
import {
  classifyCriticalSlotNoticeIdentity,
  CriticalSlotRecoveryResponsibility,
} from '../criticalSlotNoticeEffects';

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

const IS = {
  equipment: [],
  unitTechBase: TechBase.INNER_SPHERE,
  unitTechBaseMode: TechBaseMode.INNER_SPHERE,
  tonnage: 50,
};

describe('criticalSlotEquipment vocabulary rows', () => {
  const rows = vocabulary.criticalSlotEquipment.flatMap((row) =>
    row.spellings.map((spelling) => [spelling, row.id] as const),
  );
  it.each(rows)(
    '%s resolves exactly to %s and is a PR-D CASE/electronics kind',
    (spelling, id) => {
      const [cell] = recognizeCriticalSlotEntries({
        ...IS,
        unitTechBaseMode: TechBaseMode.MIXED,
        criticalSlots: { LEFT_TORSO: [spelling] },
      }).cells;
      expect(cell.equipmentId).toBe(id);
      expect(['case', 'electronics']).toContain(cell.kind);
      expect(
        classifyCriticalSlotNoticeIdentity({
          lookupToken: cell.lookupToken,
          equipmentId: cell.equipmentId,
          equipmentName: cell.definition?.name,
          equipmentCategory: cell.definition?.category,
        }).effect.responsibility,
      ).toBe(CriticalSlotRecoveryResponsibility.PR_D);
    },
  );
});

type IVocabularyRow = { readonly id: string; readonly mountAs?: string };

/** mountAs iff the resolved id is a registry stub; it names a mountable item. */
function mountAsViolations(rows: readonly IVocabularyRow[]): string[] {
  return rows.flatMap((row) => {
    const stub = isRegistryEquipment(row.id);
    if (stub && row.mountAs === undefined)
      return [`${row.id}: registry stub without mountAs`];
    if (!stub && row.mountAs !== undefined)
      return [`${row.id}: mountAs on a non-stub row`];
    if (
      row.mountAs !== undefined &&
      (!isLegacyEquipmentId(row.mountAs) ||
        !getEquipmentLookupService().getById(row.mountAs))
    )
      return [`${row.id}: mountAs ${row.mountAs} is not mountable equipment`];
    return [];
  });
}

describe('mountAs guard', () => {
  const rows: readonly IVocabularyRow[] = vocabulary.criticalSlotEquipment;
  it('holds on every committed row', () => {
    expect(mountAsViolations(rows)).toEqual([]);
  });
  it('rejects a registry-stub row without mountAs', () => {
    const tc = rows.find((row) => row.mountAs !== undefined)!;
    expect(mountAsViolations([{ id: tc.id }])).toEqual([
      `${tc.id}: registry stub without mountAs`,
    ]);
  });
  it('rejects mountAs on a non-stub row', () => {
    expect(
      mountAsViolations([{ id: 'guardian-ecm', mountAs: 'guardian-ecm' }]),
    ).toEqual(['guardian-ecm: mountAs on a non-stub row']);
  });
  it.each(['istargeting-computer-registry', 'no-such-equipment'])(
    'rejects mountAs naming %s',
    (target) => {
      expect(
        mountAsViolations([
          { id: 'cltargeting-computer-registry', mountAs: target },
        ]),
      ).toEqual([
        `cltargeting-computer-registry: mountAs ${target} is not mountable equipment`,
      ]);
    },
  );
});
