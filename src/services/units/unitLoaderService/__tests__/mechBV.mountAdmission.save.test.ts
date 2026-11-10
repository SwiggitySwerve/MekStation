import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCalculationService } from '@/services/construction/CalculationService';
import {
  buildEditableMechBVInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { Era } from '@/types/temporal/Era';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';
import { applyMechMachineGunArrays } from '@/utils/construction/mechBV/machineGunArrays';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import type { WeaponEntry } from '../../../../../scripts/validate-bv-calculator-weapons';

import { isArmLoc } from '../../../../../scripts/validate-bv-unit-derived';
import { isWeaponEquip } from '../../../../../scripts/validate-bv-weapon-resolution';
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

const loader = new UnitLoaderService();
const load = (file: string) =>
  loader.mapToUnitState(
    parseUnit(
      JSON.parse(
        readFileSync(
          join(process.cwd(), 'public/data/units/battlemechs', file),
          'utf8',
        ),
      ),
    ),
    true,
  );
const editable = (state: ReturnType<typeof load>) =>
  projectEditableMech(
    state,
    Math.floor(state.engineRating / state.tonnage),
    state.id,
  );
const carbine =
  '6-dark-age/advanced/Carbine CON-9M-JB ConstructionMech MOD.json';

// Java totals: coord1 baseline-3e96c2283 terms/delta-rows.jsonl, joined by MTF path/hash.
it.each([
  ['4-clan-invasion/advanced/Loki C.json', 2076],
  ['4-clan-invasion/advanced/Loki F.json', 1839],
  [carbine, 302],
  ['1-age-of-war/standard/Flea FLE-15.json', 430],
  ['1-age-of-war/standard/Flea FLE-4.json', 432],
] as const)(
  'retains Java BV through real load/save/reopen: %s',
  (file, javaBV) => {
    const state = load(file);
    const service = getCalculationService();
    expect(service.calculateBattleValue(editable(state))).toBe(javaBV);
    const saved = serializeCustomUnitState(state, {
      id: 'custom-mount-admission',
      chassis: state.chassis,
      variant: state.model,
      era: Era.DARK_AGE,
    });
    const reopened = loader.mapToUnitState(
      parseUnit(JSON.parse(JSON.stringify(saved))),
      false,
    );
    expect(service.calculateBattleValue(editable(reopened))).toBe(javaBV);
  },
);

it('excludes an ammunition mount even when its id is a weapon id', () => {
  expect(isWeaponEquip('clan-streak-srm-6', EquipmentCategory.AMMUNITION)).toBe(
    false,
  );
  expect(
    isWeaponEquip('clan-streak-srm-6', EquipmentCategory.MISSILE_WEAPON),
  ).toBe(true);
});

it.each(['Left Arm', 'LEFT_ARM', 'LA', 'Right Arm', 'RIGHT_ARM', 'RA'])(
  'recognizes the arm location %s',
  (location) => expect(isArmLoc(location)).toBe(true),
);

it.each([
  'Left Torso',
  'LEFT_LEG',
  'CT',
  'Unallocated',
  'FRONT_LEFT_LEG',
  'FRONT_RIGHT_LEG',
])('does not classify %s as an arm', (location) =>
  expect(isArmLoc(location)).toBe(false),
);

it('gives an editor-added catalog heavy MG array its linked-gun bonus', () => {
  const state = load(carbine);
  const array = state.equipment.find(
    (mount) => mount.equipmentId === 'ishmga-registry',
  );
  expect(array).toBeDefined();
  if (!array) throw new Error('Carbine array missing');
  // A new instance has no source row; projection must use its editor catalog identity.
  state.equipment = state.equipment.map((mount) =>
    mount === array ? { ...mount, instanceId: 'editor-added-array' } : mount,
  );
  const input = buildEditableMechBVInput(editable(state));
  const result = calculateUnitBV(input, input.id);
  expect(result.bv).toBe(302);
  expect(result.breakdown?.weaponMountBV).toContainEqual(
    expect.objectContaining({
      name: 'ishmga-registry',
      bv: 16.080000000000002,
    }),
  );
});

it('carries category for newly added ammunition through the BV consumer', () => {
  const state = load('4-clan-invasion/advanced/Loki C.json');
  state.equipment = state.equipment.map((mount) =>
    mount.category === EquipmentCategory.AMMUNITION
      ? { ...mount, instanceId: `new-${mount.instanceId}` }
      : mount,
  );
  const input = buildEditableMechBVInput(editable(state));
  expect(
    input.equipment.some(
      (mount) => mount.category === EquipmentCategory.AMMUNITION,
    ),
  ).toBe(true);
  expect(calculateUnitBV(input, input.id).bv).toBe(2076);
});

it.each([
  ['ismga-registry', 'machine-gun'],
  ['islmga-registry', 'light-machine-gun'],
  ['ishmga-registry', 'heavy-machine-gun'],
  ['mga', 'machine-gun'],
  ['lmga', 'light-machine-gun'],
  ['hmga', 'heavy-machine-gun'],
])('links the exact catalog array %s to its own caliber', (id, gun) => {
  const input = buildEditableMechBVInput(editable(load(carbine)));
  input.equipment = [{ id, location: 'RIGHT_ARM' }];
  input.criticalSlots = undefined;
  const weapons: WeaponEntry[] = Array.from({ length: 4 }, () => ({
    id: gun,
    name: gun,
    heat: 0,
    bv: 6,
    rear: false,
    hasAES: false,
    isDirectFire: false,
    location: 'RIGHT_ARM',
  }));
  applyMechMachineGunArrays(input, weapons);
  expect(weapons).toHaveLength(5);
  expect(weapons[4].bv).toBeCloseTo(16.08, 8);
});

it('keeps arbitrary noncatalog array spellings outside the closed policy', () => {
  const input = buildEditableMechBVInput(editable(load(carbine)));
  input.equipment = [{ id: 'ISHeavyMGA:OMNI', location: 'RIGHT_ARM' }];
  const weapons: WeaponEntry[] = [
    {
      id: 'heavy-machine-gun',
      name: 'heavy-machine-gun',
      heat: 0,
      bv: 6,
      rear: false,
      hasAES: false,
      isDirectFire: false,
      location: 'RIGHT_ARM',
    },
  ];
  applyMechMachineGunArrays(input, weapons);
  expect(weapons).toHaveLength(1);
});
