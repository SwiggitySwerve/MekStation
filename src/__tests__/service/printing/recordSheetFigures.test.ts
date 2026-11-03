import { buildAerospaceUnitObject } from '@/components/customizer/aerospace/buildAerospaceUnitObject';
import { buildVehicleUnitObject } from '@/components/customizer/vehicle/buildVehicleUnitObject';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { extractAerospaceData } from '@/services/printing/recordsheet/dataExtractors.aerospace';
import { mapSimpleRecordSheetEquipment } from '@/services/printing/recordsheet/simpleEquipmentMapper';
import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { selectAerospaceTemplate } from '@/services/printing/svgRecordSheetRenderer/aerospace/selectTemplate';
import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import {
  AerospaceLocation,
  VehicleLocation,
} from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';
import { calculateHeatDissipation } from '@/utils/construction/heatSinkCalculations';
import { computeVehicleBVFromState } from '@/utils/construction/vehicle/vehicleBVAdapter';

import { initializeEquipment } from './catalogRecordSheets.helpers';
beforeAll(initializeEquipment);

const service = new RecordSheetService();

it('resolves mount stats by equipment identity while preserving instance identity', () => {
  const state = createDefaultVehicleState({
    name: 'Test Vehicle',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const weapon = getEquipmentLookupService()
    .getAllWeapons()
    .find((w) => w.name === 'Medium Laser');
  expect(weapon).toBeDefined();
  state.equipment = [
    {
      id: 'instance-1',
      equipmentId: weapon?.id ?? 'missing',
      name: 'Source token alias',
      location: VehicleLocation.FRONT,
      isRearMounted: false,
      isTurretMounted: false,
      isSponsonMounted: false,
    },
  ];
  const data = service.extractData(buildVehicleUnitObject(state));
  if (data.unitType !== 'vehicle' || !weapon)
    throw new Error('Missing fixture');
  expect(data.equipment[0]).toMatchObject({
    id: 'instance-1',
    location: 'Front',
    isWeapon: true,
    heat: weapon.heat,
    short: weapon.ranges?.short,
  });
});

it('selects the conventional fighter asset and prints aerospace BV from the dispatcher', () => {
  const state = createDefaultAerospaceState({
    name: 'Test Fighter',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    isConventional: true,
  });
  const data = service.extractData(buildAerospaceUnitObject(state));
  if (data.unitType !== 'aerospace') throw new Error('Wrong sheet');
  expect(selectAerospaceTemplate(data)).toBe('fighter_conventional');
});

it('prints aerospace BV from the dispatcher', () => {
  const state = createDefaultAerospaceState({
    name: 'Test Fighter',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    isConventional: true,
  });
  const data = service.extractData(buildAerospaceUnitObject(state));
  const expected = calculateBattleValueForUnit({
    ...state,
    movement: { safeThrust: state.safeThrust, maxThrust: state.maxThrust },
    totalArmorPoints: 0,
    heatSinkType: 0,
  });
  expect(data.header.battleValue).toBe(expected?.breakdown.final);
  expect(data.header.battleValue).toBeGreaterThan(0);
});

it.each([GroundMotionType.SUBMARINE, GroundMotionType.RAIL])(
  'preserves %s motion instead of printing Tracked',
  (motionType) => {
    const data = service.extractData(
      buildVehicleUnitObject({
        ...createDefaultVehicleState({
          name: 'Test Vehicle',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
        }),
        motionType,
        unitType: UnitType.SUPPORT_VEHICLE,
      }),
    );
    expect(data.unitType === 'vehicle' && data.motionType).toBe(motionType);
  },
);

it('prints vehicle BV from the construction owner', () => {
  const state = createDefaultVehicleState({
    name: 'Test Vehicle',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const data = service.extractData(buildVehicleUnitObject(state));
  expect(data.header.battleValue).toBe(computeVehicleBVFromState(state).final);
  expect(data.header.battleValue).toBeGreaterThan(0);
});

it('does not invent weapon stats for an unknown partial name', () => {
  const state = createDefaultVehicleState({
    name: 'Test Vehicle',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  state.equipment = [
    {
      id: 'unknown-instance',
      equipmentId: 'unknown-equipment',
      name: 'Medium',
      location: VehicleLocation.FRONT,
      isRearMounted: false,
      isTurretMounted: false,
      isSponsonMounted: false,
    },
  ];
  const data = service.extractData(buildVehicleUnitObject(state));
  if (data.unitType !== 'vehicle') throw new Error('Wrong sheet');
  expect(data.equipment[0]).toMatchObject({
    heat: '-',
    damage: '-',
    isWeapon: false,
  });
});

it('resolves aerospace weapon stats by catalog identity', () => {
  const state = createDefaultAerospaceState({
    name: 'Test Fighter',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const weapon = getEquipmentLookupService()
    .getAllWeapons()
    .find((w) => w.name === 'Medium Laser');
  if (!weapon) throw new Error('Missing weapon fixture');
  state.equipment = [
    {
      id: 'aero-instance',
      equipmentId: weapon.id,
      name: 'Source token alias',
      location: AerospaceLocation.NOSE,
    },
  ];
  const data = service.extractData(buildAerospaceUnitObject(state));
  if (data.unitType !== 'aerospace') throw new Error('Wrong sheet');
  expect(data.equipment[0]).toMatchObject({
    id: 'aero-instance',
    location: 'Nose',
    isWeapon: true,
    heat: weapon.heat,
    short: weapon.ranges?.short,
  });
});

it('uses the heat owner for laser heat sinks', () => {
  const unit = buildAerospaceUnitObject(
    createDefaultAerospaceState({
      name: 'Test Fighter',
      tonnage: 50,
      techBase: TechBase.CLAN,
    }),
  );
  const data = extractAerospaceData({
    ...unit,
    heatSinks: { type: 'Laser', count: 12 },
  });
  expect(data.heatSinks.capacity).toBe(
    calculateHeatDissipation(HeatSinkType.LASER, 12),
  );
});

it('resolves ammunition shots and preserves explicit zero overrides', () => {
  const ammo = getEquipmentLookupService().getAllAmmunition()[0];
  expect(ammo).toBeDefined();
  const mount = {
    id: 'ammo-instance',
    equipmentId: ammo.id,
    name: 'Source ammo token',
    location: 'Nose',
  };
  expect(mapSimpleRecordSheetEquipment([mount])[0]).toMatchObject({
    id: 'ammo-instance',
    isAmmo: true,
    ammoCount: ammo.shotsPerTon,
  });
  expect(
    mapSimpleRecordSheetEquipment([
      {
        ...mount,
        ammoCount: 0,
        heat: 0,
        damage: 0,
        ranges: { minimum: 0, short: 0, medium: 0, long: 0 },
      },
    ])[0],
  ).toMatchObject({
    ammoCount: 0,
    heat: 0,
    damage: 0,
    minimum: 0,
    short: 0,
    medium: 0,
    long: 0,
  });
});

it('resolves source weapon aliases through the shared equipment owner', () => {
  const weapon = getEquipmentEntry('ISMediumLaser');
  expect(weapon?.id).toBe('medium-laser');
  expect(
    mapSimpleRecordSheetEquipment([
      {
        id: 'alias-instance',
        equipmentId: 'ISMediumLaser',
        name: 'Source token alias',
        location: 'Nose',
      },
    ])[0],
  ).toMatchObject({
    id: 'alias-instance',
    heat: weapon?.heat,
    damage: String(weapon?.damage),
    isWeapon: true,
  });
});

it('keeps a resolved weapon identity when its display name matches ammunition', () => {
  const lookup = getEquipmentLookupService();
  const weapon = lookup.getAllWeapons().find((w) => w.name === 'Medium Laser');
  if (!weapon) throw new Error('Missing weapon fixture');
  const ammo = lookup.getAllAmmunition()[0];
  const row = mapSimpleRecordSheetEquipment([
    {
      id: 'weapon-instance',
      equipmentId: weapon.id,
      name: ammo.name,
      location: 'Nose',
    },
  ])[0];
  expect(row).toMatchObject({
    isWeapon: true,
    isAmmo: false,
    heat: weapon.heat,
    damage: String(weapon.damage),
  });
});
