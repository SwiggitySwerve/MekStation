import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { computeNativeTankWeight } from '@/services/units/handlers/vehicleHandlerWeight';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { resolveEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { getNativeEquipmentLookupToken } from '@/utils/construction/equipmentBV/normalization';

import { resolveVehicleClanArmor } from '../armor';
import { getVehicleMountFlags } from '../equipmentMounts';
import reference from './fixtures/frozen-tank-weight-gaps.reference.json';

/** @spec establish-all-unit-data-parity/vehicle-unit-system */
// MegaMek 48fcb2f64: TechConstants:394-398; ArmorType:96-101;
// BLKTankFile:284-304. Only an absent tag inherits the chassis side.
it.each([
  [undefined, false, false],
  [undefined, true, true],
  [-1, true, false],
  [0, true, false],
  [1, true, false],
  [2, false, true],
  [6, false, true],
  [8, false, true],
  [10, false, true],
  [12, false, true],
] as const)(
  'armor technology %s on Clan chassis %s selects Clan=%s',
  (level, clan, expected) => {
    expect(resolveVehicleClanArmor(level, clan)).toBe(expected);
  },
);

it.each([
  ['ISLMGA(ST)', 'islmga'],
  ['ISLMGA', 'islmga'],
  ['islmgast', 'islmga'],
  ['lift-hoist-arresting-hoist', 'lift-hoist-arresting-hoist'],
  ['myomer,-vest', 'myomer,-vest'],
  ['ISLMGA(ST):OMNI', 'islmga'],
  ['Light Machine Gun(ST)', 'light machine gun'],
  ['IS Light Machine Gun Ammo - Full', 'is light machine gun ammo - full'],
])('keeps one guarded native lookup token for %s', (source, token) => {
  expect(getNativeEquipmentLookupToken(source)).toBe(token);
});

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

// Real mm-data 50f7efe bytes and independently observed TestTank terms.
it.each(reference.fixtures)(
  'matches every pinned construction term for $path',
  (fixture) => {
    expect(createHash('sha256').update(fixture.content).digest('hex')).toBe(
      fixture.sourceSha256,
    );
    const parsed = new BlkParserService().parse(fixture.content);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const handler = new VehicleUnitHandler();
    const result = handler.parse(parsed.data.document);
    if (!result.success) throw new Error(JSON.stringify(result.error));
    const unit = result.data.unit;
    const mountsBefore = unit.equipment.map((mount) => ({ ...mount }));
    const weights = computeNativeTankWeight(parsed.data.document, unit);
    const java = fixture.java.terms;
    expect(weights).toMatchObject({
      engine: java.getWeightEngine,
      controls: java.getWeightControls,
      structure: java.getWeightStructure,
      heatSinks: java.getWeightHeatSinks,
      armor: java.getWeightArmor,
      equipment:
        java.getWeightWeapon + java.getWeightAmmo + java.getWeightMiscEquip,
      turret: java.getTankWeightTurret,
      secondaryTurret: java.getTankWeightDualTurret,
      lift: java.getTankWeightLifting,
      powerAmplifiers: java.getWeightPowerAmp,
      carryingSpace: java.getWeightCarryingSpace,
      remaining: unit.tonnage - java.calculateWeight,
      isComplete: true,
      issues: [],
      unresolvedMountIds: [],
    });
    expect(unit.totalWeight).toBe(java.calculateWeight);
    expect(handler.validate(unit).isValid).toBe(fixture.java.valid);
    expect(unit.equipment).toEqual(mountsBefore);
    if (fixture.path.includes('Myrmidon')) {
      const withoutMechanism = computeNativeTankWeight(parsed.data.document, {
        ...unit,
        equipment: unit.equipment.filter(
          (mount) => mount.equipmentId !== 'SponsonTurret',
        ),
      });
      expect(withoutMechanism?.equipment).toBe(11);
      expect(weights?.equipment).toBe(11.5);
      expect(
        computeNativeTankWeight(parsed.data.document, {
          ...unit,
          equipment: unit.equipment.map((mount) =>
            mount.equipmentId === 'ISLMGA(ST)'
              ? { ...mount, equipmentId: 'ISLMGA(ST):OMNI' }
              : mount,
          ),
        })?.equipment,
      ).toBe(11.5);
      expect(
        unit.equipment.filter((mount) => mount.equipmentId === 'ISLMGA(ST)'),
      ).toEqual([
        expect.objectContaining({ isSponsonMounted: true }),
        expect.objectContaining({ isSponsonMounted: true }),
      ]);
    }
  },
);

// Public compatibility identities remain frozen. The native Tank weight adapter
// selects ISLightMGA.java:67-83 (0.5 t) without changing these lookup results.
it.each([
  ['ISLMGA(ST)', 'lmga', 0.25],
  ['ISLMGA', 'islmga-registry', 0.5],
  ['islmgast', 'islmga-registry', 0.5],
  ['ISLMGA(ST):OMNI', 'lmga', 0.25],
  ['lmga', 'lmga', 0.25],
] as const)(
  'retains the public compatibility identity of %s on either chassis side',
  (name, id, weight) => {
    for (const [side, mode] of [
      [TechBase.INNER_SPHERE, TechBaseMode.INNER_SPHERE],
      [TechBase.CLAN, TechBaseMode.CLAN],
    ] as const) {
      expect(
        resolveEquipmentId(name, side, mode, undefined).equipmentDef,
      ).toMatchObject({ id, weight });
    }
  },
);

// Compatibility targets frozen by the catalog guard; other identity corrections
// require their own approval even when the source token carries a Clan prefix.
it.each([
  ['(B) CLArrowIV', 'arrow-iv-launcher'],
  ['(B) CLLBXAC10', 'lb-10-x-ac'],
  ['(B) CLLBXAC20', 'lb-20-x-ac'],
])('retains the frozen IS and Mixed target of %s', (name, expected) => {
  expect(
    resolveEquipmentId(
      name,
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      undefined,
    ).equipmentDef?.id,
  ).toBe(expected);
  expect(
    resolveEquipmentId(name, TechBase.INNER_SPHERE, TechBaseMode.MIXED, [name])
      .equipmentDef?.id,
  ).toBe(expected);
});

it('retains decorator flags, missing equipment and the ammunition namespace', () => {
  expect(
    getVehicleMountFlags('Right Equipment', 'ISLMGA(ST):OMNI'),
  ).toMatchObject({
    isSponsonMounted: true,
    isOmniPodMounted: true,
  });
  const resolve = (name: string) =>
    resolveEquipmentId(
      name,
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      undefined,
    ).equipmentDef;
  expect(resolve('Totally Unknown Array(ST)')).toBeUndefined();
  expect(resolve('IS Missing SRM 6 Ammo:OMNI')).toBeUndefined();
  expect(resolve('IS Ammo SRM-4')?.category).toBe(EquipmentCategory.AMMUNITION);
});
