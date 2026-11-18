import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import vocabulary from '@/types/formats/mtf-component-vocabulary.json';

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
