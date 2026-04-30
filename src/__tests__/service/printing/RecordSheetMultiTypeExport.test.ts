import type { IAerospaceRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IBattleArmorRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IInfantryRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IProtoMechRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IVehicleRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';

import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { renderRecordSheetSVG } from '@/services/printing/svgRecordSheetRenderer/renderer';
import {
  IMechRecordSheetData,
  RecordSheetDataSchema,
  UnsupportedUnitTypeError,
} from '@/types/printing';

const commonUnit = {
  id: 'fixture',
  name: 'Fixture Unit',
  chassis: 'Fixture',
  model: 'FX-1',
  tonnage: 50,
  techBase: 'Inner Sphere',
  rulesLevel: 'Standard',
  era: '3025',
  battleValue: 1000,
  cost: 2500000,
};

const mechUnit = {
  ...commonUnit,
  name: 'Atlas AS7-D',
  chassis: 'Atlas',
  model: 'AS7-D',
  tonnage: 100,
  configuration: 'Biped',
  engine: {
    type: 'Fusion',
    rating: 300,
  },
  gyro: {
    type: 'Standard',
  },
  structure: {
    type: 'Standard',
  },
  armor: {
    type: 'Standard',
    allocation: {
      head: 9,
      centerTorso: 32,
      centerTorsoRear: 14,
      leftTorso: 32,
      leftTorsoRear: 10,
      rightTorso: 32,
      rightTorsoRear: 10,
      leftArm: 34,
      rightArm: 34,
      leftLeg: 41,
      rightLeg: 41,
    },
  },
  heatSinks: {
    type: 'Single',
    count: 20,
  },
  movement: {
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
  },
  equipment: [],
  battleValue: 1897,
  cost: 9626000,
};

const vehicleUnit = {
  ...commonUnit,
  type: 'vehicle',
  chassis: 'Vedette',
  model: 'Medium Tank',
  motionType: 'Tracked',
  turretConfig: 'Single',
  cruiseMP: 4,
  flankMP: 6,
  armorType: 'Standard',
  armorAllocation: {
    Front: { current: 40, maximum: 40 },
    'Left Side': { current: 30, maximum: 30 },
    'Right Side': { current: 30, maximum: 30 },
    Rear: { current: 24, maximum: 24 },
    Turret: { current: 36, maximum: 36 },
  },
  crew: [
    { role: 'driver', gunnery: 5, piloting: 4 },
    { role: 'gunner', gunnery: 4, piloting: 5 },
    { role: 'commander', gunnery: 4, piloting: 4 },
  ],
  equipment: [
    {
      id: 'ac5',
      name: 'AC/5',
      location: 'Turret',
      heat: 1,
      damage: 5,
      ranges: { minimum: 0, short: 6, medium: 12, long: 18 },
      isWeapon: true,
    },
    {
      id: 'mg',
      name: 'Machine Gun',
      location: 'Front',
      heat: 0,
      damage: 2,
      ranges: { minimum: 0, short: 1, medium: 2, long: 3 },
      isWeapon: true,
    },
  ],
  barRating: 8,
} satisfies IVehicleRecordSheetUnitInput;

const aerospaceUnit = {
  ...commonUnit,
  type: 'aerospace',
  chassis: 'Shilone',
  model: 'SL-17',
  structuralIntegrity: 8,
  fuelPoints: 400,
  safeThrust: 6,
  maxThrust: 9,
  heatSinks: { type: 'Double', count: 10 },
  armorType: 'Ferro-Aluminum',
  armorArcs: {
    Nose: { current: 30, maximum: 30 },
    'Left Wing': { current: 24, maximum: 24 },
    'Right Wing': { current: 24, maximum: 24 },
    Aft: { current: 18, maximum: 18 },
  },
  equipment: [
    {
      id: 'large-laser',
      name: 'Large Laser',
      location: 'Nose',
      heat: 8,
      damage: 8,
      ranges: { minimum: 0, short: 5, medium: 10, long: 15 },
      isWeapon: true,
    },
  ],
  bombBaySlots: 2,
  pilot: { name: 'Lt. Rios', gunnery: 3, piloting: 4, wounds: 0, edge: 1 },
} satisfies IAerospaceRecordSheetUnitInput;

const battleArmorUnit = {
  ...commonUnit,
  type: 'battlearmor',
  chassis: 'Elemental',
  model: 'Point',
  squadSize: 5,
  troopers: Array.from({ length: 5 }, (_, index) => ({
    index: index + 1,
    armorPips: 10,
    maximumArmorPips: 10,
    modularWeapon: 'Small Laser',
    apWeapon: 'SMG',
    gunnery: 4,
    antiMech: 5,
  })),
  manipulators: { left: 'Battle Claw', right: 'Manipulator' },
  walkMP: 1,
  jumpMP: 3,
  umuMP: 0,
  vtolMP: 0,
} satisfies IBattleArmorRecordSheetUnitInput;

const infantryUnit = {
  ...commonUnit,
  type: 'infantry',
  chassis: 'Rifle Platoon',
  model: 'Marine Jump',
  platoonComposition: { squads: 7, troopersPerSquad: 4 },
  infantryMotive: 'Jump',
  armorKit: 'Flak',
  primaryWeaponId: 'inf-rifle',
  secondaryWeaponId: 'inf-srm2',
  secondaryWeaponCount: 7,
  fieldGun: {
    weaponId: 'ac5',
    ammoRounds: 20,
    crewCount: 3,
  },
  hasAntiMechTraining: true,
  specialization: 'marine',
  gunnery: 4,
  antiMech: 5,
} satisfies IInfantryRecordSheetUnitInput;

function protoArmor(current: number, maximum: number) {
  return {
    Head: { current, maximum },
    Torso: { current, maximum },
    'Left Arm': { current, maximum },
    'Right Arm': { current, maximum },
    Legs: { current, maximum },
    'Main Gun': { current, maximum },
  };
}

const protoMechUnit = {
  ...commonUnit,
  type: 'protomech',
  chassis: 'Roc',
  model: 'Point',
  pointSize: 5,
  protos: Array.from({ length: 5 }, (_, index) => ({
    index: index + 1,
    armorByLocation: protoArmor(6, 6),
  })),
  mainGun: 'ER Medium Laser',
  mainGunAmmo: 12,
  hasUMU: true,
  isGlider: false,
  walkMP: 5,
  jumpMP: 0,
  equipment: [
    {
      id: 'er-ml',
      name: 'ER Medium Laser',
      location: 'Main Gun',
      heat: 5,
      damage: 7,
      ranges: { minimum: 0, short: 5, medium: 10, long: 15 },
      isWeapon: true,
    },
  ],
  pilot: { name: 'Point Commander', gunnery: 4, piloting: 5, wounds: 0 },
} satisfies IProtoMechRecordSheetUnitInput;

describe('multi-type record sheet export', () => {
  const service = new RecordSheetService();

  it('keeps the legacy mech path tagged as mech', () => {
    const data: IMechRecordSheetData = service.extractData(mechUnit);

    expect(data.unitType).toBe('mech');
    expect(data.mechType).toBe('biped');
    expect(RecordSheetDataSchema.safeParse(data).success).toBe(true);
  });

  it('dispatches vehicle extraction and renders vehicle sections', () => {
    const data = service.extractData(vehicleUnit);

    expect(data.unitType).toBe('vehicle');
    if (data.unitType !== 'vehicle') throw new Error('Expected vehicle data');

    expect(data.motionType).toBe('Tracked');
    expect(data.turretConfig).toBe('Single');
    expect(data.armorLocations).toHaveLength(5);
    expect(data.crew.map((member) => member.role)).toEqual([
      'driver',
      'gunner',
      'commander',
    ]);
    expect(RecordSheetDataSchema.safeParse(data).success).toBe(true);

    const svg = renderRecordSheetSVG(data);
    expect(svg).toContain('Vedette');
    expect(svg).toContain('Turret Weapons: AC/5');
    expect(svg).toContain('Hull Weapons: Machine Gun');
    expect(svg).toContain('BAR: 8');
  });

  it('dispatches aerospace extraction and renders SI, fuel, arcs, bombs, and pilot edge', () => {
    const data = service.extractData(aerospaceUnit);

    expect(data.unitType).toBe('aerospace');
    if (data.unitType !== 'aerospace')
      throw new Error('Expected aerospace data');

    expect(data.armorArcs.map((arc) => arc.arc)).toEqual([
      'Nose',
      'Left Wing',
      'Right Wing',
      'Aft',
    ]);
    expect(data.structuralIntegrity).toBe(8);
    expect(data.bombBaySlots).toBe(2);
    expect(RecordSheetDataSchema.safeParse(data).success).toBe(true);

    const svg = renderRecordSheetSVG(data);
    expect(svg).toContain('Structural Integrity');
    expect(svg).toContain('Fuel');
    expect(svg).toContain('Bomb Bay Slots: 2');
    expect(svg).toContain('Edge: 1');
  });

  it('dispatches battle armor extraction and renders per-trooper loadouts', () => {
    const data = service.extractData(battleArmorUnit);

    expect(data.unitType).toBe('battlearmor');
    if (data.unitType !== 'battlearmor') {
      throw new Error('Expected battle armor data');
    }

    expect(data.troopers).toHaveLength(5);
    expect(data.manipulators.left).toBe('Battle Claw');
    expect(RecordSheetDataSchema.safeParse(data).success).toBe(true);

    const svg = renderRecordSheetSVG(data);
    expect(svg).toContain('#1');
    expect(svg).toContain('#5');
    expect(svg).toContain('Small Laser');
    expect(svg).toContain('AP: SMG');
  });

  it('dispatches infantry extraction with Wave 1 fields and renders platoon weapons', () => {
    const data = service.extractData(infantryUnit);

    expect(data.unitType).toBe('infantry');
    if (data.unitType !== 'infantry') throw new Error('Expected infantry data');

    expect(data.platoonSize).toBe(28);
    expect(data.motiveType).toBe('Jump');
    expect(data.armorKit).toBe('Flak');
    expect(data.primaryWeapon.name).toBe('Rifle');
    expect(data.secondaryWeapons[0]?.name).toBe('SRM Launcher');
    expect(data.fieldGun?.count).toBe(4);
    expect(data.antiMechTraining).toBe(true);
    expect(RecordSheetDataSchema.safeParse(data).success).toBe(true);

    const svg = renderRecordSheetSVG(data);
    expect(svg).toContain('PLATOON (28 troopers)');
    expect(svg).toContain('Armor Kit: Flak');
    expect(svg).toContain('FIELD GUN');
    expect(svg).toContain('Autocannon/5 x 4');
  });

  it('dispatches protomech extraction and renders a five-proto point', () => {
    const data = service.extractData(protoMechUnit);

    expect(data.unitType).toBe('protomech');
    if (data.unitType !== 'protomech')
      throw new Error('Expected ProtoMech data');

    expect(data.pointSize).toBe(5);
    expect(data.protos).toHaveLength(5);
    expect(data.mainGun).toBe('ER Medium Laser');
    expect(RecordSheetDataSchema.safeParse(data).success).toBe(true);

    const svg = renderRecordSheetSVG(data);
    expect(svg).toContain('#5');
    expect(svg).toContain('MAIN GUN: ER Medium Laser');
    expect(svg).toContain('UMU');
  });

  it('rejects unknown unit types with UnsupportedUnitTypeError', () => {
    const unsupportedUnit = {
      ...mechUnit,
      type: 'warship',
    };

    expect(() => service.extractData(unsupportedUnit)).toThrow(
      UnsupportedUnitTypeError,
    );
    expect(() => service.extractData(unsupportedUnit)).toThrow('warship');
  });
});
