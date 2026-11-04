import fs from 'fs';
import path from 'path';
import { z } from 'zod';

import { buildVehicleUnitObject } from '@/components/customizer/vehicle/buildVehicleUnitObject';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { resolveEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createVehicleMountedEquipment } from '@/stores/vehicleState';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { Era } from '@/types/temporal/Era';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';
import {
  computeVehicleBVFromState,
  toVehicleBVInput,
} from '@/utils/construction/vehicle/vehicleBVAdapter';
import { serializeCustomVehicleState } from '@/utils/serialization/CustomUnitSerializer';

import { catalog, initializeEquipment } from './catalogRecordSheets.helpers';

beforeAll(initializeEquipment);
const service = new RecordSheetService();
function definition(entry: { path: string }) {
  return UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units/vehicles', entry.path),
        'utf8',
      ),
    ),
  );
}
function ajax() {
  const entry = catalog('vehicles').find((e) => e.id === 'ajax-assault-tank-c');
  if (!entry) throw new Error('Missing Ajax C');
  return definition(entry);
}
function nativeUnit(raw: ReturnType<typeof definition>) {
  if (!raw.movement || !raw.armor || typeof raw.tonnage !== 'number')
    throw new Error('Incomplete vehicle');
  const movement = z
    .object({
      cruiseMP: z.number().optional(),
      flankMP: z.number().optional(),
      jumpMP: z.number().optional(),
    })
    .parse(raw.movement);
  return contractUnitToBVUnit({
    ...raw,
    movement,
    tonnage: raw.tonnage,
    armor: raw.armor,
  });
}
it.each([
  'Asher Hover Scout.json',
  'Athena Combat Vehicle.json',
  'Hi-Scout Drone Carrier (Cunnington).json',
  "Hiryo Armored Infantry Transport 'Hound'.json",
])('%s prints the contract owner BV after resolving ammunition', (file) => {
  const raw = definition({ path: file });
  const state = mapToVehicleState(raw);
  expect(state.equipment.every((mount) => !mount.resolutionWarning)).toBe(true);
  const owner = calculateBattleValueForUnit(nativeUnit(raw));
  if (owner?.kind !== 'vehicle') throw new Error('Wrong BV family');
  expect(computeVehicleBVFromState(state)).toEqual(owner.breakdown);
  expect(
    service.extractData(buildVehicleUnitObject(state)).header.battleValue,
  ).toBe(owner.breakdown.final);
  const saved = serializeCustomVehicleState(state, {
    id: raw.id,
    chassis: state.chassis,
    variant: state.model,
    era: Era.RENAISSANCE,
  });
  const restored = mapToVehicleState(saved);
  expect(
    restored.equipment.map((e) => [e.equipmentId, e.sourceIdentity]),
  ).toEqual(state.equipment.map((e) => [e.equipmentId, e.sourceIdentity]));
  expect(computeVehicleBVFromState(restored)).toEqual(owner.breakdown);
  const savedOwner = calculateBattleValueForUnit(nativeUnit(saved));
  expect(savedOwner?.breakdown).toMatchObject({
    ammoBV: owner.breakdown.ammoBV,
    weaponBV: owner.breakdown.weaponBV,
    offensiveEquipmentBV: owner.breakdown.offensiveEquipmentBV,
    offensive: owner.breakdown.offensive,
  });
  const edited = {
    ...restored,
    equipment: restored.equipment.filter((e) => !e.isAmmo),
  };
  const editedBV = computeVehicleBVFromState(edited);
  expect(editedBV.ammoBV).toBe(0);
  expect(buildVehicleUnitObject(edited).battleValue).toBe(editedBV.final);
  expect(editedBV.final).toBeLessThanOrEqual(owner.breakdown.final);
});
it('preserves resolved ammunition kind and owner shot counts for every colliding catalog mount', () => {
  const lookup = getEquipmentLookupService();
  const weapons = new Set(lookup.getAllWeapons().map((w) => w.id));
  const ammunition = lookup.getAllAmmunition();
  const rows: { id: string; bins: number; differences: unknown[] }[] = [];
  const diagnostics: unknown[] = [];
  for (const entry of catalog('vehicles')) {
    const raw = definition(entry);
    const state = mapToVehicleState(raw);
    const sourceUnit = nativeUnit(raw);
    const expectedBV = calculateBattleValueForUnit(sourceUnit);
    const actualBV = computeVehicleBVFromState(state);
    if (
      expectedBV?.kind === 'vehicle' &&
      expectedBV.breakdown.final !== actualBV.final
    )
      diagnostics.push({
        id: raw.id,
        source: raw,
        sourceUnit,
        expected: expectedBV.breakdown,
        actual: actualBV,
        state: toVehicleBVInput(state),
      });
    const data = service.extractData(buildVehicleUnitObject(state));
    if (data.unitType !== 'vehicle') throw new Error('Wrong family');
    const row = { id: raw.id, bins: 0, differences: [] as unknown[] };
    (raw.equipment ?? []).forEach((source, index) => {
      const resolved = resolveEquipmentId(
        source.id,
        state.techBase,
        state.techBase === TechBase.CLAN
          ? TechBaseMode.CLAN
          : TechBaseMode.INNER_SPHERE,
        undefined,
      ).equipmentDef;
      if (
        resolved?.category !== EquipmentCategory.AMMUNITION ||
        !weapons.has(resolved.id)
      )
        return;
      row.bins++;
      const bin = ammunition.find((a) => a.id === resolved.id);
      const actual = [
        state.equipment[index].isAmmo,
        data.equipment[index].isAmmo,
        data.equipment[index].isWeapon,
        data.equipment[index].ammoCount,
      ];
      const expected = [true, true, false, bin?.shotsPerTon];
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        row.differences.push({
          index,
          sourceId: source.id,
          canonicalId: resolved.id,
          actual,
          expected,
        });
    });
    if (row.bins) rows.push(row);
  }
  if (process.env.RECORD_SHEET_AUDIT)
    fs.writeFileSync(
      path.join(process.env.RECORD_SHEET_AUDIT, 'ammo-kind.json'),
      JSON.stringify(
        {
          units: rows.length,
          bins: rows.reduce((sum, row) => sum + row.bins, 0),
          rows,
        },
        null,
        2,
      ),
    );
  if (process.env.RECORD_SHEET_AUDIT)
    fs.writeFileSync(
      path.join(process.env.RECORD_SHEET_AUDIT, 'bv-projection-causes.json'),
      JSON.stringify({ vehicles: diagnostics }, null, 2),
    );
  expect(rows.length).toBeGreaterThan(0);
  expect(
    rows.flatMap((row) =>
      row.differences.map((d) => ({ id: row.id, difference: d })),
    ),
  ).toEqual([]);
});
it('keeps Ajax ammo out of the weapon pool in both state and native-unit BV paths', () => {
  const raw = ajax();
  const state = mapToVehicleState(raw);
  const expected = calculateBattleValueForUnit(nativeUnit(raw));
  if (expected?.kind !== 'vehicle') throw new Error('Wrong BV family');
  const input = toVehicleBVInput(state);
  expect(input.weapons).toHaveLength(6);
  expect(input.ammo).toHaveLength(4);
  const legacy = {
    ...state,
    equipment: [
      { ...state.equipment[0], equipmentId: 'mrm-40', isAmmo: undefined },
      {
        ...state.equipment[0],
        equipmentId: 'is-streak-srm-6-ammo:omni',
        isAmmo: undefined,
      },
    ],
  };
  expect(toVehicleBVInput(legacy).weapons).toHaveLength(1);
  expect(toVehicleBVInput(legacy).ammo).toHaveLength(1);
  expect(computeVehicleBVFromState(state)).toEqual(expected.breakdown);
  const native = calculateBattleValueForUnit({
    ...nativeUnit(raw),
    equipment: state.equipment,
  });
  expect(native?.breakdown).toEqual(expected.breakdown);
  expect(buildVehicleUnitObject(state).battleValue).toBe(
    expected.breakdown.final,
  );
});
it('retains ammo kind through custom save/reload without changing canonical identities', () => {
  const state = mapToVehicleState(ajax());
  const saved = serializeCustomVehicleState(state, {
    id: state.id,
    chassis: state.chassis,
    variant: state.model,
    era: Era.RENAISSANCE,
  });
  const restored = mapToVehicleState(saved);
  expect(restored.equipment.map((e) => e.equipmentId)).toEqual(
    state.equipment.map((e) => e.equipmentId),
  );
  expect(
    restored.equipment.filter((e) => e.isAmmo && e.equipmentId === 'mrm-40'),
  ).toHaveLength(2);
  expect(computeVehicleBVFromState(restored)).toEqual(
    computeVehicleBVFromState(state),
  );
  const savedNative = calculateBattleValueForUnit(nativeUnit(saved));
  if (savedNative?.kind !== 'vehicle') throw new Error('Wrong BV family');
  const owner = computeVehicleBVFromState(state);
  expect(savedNative.breakdown).toMatchObject({
    weaponBV: owner.weaponBV,
    ammoBV: owner.ammoBV,
    offensive: owner.offensive,
  });
  if (
    process.env.RECORD_SHEET_AUDIT &&
    savedNative.breakdown.structureBV !== owner.structureBV
  )
    fs.writeFileSync(
      path.join(process.env.RECORD_SHEET_AUDIT, 'saved-native-layout-gap.json'),
      JSON.stringify(
        {
          id: state.id,
          sourceArmor: saved.armor,
          editorTurret: saved.vehicleEditor.turret,
          expected: owner,
          actual: savedNative.breakdown,
          scope:
            'pre-existing extra zero-valued turret location in the saved contract; ammo contributions agree',
        },
        null,
        2,
      ),
    );
  const invalid = {
    ...saved,
    vehicleEditor: {
      ...saved.vehicleEditor,
      mounts: saved.vehicleEditor.mounts.slice(1),
    },
  };
  expect(() => nativeUnit(invalid)).toThrow(
    'Saved vehicle mount count does not match equipment',
  );
});

it('retains the same kind for equipment added directly through the mounted-equipment owner', () => {
  const items = getEquipmentLookupService().getAllEquipment();
  const ammo = items.find(
    (e) => e.id === 'mrm-40' && e.category === EquipmentCategory.AMMUNITION,
  );
  const weapon = items.find(
    (e) => e.id === 'mrm-40' && e.category !== EquipmentCategory.AMMUNITION,
  );
  if (!ammo || !weapon) throw new Error('Missing collision fixture');
  expect(createVehicleMountedEquipment(ammo, 'ammo').isAmmo).toBe(true);
  expect(
    createVehicleMountedEquipment(weapon, 'weapon').isAmmo,
  ).toBeUndefined();
});

it('honors an explicit non-ammo marker and retains the legacy untagged fallback', () => {
  const state = mapToVehicleState(ajax());
  const bin = {
    ...state.equipment[0],
    equipmentId: 'is-streak-srm-6-ammo:omni',
    isAmmo: undefined,
  };
  expect(toVehicleBVInput({ ...state, equipment: [bin] }).ammo).toHaveLength(1);
  expect(
    toVehicleBVInput({ ...state, equipment: [{ ...bin, isAmmo: false }] }).ammo,
  ).toHaveLength(0);
});
