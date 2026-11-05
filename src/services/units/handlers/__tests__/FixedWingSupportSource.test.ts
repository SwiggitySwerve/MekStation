import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  getUnitTypeRegistry,
  UnitTypeRegistry,
} from '@/services/units/UnitTypeRegistry';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateAerospaceAmmoBV } from '@/utils/construction/aerospace/aerospaceBVCalculations';
import { calculateAerospaceBV } from '@/utils/construction/aerospace/aerospaceBVCalculator';
import { validateFixedWingSupport } from '@/utils/construction/aerospace/fixedWingSupport';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';
import {
  getAmmunitionEntry,
  resolveEquipmentBV,
} from '@/utils/construction/equipmentBVResolver';

import { createConventionalFighterHandler } from '../ConventionalFighterUnitHandler';
import { initializeUnitTypeHandlers } from '../initializeHandlers';
import fixtures from './fixtures/fixed-wing-support.json';

const fwsJava: Record<
  string,
  {
    javaBV: number;
    javaTerms: {
      armorBV: number;
      structureBV: number;
      defensiveEquipmentBV: number;
      explosivePenalty: number;
      weaponBV: number;
      ammoBV: number;
    };
  }
> = {
  'convfighter/TRO VAr/Comet Airliner ACL-800.blk': {
    javaBV: 125,
    javaTerms: {
      armorBV: 117.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/Delta Air Cruiser.blk': {
    javaBV: 125,
    javaTerms: {
      armorBV: 117.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/King Karnov Transport KC-6.blk': {
    javaBV: 239,
    javaTerms: {
      armorBV: 232.75,
      structureBV: 6.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/King Karnov Transport.blk': {
    javaBV: 239,
    javaTerms: {
      armorBV: 232.75,
      structureBV: 6.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/Longhaul Cargo Aircraft FB-335.blk': {
    javaBV: 206,
    javaTerms: {
      armorBV: 200.0,
      structureBV: 6.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/S 2772 Airplane.blk': {
    javaBV: 35,
    javaTerms: {
      armorBV: 31.0,
      structureBV: 4.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/Stratos Airliner WK-1000.blk': {
    javaBV: 125,
    javaTerms: {
      armorBV: 117.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/Torrent Heavy Bomber (Original).blk': {
    javaBV: 124,
    javaTerms: {
      armorBV: 107.99999999999999,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 15.0,
      weaponBV: 20.0,
      ammoBV: 0.5,
    },
  },
  'convfighter/TRO VAr/Torrent Heavy Bomber.blk': {
    javaBV: 233,
    javaTerms: {
      armorBV: 107.99999999999999,
      structureBV: 8.0,
      defensiveEquipmentBV: 61.000000000000014,
      explosivePenalty: 30.0,
      weaponBV: 69.0,
      ammoBV: 7.5,
    },
  },
  'vehicles/3085u/Cutting Edge/Zugvogel Omni Support Aircraft A.blk': {
    javaBV: 660,
    javaTerms: {
      armorBV: 510.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 112.0,
      ammoBV: 15.0,
    },
  },
  'vehicles/3085u/Cutting Edge/Zugvogel Omni Support Aircraft B.blk': {
    javaBV: 518,
    javaTerms: {
      armorBV: 510.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'vehicles/3085u/Cutting Edge/Zugvogel Omni Support Aircraft C.blk': {
    javaBV: 518,
    javaTerms: {
      armorBV: 510.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'vehicles/3085u/Cutting Edge/Zugvogel Omni Support Aircraft D.blk': {
    javaBV: 1971,
    javaTerms: {
      armorBV: 510.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 1003.0,
      ammoBV: 294.0,
    },
  },
  'vehicles/3085u/Cutting Edge/Zugvogel Omni Support Aircraft E.blk': {
    javaBV: 953,
    javaTerms: {
      armorBV: 510.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 222.0,
      explosivePenalty: 0.0,
      weaponBV: 163.0,
      ammoBV: 27.0,
    },
  },
  'vehicles/3085u/Cutting Edge/Zugvogel Omni Support Aircraft Prime.blk': {
    javaBV: 1159,
    javaTerms: {
      armorBV: 510.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 459.5,
      ammoBV: 113.0,
    },
  },
  'vehicles/3145/NTNU/Zugvogel Omni Support Aircraft F.blk': {
    javaBV: 2848,
    javaTerms: {
      armorBV: 510.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 1485.5,
      ammoBV: 595.0,
    },
  },
  'vehicles/XTRs/Primitives III/Caravan Heavy Transport.blk': {
    javaBV: 284,
    javaTerms: {
      armorBV: 276.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/3039u/Boomerang Spotter Plane.blk': {
    javaBV: 8,
    javaTerms: {
      armorBV: 0.0,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/3075U/Stork Light Refueling Craft (Original).blk': {
    javaBV: 292,
    javaTerms: {
      armorBV: 210.0,
      structureBV: 10.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 15.0,
      weaponBV: 58.5,
      ammoBV: 5.0,
    },
  },
  'convfighter/3075U/Stork Light Refueling Craft (Standard ).blk': {
    javaBV: 438,
    javaTerms: {
      armorBV: 210.0,
      structureBV: 10.0,
      defensiveEquipmentBV: 161.0,
      explosivePenalty: 30.0,
      weaponBV: 58.5,
      ammoBV: 5.0,
    },
  },
  'convfighter/TRO VAr/Chariot High-Speed Medevac.blk': {
    javaBV: 72,
    javaTerms: {
      armorBV: 61.49999999999999,
      structureBV: 10.000000000000007,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/Graceful Crane Air Bus.blk': {
    javaBV: 84,
    javaTerms: {
      armorBV: 78.0,
      structureBV: 6.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/Jetta Coruna 4X.blk': {
    javaBV: 28,
    javaTerms: {
      armorBV: 19.5,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/Mosquito Radar Plane IX.blk': {
    javaBV: 114,
    javaTerms: {
      armorBV: 43.5,
      structureBV: 8.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 55.800000000000004,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/Protector High-Speed Medevac.blk': {
    javaBV: 103,
    javaTerms: {
      armorBV: 92.99999999999999,
      structureBV: 10.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/TRO VAr/Zanadu Air Bus.blk': {
    javaBV: 84,
    javaTerms: {
      armorBV: 78.0,
      structureBV: 6.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/XTRs/Primitives I/Hurricane Conventional Fighter.blk': {
    javaBV: 65,
    javaTerms: {
      armorBV: 36.25,
      structureBV: 12.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 15.0,
      weaponBV: 20.7,
      ammoBV: 0.4499999999999993,
    },
  },
  'convfighter/XTRs/Primitives III/Vendetta Medium Fighter.blk': {
    javaBV: 454,
    javaTerms: {
      armorBV: 137.5,
      structureBV: 10.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 0.0,
      weaponBV: 224.0,
      ammoBV: 0.0,
    },
  },
  'convfighter/XTRs/Primitives IV/Mustang Fighter.blk': {
    javaBV: 535,
    javaTerms: {
      armorBV: 126.0,
      structureBV: 10.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 30.0,
      weaponBV: 279.0,
      ammoBV: 34.0,
    },
  },
  'convfighter/XTRs/Primitives V/Colt Medium Fighter (LRM).blk': {
    javaBV: 182,
    javaTerms: {
      armorBV: 55.0,
      structureBV: 10.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 15.0,
      weaponBV: 90.0,
      ammoBV: 6.0,
    },
  },
  'convfighter/XTRs/Primitives V/Colt Medium Fighter (SRM).blk': {
    javaBV: 164,
    javaTerms: {
      armorBV: 55.0,
      structureBV: 10.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 15.0,
      weaponBV: 78.0,
      ammoBV: 5.0,
    },
  },
  'convfighter/XTRs/Succession Wars/Tsuru VIP Aircraft.blk': {
    javaBV: 344,
    javaTerms: {
      armorBV: 257.5,
      structureBV: 10.0,
      defensiveEquipmentBV: 76.0,
      explosivePenalty: 0.0,
      weaponBV: 0.0,
      ammoBV: 0.0,
    },
  },
  'vehicles/XTRs/Primitives II/Mosquito Light Fighter.blk': {
    javaBV: 111,
    javaTerms: {
      armorBV: 36.0,
      structureBV: 12.0,
      defensiveEquipmentBV: 0.0,
      explosivePenalty: 30.0,
      weaponBV: 55.0,
      ammoBV: 7.0,
    },
  },
};
const fwsSources = [...fixtures.rows, ...fixtures.legacyRows].map((row) => ({
  ...row,
  ...fwsJava[row.path],
}));

beforeAll(() => initializeUnitTypeHandlers());
const parser = new BlkParserService();
it('matches FWS native MML ammunition by type and rack', () => {
  const result = calculateAerospaceBV({
    subType: AerospaceSubType.CONVENTIONAL_FIGHTER,
    isSupportVehicle: true,
    tonnage: 150,
    structuralIntegrity: 4,
    safeThrust: 4,
    maxThrust: 6,
    armorType: 'standard',
    totalArmorPoints: 20,
    equipment: [
      { id: 'mml-5', location: 'Nose' },
      { id: 'advanced-fire-control', location: 'Nose' },
    ],
    ammo: [{ id: 'IS Ammo MML-5 LRM', weaponType: 'IS Ammo MML-5 LRM', bv: 6 }],
  });
  expect(result.ammoBV).toBe(6);
});
it.each([
  [['basic-fire-control'], 0.9],
  [['advanced-fire-control'], 1],
  [[], 0.8],
  [['basic-fire-control', 'advanced-fire-control'], 0.9],
] as const)('uses the shared FWS fire-control rule %s', (controls, factor) => {
  const input = {
    subType: AerospaceSubType.CONVENTIONAL_FIGHTER,
    isSupportVehicle: true,
    tonnage: 50,
    structuralIntegrity: 4,
    safeThrust: 4,
    maxThrust: 6,
    armorType: 'standard',
    totalArmorPoints: 20,
    equipment: ['srm-4', ...controls].map((id) => ({ id, location: 'Nose' })),
    ammo: [{ id: 'ammo-srm-4', weaponType: 'srm-4', bv: 5 }],
  };
  const result = calculateAerospaceBV(input);
  expect(result.weaponFirePoolBV).toBeCloseTo(39 * factor, 9);
  expect(result.ammoBV).toBeCloseTo(5 * factor, 9);
  expect(
    result.arcContributions.find((arc) => arc.arc === 'Nose')?.rawBV,
  ).toBeCloseTo(39 * factor, 9);
  const body = calculateAerospaceBV({
    ...input,
    equipment: input.equipment.map((item) => ({
      ...item,
      location: 'Fuselage',
    })),
  });
  expect(body.fuselageWeaponBV).toBeCloseTo(39 * factor, 9);
  const ordinary = calculateAerospaceBV({ ...input, isSupportVehicle: false });
  expect(ordinary.weaponFirePoolBV).toBe(39);
  expect(ordinary.ammoBV).toBe(5);
});
it('transports native FWS BAR from a canonical Comet-shaped contract', () => {
  const unit = contractUnitToBVUnit({
    id: 'comet-airliner-acl-800',
    unitType: UnitType.CONVENTIONAL_FIGHTER,
    subType: 'FixedWingSupport',
    tonnage: 180,
    structuralIntegrity: 4,
    movement: { safeThrust: 4, maxThrust: 6 },
    armor: {
      type: 'BAR',
      barRating: 6,
      byArc: { NOSE: 28, LEFT_WING: 19, RIGHT_WING: 19, AFT: 12 },
    },
  });
  const result = calculateBattleValueForUnit(unit);
  if (result?.kind !== 'aerospace') throw new Error('Wrong dispatcher');
  expect(result.breakdown.armorBV).toBe(117);
  expect(result.breakdown.final).toBe(125);
});
it('caps FWS ammunition against weapons without letting bins enlarge the cap', () => {
  const input = {
    subType: AerospaceSubType.CONVENTIONAL_FIGHTER,
    isSupportVehicle: true,
    tonnage: 150,
    structuralIntegrity: 4,
    safeThrust: 4,
    maxThrust: 6,
    armorType: 'standard',
    totalArmorPoints: 20,
    equipment: [
      { id: 'gauss-rifle', location: 'Nose' },
      { id: 'gauss-ammo', location: 'Aft' },
      { id: 'advanced-fire-control', location: 'Nose' },
    ],
    ammo: [{ id: 'gauss-ammo', bv: 400, weaponType: 'gauss-rifle' }],
  };
  expect(calculateAerospaceBV(input).ammoBV).toBe(320);
  expect(calculateAerospaceBV({ ...input, equipment: [] }).ammoBV).toBe(0);
  const ordinary = calculateAerospaceBV({ ...input, isSupportVehicle: false });
  expect(ordinary.weaponFirePoolBV).toBe(320);
  expect(ordinary.ammoBV).toBe(320);
  // Omitted ammo retains the legacy flat-input contract.
  expect(
    calculateAerospaceBV({ ...input, isSupportVehicle: false, ammo: undefined })
      .weaponFirePoolBV,
  ).toBe(340);
  expect(calculateAerospaceBV({ ...input, barRating: 0 }).armorBV).toBe(0);
  expect(
    calculateAerospaceBV({ ...input, isSupportVehicle: false, barRating: 2 })
      .armorBV,
  ).toBe(50);
});
it('keeps explicit FWS ammo identity when a catalog id is shared with a weapon', () => {
  const result = calculateAerospaceBV({
    subType: AerospaceSubType.CONVENTIONAL_FIGHTER,
    isSupportVehicle: true,
    tonnage: 150,
    structuralIntegrity: 4,
    safeThrust: 4,
    maxThrust: 6,
    armorType: 'standard',
    totalArmorPoints: 20,
    equipment: [
      { id: 'mrm-20', location: 'Nose' },
      { id: 'mrm-20', location: 'Aft', isAmmo: true },
      { id: 'advanced-fire-control', location: 'Nose' },
    ],
    ammo: [{ id: 'mrm-20', weaponType: 'MRM 20 Ammo', bv: 200 }],
  });
  expect(result.weaponFirePoolBV).toBe(112);
  expect(result.ammoBV).toBe(112);
  expect(
    calculateAerospaceAmmoBV(
      [
        { id: 'mrm-20', location: 'Nose' },
        { id: 'mrm-20', location: 'Aft', isAmmo: true },
      ],
      [{ id: 'mrm-20', weaponType: 'MRM 20 Ammo', bv: 200 }],
      true,
    ),
  ).toBe(112);
});
it.each(fwsSources)('uses native FWS BAR armor BV: $path', (row) => {
  const document = parser.parse(row.content);
  if (!document.success) throw new Error(row.path);
  const handler = getUnitTypeRegistry().getHandlerForDocument(
    document.data.document,
  )!;
  const parsed = handler.parse(document.data.document);
  if (!parsed.success) throw new Error(row.path);
  const result = calculateBattleValueForUnit(parsed.data.unit);
  if (result?.kind !== 'aerospace') throw new Error('Wrong dispatcher');
  expect(result.breakdown.armorBV).toBeCloseTo(row.javaTerms.armorBV, 9);
  const pool =
    result.breakdown.armorBV +
    result.breakdown.siBV +
    result.breakdown.defensiveEquipmentBV -
    result.breakdown.explosivePenalties;
  expect(result.breakdown.defensive).toBeCloseTo(pool, 9);
});
it.each(fwsSources.filter((row) => /Aircraft [ADE]\.blk$/.test(row.path)))(
  'separates FWS ammunition from firing arcs: $path',
  (row) => {
    const document = parser.parse(row.content);
    if (!document.success) throw new Error(row.path);
    const handler = getUnitTypeRegistry().getHandlerForDocument(
      document.data.document,
    )!;
    const parsed = handler.parse(document.data.document);
    if (!parsed.success) throw new Error(row.path);
    const result = calculateBattleValueForUnit(parsed.data.unit);
    if (result?.kind !== 'aerospace') throw new Error('Wrong dispatcher');
    expect(
      result.breakdown.weaponFirePoolBV + result.breakdown.fuselageWeaponBV,
    ).toBeCloseTo(row.javaTerms.weaponBV, 9);
    // Pinned bin counts; Q1 corrects old values and Q2 adds missing identities.
    const bins: readonly (readonly [string, number])[] = row.path.endsWith(
      'Aircraft A.blk',
    )
      ? [
          ['IS LB 2-X AC Ammo', 2],
          ['IS LB 2-X Cluster Ammo', 1],
        ]
      : row.path.endsWith('Aircraft D.blk')
        ? [
            ['IS Gauss Ammo', 7],
            ['IS Ultra AC/2 Ammo', 2],
          ]
        : [
            ['IS Ammo MML-5 LRM', 1],
            ['IS Ammo MML-5 SRM', 1],
            ['ISRotaryAC2 Ammo', 1],
          ];
    const catalogAmmoBV = bins.reduce(
      (sum, [id, count]) =>
        sum + count * (getAmmunitionEntry(id)?.battleValue ?? 0),
      0,
    );
    expect(result.breakdown.ammoBV).toBeCloseTo(catalogAmmoBV, 9);
    expect(result.breakdown.defensiveEquipmentBV).toBeCloseTo(
      row.javaTerms.defensiveEquipmentBV,
      9,
    );
    if (catalogAmmoBV === row.javaTerms.ammoBV)
      expect(result.breakdown.final).toBe(row.javaBV);
  },
);
it.each(fixtures.rows)('loads and validates native FWS: $path', (row) => {
  expect(createHash('sha256').update(row.content).digest('hex')).toBe(
    row.sha256,
  );
  const document = parser.parse(row.content);
  if (!document.success) throw new Error(row.path);
  const handler = getUnitTypeRegistry().getHandlerForDocument(
    document.data.document,
  )!;
  const parsed = handler.parse(document.data.document);
  expect(parsed.success).toBe(true);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  expect(handler.displayName).toBe('Fixed-Wing Support');
  const result = handler.validate(parsed.data.unit);
  expect(result.isValid).toBe(row.valid);
  if (row.reason) expect(result.errors.join('\n')).toContain(row.reason);
  expect(parsed.data.unit.isValid).toBe(result.isValid);
  const dispatched = calculateBattleValueForUnit(parsed.data.unit);
  expect(dispatched?.kind).toBe('aerospace');
  if (dispatched?.kind !== 'aerospace') throw new Error('Wrong dispatcher');
  expect(dispatched.breakdown.subTypeMultiplier).toBe(1);
  expect(handler.calculateBV(parsed.data.unit)).toBe(
    dispatched.breakdown.final,
  );
});
const evidence = process.env.FWS_EVIDENCE;
(evidence ? it : it.skip)(
  'compares the real source corpus and records dispatcher BV',
  () => {
    const root = readFileSync(
      join(evidence!, 'sources-path.txt'),
      'utf8',
    ).trim();
    const families = [
      'ProtoMek',
      'AeroSpaceFighter',
      'ConvFighter',
      'SmallCraft',
      'FixedWingSupport',
      'Dropship',
      'Jumpship',
      'Warship',
      'SpaceStation',
    ];
    const oracle = readFileSync(join(evidence!, 'oracle.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            path: string;
            sha256: string;
            concreteFamily: string;
            construction: { valid: boolean; diagnostics: string };
            battleValue: { total: number };
          },
      )
      .filter((row) => families.includes(row.concreteFamily));
    const rows = oracle.map((row) => {
      const content = readFileSync(join(root, row.path), 'utf8').replace(
        /\r\n/g,
        '\n',
      );
      expect(createHash('sha256').update(content).digest('hex')).toBe(
        row.sha256,
      );
      const document = parser.parse(content);
      if (!document.success) throw new Error(row.path);
      const handler = getUnitTypeRegistry().getHandlerForDocument(
        document.data.document,
      )!;
      const parsed = handler.parse(document.data.document);
      const bv = parsed.success ? handler.calculateBV(parsed.data.unit) : null;
      return {
        path: row.path,
        family: row.concreteFamily,
        java: row.construction.valid,
        javaDiagnostics: row.construction.diagnostics,
        javaBV: row.battleValue.total,
        loaded: parsed.success,
        local: parsed.success
          ? handler.validate(parsed.data.unit)
          : parsed.error,
        bv,
        handler: handler.displayName,
      };
    });
    writeFileSync(
      join(evidence!, `${process.env.FWS_PHASE}.json`),
      JSON.stringify(rows, null, 2),
    );
    expect(rows).toHaveLength(1100);
    if (process.env.FWS_PHASE === 'after') {
      const before = JSON.parse(
        readFileSync(join(evidence!, 'before.json'), 'utf8'),
      ) as typeof rows;
      const admitted = new Set(fixtures.rows.map((r) => r.path));
      rows.forEach((r, i) => {
        if (admitted.has(r.path)) {
          expect(r.loaded).toBe(true);
          expect('isValid' in r.local && r.local.isValid).toBe(r.java);
        } else
          expect({
            loaded: r.loaded,
            valid: 'isValid' in r.local ? r.local.isValid : null,
            bv: r.bv,
          }).toEqual({
            loaded: before[i].loaded,
            valid:
              'isValid' in before[i].local ? before[i].local.isValid : null,
            bv: before[i].bv,
          });
      });
    }
  },
);

function nativeDocument(index = 1) {
  const parsed = parser.parse(fixtures.rows[index].content);
  if (!parsed.success) throw new Error('Invalid fixture');
  return parsed.data.document;
}
it('uses the native support BV type stage for Zugvogel B', () => {
  const index = fixtures.rows.findIndex((row) =>
    row.path.endsWith('Zugvogel Omni Support Aircraft B.blk'),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  const document = nativeDocument(index);
  const handler = getUnitTypeRegistry().getHandlerForDocument(document)!;
  const parsed = handler.parse(document);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const result = calculateBattleValueForUnit(parsed.data.unit);
  if (result?.kind !== 'aerospace') throw new Error('Wrong dispatcher');
  expect(result.breakdown.final).toBe(fixtures.rows[index].javaBV);
  expect(handler.calculateBV(parsed.data.unit)).toBe(
    fixtures.rows[index].javaBV,
  );
});
it.each([0.001, 4.999, 5, 100, 100.001, 200])(
  'uses FWS size limits at %s tons',
  (tonnage) => {
    const d = {
      ...nativeDocument(),
      tonnage,
      armor: [],
      armorType: 0,
      rawTags: { Tonnage: String(tonnage) },
    };
    const handler = getUnitTypeRegistry().getHandlerForDocument(d)!;
    const parsed = handler.parse(d);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    expect(handler.validate(parsed.data.unit).isValid).toBe(true);
    expect(parsed.data.unit.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
    expect(
      (parsed.data.unit as { isFixedWingSupport?: boolean }).isFixedWingSupport,
    ).toBe(true);
    expect(parsed.data.unit).toMatchObject({
      structuralIntegrity: d.safeThrust,
    });
  },
);
it.each([0, -1, 200.001, Infinity, NaN])(
  'rejects invalid FWS source weight %s',
  (tonnage) => {
    expect(
      validateFixedWingSupport({
        ...nativeDocument(),
        tonnage,
        rawTags: {},
      }).join('\n'),
    ).toContain('Fixed-wing support tonnage');
  },
);
it('retains conventional fighter admission and its five-ton floor', () => {
  const cf = createConventionalFighterHandler();
  expect(
    cf.parse({ ...nativeDocument(), unitType: 'ConvFighter', tonnage: 101 })
      .success,
  ).toBe(false);
  const parsed = cf.parse({
    ...nativeDocument(),
    unitType: 'ConvFighter',
    tonnage: 4,
  });
  if (!parsed.success)
    throw new Error('Expected loaded invalid conventional fighter');
  expect(cf.validate(parsed.data.unit).errors).toContain(
    'Conventional fighter tonnage must be at least 5 tons',
  );
});
it('allows maritime lifeboats with the pinned amphibious chassis alias', () => {
  const d = nativeDocument(0);
  expect(
    validateFixedWingSupport(d).filter((e) => e.includes('requires naval')),
  ).toHaveLength(12);
  expect(
    validateFixedWingSupport({
      ...d,
      rawTags: {
        ...d.rawTags,
        'Body Equipment': ['Lifeboat (Maritime)', 'AmphibiousChassis'],
      },
    }).filter((e) => e.includes('requires naval')),
  ).toEqual([]);
});
function slotDocument(tech = 4, cases = 1) {
  return {
    ...nativeDocument(),
    tonnage: 200,
    armorType: 51,
    rawTags: {
      armor_tech_rating: String(tech),
      'Nose Equipment': [
        'ISGaussRifle',
        'ISGaussRifle',
        'ISGaussRifle',
        ...Array<string>(cases).fill('ISCASE'),
        ...Array<string>(9).fill('IS Gauss Ammo'),
      ],
    },
  };
}
it('counts distinct ammo types once and accepts exactly available slots', () => {
  expect(validateFixedWingSupport(slotDocument())).toEqual([]);
  expect(validateFixedWingSupport(slotDocument(4, 2)).join('\n')).toContain(
    'Using 1 slot(s) too many',
  );
});
it('applies BAR 10 armor technology slots and the floor at the capacity boundary', () => {
  expect(validateFixedWingSupport(slotDocument(4, 3)).join('\n')).toContain(
    'Using 2 slot(s) too many',
  );
  expect(validateFixedWingSupport(slotDocument(5, 3)).join('\n')).toContain(
    'Using 1 slot(s) too many',
  );
  expect(
    validateFixedWingSupport({ ...slotDocument(), tonnage: 199.999 }).join(
      '\n',
    ),
  ).toContain('Available slots: 24');
});

it('routes FWS only while the aerospace handler family is registered', () => {
  const registry = new UnitTypeRegistry();
  expect(registry.getHandlerForDocument(nativeDocument())).toBeUndefined();
  registry.register(createConventionalFighterHandler());
  expect(registry.getHandlerForDocument(nativeDocument())?.displayName).toBe(
    'Fixed-Wing Support',
  );
  registry.clear();
  expect(registry.getHandlerForDocument(nativeDocument())).toBeUndefined();
});

// Hurricane Conventional Fighter main-before pins 85 (was 84): owner ruling 2026-11-02 question 1 corrects the
// half-ton MG bin from BV 0 to 0.5 (pinned AmmoType.java:6665 `createISMGAmmoHalf`, bv = 0.5f). It is the
// only CAT-Q1 term that moved: fuselageWeaponBV 0 -> 0.5, offense 7.5 -> 8.25 (speed 1.5), 83.95 -> 84.70.
// Java's own per-term trace has the same bin (`ammo.available.MG:2` = 0.5). The total still differs from
// Java's 65 (UL-16b) before this slice: armorBV 72.5 vs 36.25, unresolved CLRocketLauncher15Prototype,
// and the 0.9 fire-control factor. Correct BAR/FCS now expose the missing prototype rather than offsetting it.
it.each(fixtures.legacyRows)(
  'uses Java BV for available small/medium FWS equipment: $path',
  (row) => {
    const parsedDocument = parser.parse(row.content);
    if (!parsedDocument.success) throw new Error(row.path);
    expect(createHash('sha256').update(row.content).digest('hex')).toBe(
      row.sha256,
    );
    const handler = getUnitTypeRegistry().getHandlerForDocument(
      parsedDocument.data.document,
    )!;
    expect(handler.displayName).toBe('Fixed-Wing Support');
    expect(
      handler.canHandle({
        ...parsedDocument.data.document,
        unitType: 'ConvFighter',
      }),
    ).toBe(false);
    const parsed = handler.parse(parsedDocument.data.document);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    expect(handler.validate(parsed.data.unit).isValid).toBe(row.valid);
    const prototype = row.path.includes('Hurricane Conventional Fighter')
      ? 'CLRocketLauncher15Prototype'
      : row.path.includes('Mustang Fighter')
        ? 'Autocannon/10 Primitive'
        : undefined;
    // CAT-Q1 #2577 moves the old Hurricane source pin 84 -> 85. Correct BAR
    // exposes the missing prototype until CAT-Q2 supplies its native identity.
    if (!prototype || resolveEquipmentBV(prototype).battleValue > 0)
      expect(handler.calculateBV(parsed.data.unit)).toBe(
        fwsJava[row.path].javaBV,
      );
    else {
      expect(handler.calculateBV(parsed.data.unit)).toBeGreaterThan(0);
      const result = calculateBattleValueForUnit(parsed.data.unit);
      if (result?.kind !== 'aerospace') throw new Error('Wrong dispatcher');
      expect(handler.calculateBV(parsed.data.unit)).toBe(
        result.breakdown.final,
      );
    }
  },
);
it('starts distinct-ammo slots at five tons', () => {
  const d = {
    ...nativeDocument(),
    tonnage: 5,
    armorType: 0,
    rawTags: {
      'Nose Equipment': ['Medium Laser', ...Array<string>(4).fill('ISCASE')],
      'Body Equipment': ['IS Gauss Ammo'],
    },
  };
  expect(validateFixedWingSupport(d).join('\n')).toContain(
    'Using 1 slot(s) too many',
  );
  expect(validateFixedWingSupport({ ...d, tonnage: 4.999 })).toEqual([]);
});
