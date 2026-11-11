import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildEditableMechBVInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { EquipmentCategory } from '@/types/equipment';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';
import { migratePortableUnitDocument } from '@/utils/serialization/portableUnitDocument';

import baseline from './fixtures/portable-battlemechs-before-ammo-identity.expected.json';

let mockIdentity = 0;
jest.mock('uuid', () => ({
  v4: () =>
    `00000000-0000-4000-8000-${String(++mockIdentity).padStart(12, '0')}`,
}));
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string, base: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public', base.replace(/^\/+/, ''), file),
        'utf8',
      ),
    ),
}));

it('imports the exact pre-A portable bytes with main-identical state, ammo and BV', async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
  const bytes = readFileSync(
    join(__dirname, 'fixtures/portable-battlemechs-before-ammo-identity.saved'),
  );
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(
    baseline.sourceSha256,
  );
  const original: unknown = JSON.parse(bytes.toString('utf8'));
  const imported = migratePortableUnitDocument(original, {
    family: 'battlemechs',
    id: 'atlas-as7-d',
  });
  expect(imported).toEqual(original);

  // Fix session-only entropy to compare the complete state against plain main,
  // including its source grid, diagnostics and all mounted equipment facts.
  mockIdentity = 0;
  const now = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  try {
    const state = new UnitLoaderService().mapToUnitState(
      parseUnit(imported),
      false,
    );
    const input = buildEditableMechBVInput(
      projectEditableMech(
        state,
        Math.floor(state.engineRating / state.tonnage),
      ),
    );
    const result = calculateUnitBV(input, input.id);
    const facts = {
      stateSha256: createHash('sha256')
        .update(JSON.stringify(state))
        .digest('hex'),
      ammo: state.equipment
        .filter((mount) => mount.category === EquipmentCategory.AMMUNITION)
        .map((mount) => ({
          id: mount.equipmentId,
          category: mount.category,
          techBase: mount.techBase,
          location: mount.location,
          slots: mount.slots,
          weight: mount.weight,
          criticalSlots: mount.criticalSlots,
        })),
      bv: result.bv,
      ammoBV: result.breakdown?.ammoBV,
      ammoPools: result.breakdown?.ammoPools,
    };
    expect(facts).toEqual(baseline.mainImport);
    console.info('LEGACY_PORTABLE_IMPORT', JSON.stringify(facts));
  } finally {
    now.mockRestore();
  }
});
