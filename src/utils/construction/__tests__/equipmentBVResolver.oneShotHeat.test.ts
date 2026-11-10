import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

import type { UnitData } from '../mechBV/types';

import {
  calculateAerospaceBV,
  type IAerospaceBVInput,
} from '../aerospace/aerospaceBV';
import { getEquipmentEntry, resolveEquipmentBV } from '../equipmentBVResolver';
import { createEmptyCritScan } from '../mechBV/critScanTypes';
import { buildMechBVWeapons } from '../mechBV/weaponInputs';
import { resolveWeaponForUnit } from '../mechBV/weaponResolution';

// MegaMek 48fcb2f64, HeatTrackingBVCalculator.java:170-180,203-209;
// WeaponMounted.java:231-234 reads WeaponType.F_ONE_SHOT (WeaponType.java:577).
it.each([
  ['rl10', 0.75],
  ['rl15', 1],
  ['rl20', 1.25],
  ['clsrm2-ios:omni', 0.5],
  ['clstreaksrm2-ios:omni', 0.25],
  ['medium-laser', 3],
  ['streak-srm-2', 1],
  ['uac-5', 2],
] as const)('%s resolves native BV heat %s', (id, heat) => {
  expect(resolveEquipmentBV(id)).toMatchObject({ resolved: true, heat });
});
it('retains raw catalog firing heat and identical BV', () => {
  const entry = getEquipmentEntry('rl10');
  expect(entry?.heat).toBe(3);
  expect(resolveEquipmentBV('rl10').battleValue).toBe(entry?.battleValue);
});
it.each([
  ['srm-2-i-os', 0.5],
  ['srm-6-i-os', 1],
] as const)(
  'retains Crossbow T one-shot facts through Clan lookup: %s',
  (id, heat) => {
    expect(resolveWeaponForUnit(id, 'CLAN').heat).toBe(heat);
  },
);
it('applies the shared quarter exactly once to Mech rocket mounts', () => {
  const unit: UnitData = {
    id: 'one-shot-mech',
    chassis: 'test',
    model: '',
    unitType: 'BattleMech',
    configuration: 'Biped',
    techBase: 'IS',
    tonnage: 50,
    engine: { type: 'FUSION', rating: 200 },
    gyro: { type: 'STANDARD' },
    cockpit: 'STANDARD',
    structure: { type: 'STANDARD' },
    armor: { type: 'STANDARD', allocation: {} },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 4, jump: 0 },
    equipment: [{ id: 'rl10', location: 'RIGHT_TORSO' }],
  };
  expect(
    buildMechBVWeapons(unit, createEmptyCritScan(), []).weapons[0].heat,
  ).toBe(0.75);
});

it('Ahab AHB-643 recovers its native total', () => {
  const input: IAerospaceBVInput = {
    subType: AerospaceSubType.AEROSPACE_FIGHTER,
    isSupportVehicle: false,
    techBase: 'INNER_SPHERE',
    sourceTechType: 'IS Level 2',
    year: 3067,
    tonnage: 90,
    structuralIntegrity: 9,
    safeThrust: 5,
    maxThrust: 8,
    heatCapacity: 44,
    armorType: 'standard',
    totalArmorPoints: 248,
    equipment: [
      { id: 'heavy-ppc', location: 'Nose' },
      { id: 'medium-laser', location: 'Nose' },
      { id: 'medium-laser', location: 'Nose' },
      { id: 'mrm-40', location: 'Left Wing' },
      { id: 'rl10', location: 'Left Wing' },
      { id: 'rl10', location: 'Left Wing' },
      { id: 'mrm-40', location: 'Right Wing' },
      { id: 'rl10', location: 'Right Wing' },
      { id: 'rl10', location: 'Right Wing' },
      { id: 'is-mrm-40-ammo', location: 'Fuselage' },
      { id: 'is-mrm-40-ammo', location: 'Fuselage' },
    ],
  };
  expect(calculateAerospaceBV(input).final).toBe(2097);
});

it('Avar E recovers its native total', () => {
  const input: IAerospaceBVInput = {
    subType: AerospaceSubType.AEROSPACE_FIGHTER,
    isSupportVehicle: false,
    techBase: 'CLAN',
    sourceTechType: 'Clan Level 3',
    year: 3063,
    tonnage: 35,
    structuralIntegrity: 10,
    safeThrust: 10,
    maxThrust: 15,
    heatCapacity: 20,
    armorType: 'ferro-aluminum',
    totalArmorPoints: 134,
    equipment: [
      { id: 'clheavylargelaser:omni', location: 'Nose' },
      { id: 'clactiveprobe:omni', location: 'Nose' },
      { id: 'clstreaksrm4:omni', location: 'Left Wing' },
      { id: 'clstreaksrm4:omni', location: 'Right Wing' },
      { id: 'clsrm2-ios:omni', location: 'Aft' },
      { id: 'clsrm2-ios:omni', location: 'Aft' },
      { id: 'clsrm2-ios:omni', location: 'Aft' },
      { id: 'clsrm2-ios:omni', location: 'Aft' },
      { id: 'clan-streak-srm-4-ammo:omni', location: 'Fuselage' },
      { id: 'clcase', location: 'Fuselage' },
    ],
  };
  expect(calculateAerospaceBV(input).final).toBe(1406);
});
