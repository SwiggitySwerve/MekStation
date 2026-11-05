import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { createMountedEquipment } from '@/types/equipment/MountedEquipment';

import { restoreCriticalSlotEquipment } from '../criticalSlotEquipment';

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

const mount = (isAmmo: boolean) => {
  const definition = getEquipmentLookupService().getMountedById(
    'mrm-20',
    isAmmo,
  );
  if (!definition) throw new Error('Missing real MRM 20 fixture');
  return {
    ...createMountedEquipment(definition, isAmmo ? 'listed-ammo' : 'launcher'),
    location: MechLocation.LEFT_TORSO,
  };
};

// MegaMek 48fcb2f64: MtfFile.java:1052-1056,1133-1149 creates mounts from
// each native equipment type. An ammo bin cannot consume its launcher's cells.
it.each([false, true])(
  'joins an existing mount by ID and ammo category (ammo first: %s)',
  (ammoFirst) => {
    const mapped = ammoFirst
      ? [mount(true), mount(false)]
      : [mount(false), mount(true)];
    const result = restoreCriticalSlotEquipment(
      mapped.map(() => ({ id: 'mrm-20' })),
      mapped,
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      {
        LEFT_TORSO: [
          'IS MRM 20 Ammo (OMNIPOD)',
          'MRM 20',
          'MRM 20',
          'MRM 20',
          'IS MRM 20 Ammo (OMNIPOD)',
        ],
      },
    );

    expect(
      result.filter((item) => item.category !== EquipmentCategory.AMMUNITION),
    ).toEqual([
      expect.objectContaining({
        instanceId: 'launcher',
        criticalSlots: 3,
        slots: [1, 2, 3],
      }),
    ]);
    const ammo = result.filter(
      (item) => item.category === EquipmentCategory.AMMUNITION,
    );
    expect(ammo).toHaveLength(2);
    expect(ammo.map((item) => item.slots)).toEqual([[0], [4]]);
    expect(ammo[0].instanceId).toBe('listed-ammo');
    expect(
      ammo.every(
        (item) =>
          item.equipmentId === 'mrm-20' &&
          item.weight === 1 &&
          item.criticalSlots === 1,
      ),
    ).toBe(true);
    expect(new Set(result.map((item) => item.instanceId)).size).toBe(3);
  },
);

it('keeps direct empty-summary ammo restoration and the caller physicalOnly boundary', () => {
  const cells = { LEFT_TORSO: ['IS MRM 20 Ammo (OMNIPOD)'] };
  const result = restoreCriticalSlotEquipment(
    [],
    [],
    TechBase.INNER_SPHERE,
    TechBaseMode.INNER_SPHERE,
    cells,
  );
  expect(result).toEqual([
    expect.objectContaining({
      equipmentId: 'mrm-20',
      category: EquipmentCategory.AMMUNITION,
      weight: 1,
      criticalSlots: 1,
      slots: [0],
    }),
  ]);
  expect(
    restoreCriticalSlotEquipment(
      [],
      [],
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      cells,
      55,
      true,
    ),
  ).toEqual([]);
});
