import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { UnitState } from '@/stores/unitState';

import {
  buildEditableMechBVInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { createMountedEquipment } from '@/types/equipment/MountedEquipment';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';

import { scanCrits } from '../../../../../scripts/validate-bv-crit-scan';
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

// Named-directory read: the budget scanner cuts a double-quoted import at this apostrophe (C5 tool bug).
const vulpes: unknown = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      'public/data/units/battlemechs/6-dark-age/experimental',
      "Vulpes VLP-1DX 'Beast'.json",
    ),
    'utf8',
  ),
);

const loader = new UnitLoaderService();
const load = () => loader.mapToUnitState(parseUnit(vulpes as never), true);
const bv = (state: UnitState) => {
  const input = buildEditableMechBVInput(
    projectEditableMech(state, Math.floor(state.engineRating / state.tonnage)),
  );
  return {
    drone: scanCrits(input, input.id).detectedDroneOS,
    bv: calculateUnitBV(input, input.id).bv,
  };
};

// Pinned Java load BV: Vulpes VLP-1DX 'Beast' = 1229 (BVCalculator.java:296,
// :845-847; MekBVCalculator.java:463-465 at 48fcb2f64).
describe('Vulpes VLP-1DX Drone OS: detection by identity', () => {
  // The editor-add path: a mount added after load is projected under its
  // display name, so detection must come from the mount's equipment id.
  it('keeps the drone modifiers and Java load BV when a Drone OS is added in the editor', () => {
    const loaded = load();
    const def = getEquipmentLookupService().getById('droneoperatingsystem')!;
    const withMount: UnitState = {
      ...loaded,
      equipment: [
        ...loaded.equipment.filter(
          (e) => e.equipmentId !== 'droneoperatingsystem',
        ),
        {
          ...createMountedEquipment(def, 'drone-probe'),
          location: MechLocation.RIGHT_TORSO,
          slots: [6],
        },
      ],
    };
    expect(bv(withMount)).toEqual({ drone: true, bv: 1229 });
  });
});
