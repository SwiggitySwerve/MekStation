/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { EngineType } from '@/types/construction/EngineType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { computeSupportVehicleWeight } from '../supportWeight';
import { isInsulatorLinkableLaser } from '../vehicleHeatLoad';
import { computeVehicleWeightBreakdown } from '../weightComposition';
import {
  SUPPORT_HOISTS,
  supportChassisBlk,
} from './supportChassisBlk.test.helpers';

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

const resolve = (id: string, isAmmo?: boolean) =>
  getEquipmentLookupService().getMountedById(id, isAmmo === true);
const loadState = (name: string) =>
  mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', `${name}.json`),
        'utf8',
      ),
    ),
  );

/**
 * Pinned MegaMek 48fcb2f64, original classes, loaded from the mm-data 50f7efe
 * corpus: TestSupportVehicle.getWeightHeatSinks() is the count itself, with no
 * free engine sinks (TestSupportVehicle.java:917-931), and
 * getCountHeatSinks() is TestEntity.calcHeatNeutralHSRequirement
 * (TestEntity.java:945-984) except that a small support vehicle needs none.
 * Values come from a SupportProbe run over the 227 SupportTank,
 * LargeSupportTank and SupportVTOL sources: 19 carry heat, in every engine
 * family the corpus has.
 */
const corpusRows: readonly (readonly [unit: string, heat: number])[] = [
  ['Jifty Transportable Field Repair Unit JI-50 (ML)', 6],
  ['Prometheus Combat Support Bridgelayer', 3],
  ['J-37 Ordnance Transport (Original)', 1],
  ['J-37 Ordnance Transport', 2],
  ['Savior Repair Vehicle', 1],
  ['Wayland Mobile Base', 12],
  ['Lexan Surveillance VTOL (Production)', 2],
  ['Prime Mover (Original)', 2],
  ['Prime Mover (LRM)', 1],
  ['Corx Mobile Tunnel Miner', 2],
  ['Croyle Systems Cortez Series N', 3],
  ['Raptor RRV', 2],
  ['Bailey Armored Car', 4],
  ['Lexan Surveillance Helo', 2],
  ['Korvin Tank KRV-2', 8],
  ['Apostle Self-Propelled Artillery', 1],
  ['Reaper Self-Propelled Artillery', 1],
  ['Sand Devil Hover Tank', 8],
  ['White Tip Submarine', 5],
  // Under 5 t: Java never iterates the weapons (TestSupportVehicle.java:928-930).
  ['Hoverbike (Laser)', 0],
  ['Harpoon ParaSub', 0],
];

it.each(corpusRows)(
  '%s carries %s support heat sink tons in the editor, as in Java',
  (unit, javaHeat) => {
    const state = loadState(unit);
    expect(state.unitType).toBe(UnitType.SUPPORT_VEHICLE);
    expect(computeVehicleWeightBreakdown(state, resolve).heatSinks).toBe(
      javaHeat,
    );
  },
);

// Synthetic support chassis: a real corpus BLK (Jifty JI-50) with only the
// equipment blocks edited, loaded by the pinned MekFileParser (shared fixture).
// The cases the corpus never mounts on a support vehicle.
const blk = supportChassisBlk;
const hoists = SUPPORT_HOISTS;

type Mount = readonly [id: string, location: 'front' | 'rear'];
const synthetic: readonly (readonly [
  label: string,
  front: string,
  rear: string,
  mounts: readonly Mount[],
  javaHeat: number,
  javaTotal: number,
  ice?: boolean,
])[] = [
  [
    'two medium lasers',
    'Medium Laser\nMedium Laser',
    hoists,
    [
      ['medium-laser', 'front'],
      ['medium-laser', 'front'],
    ],
    6,
    59.5,
  ],
  // MekFileParser.java:360-388 links the insulator; TestEntity.java:956-962.
  [
    'insulator on two lasers (-1)',
    'Medium Laser\nMedium Laser\nLaser Insulator',
    hoists,
    [
      ['medium-laser', 'front'],
      ['medium-laser', 'front'],
      ['laserinsulator', 'front'],
    ],
    5,
    59,
  ],
  [
    'insulator on one laser',
    'Medium Laser\nLaser Insulator',
    hoists,
    [
      ['medium-laser', 'front'],
      ['laserinsulator', 'front'],
    ],
    2,
    55,
  ],
  // The running-total guard: 1 - 1 = 0 is raised back to 1.
  [
    'insulated small laser keeps the one-heat minimum',
    'Small Laser\nLaser Insulator',
    hoists,
    [
      ['small-laser', 'front'],
      ['laserinsulator', 'front'],
    ],
    1,
    53.5,
  ],
  // MekFileParser.java:472-495; TestEntity.java:966-968.
  [
    'PPC capacitor (+5)',
    'PPC\nPPC Capacitor',
    hoists,
    [
      ['ppc', 'front'],
      ['ppc-capacitor', 'front'],
    ],
    15,
    74.5,
  ],
  [
    'two lasers and a capacitor PPC',
    'Medium Laser\nMedium Laser\nPPC\nPPC Capacitor',
    hoists,
    [
      ['medium-laser', 'front'],
      ['medium-laser', 'front'],
      ['ppc', 'front'],
      ['ppc-capacitor', 'front'],
    ],
    21,
    82.5,
  ],
  // The insulator only links a laser in its own location.
  [
    'insulator in another location links nothing',
    'Medium Laser\nMedium Laser',
    'Laser Insulator',
    [
      ['medium-laser', 'front'],
      ['medium-laser', 'front'],
      ['laserinsulator', 'rear'],
    ],
    6,
    54,
  ],
  // Miscellaneous heat (MiscType.java:1423-1441; TestEntity.java:971-979):
  // the RISC Laser Pulse Module adds 2.
  [
    'RISC laser pulse module (+2)',
    'Medium Laser\nRISC Laser Pulse Module',
    hoists,
    [
      ['medium-laser', 'front'],
      ['risclaserpulsemodule', 'front'],
    ],
    5,
    58.5,
  ],
  // TestEntity.java:974-977: fusion and fission skip the welder's heat.
  [
    'Spot Welder on a fusion engine adds nothing',
    'Medium Laser\nSpot Welder',
    hoists,
    [
      ['medium-laser', 'front'],
      ['spot-welder', 'front'],
    ],
    3,
    57.5,
  ],
  [
    'Spot Welder on an ICE engine (+2)',
    'Medium Laser\nSpot Welder',
    hoists,
    [
      ['medium-laser', 'front'],
      ['spot-welder', 'front'],
    ],
    5,
    68,
    true,
  ],
];

describe.each(
  synthetic.map(([label, front, rear, mounts, javaHeat, javaTotal, ice]) => ({
    label,
    front,
    rear,
    mounts,
    javaHeat,
    javaTotal,
    ice,
  })),
)(
  'synthetic support chassis: $label',
  ({ front, rear, mounts, javaHeat, javaTotal, ice }) => {
    it('charges the Java heat in the handler total', () => {
      const parsed = new BlkParserService().parse(
        blk(front, rear, ice ? '1' : '0'),
      );
      if (!parsed.success) throw new Error('fixture parse');
      const handler = new SupportVehicleUnitHandler();
      const result = handler.parse(parsed.data.document);
      if (!result.success) throw new Error('handler parse');
      const weight = computeSupportVehicleWeight(result.data.unit);
      expect(weight.unresolved).toEqual([]);
      expect(weight.heatSinks).toBe(javaHeat);
      expect(handler.calculateWeight(result.data.unit)).toBe(javaTotal);
    });
    it('charges the Java heat in the editor', () => {
      const state = loadState(
        'Jifty Transportable Field Repair Unit JI-50 (ML)',
      );
      const template = state.equipment[0];
      if (ice) state.engineType = EngineType.ICE;
      state.equipment = mounts.map(([equipmentId, where], i) => ({
        ...template,
        id: String(i),
        equipmentId,
        location:
          where === 'front' ? VehicleLocation.FRONT : VehicleLocation.REAR,
      }));
      expect(computeVehicleWeightBreakdown(state, resolve).heatSinks).toBe(
        javaHeat,
      );
    });
  },
);

// Nova CEWS adds 2 heat in Java (count 5 beside a medium laser; MiscType.java:1436-1439).
// The editor and the support handler both resolve it: the handler's BV lookup
// learned the display name `Nova CEWS` (a registered lookup name,
// MiscType.java:6192-6193) when d4 added it to the native identity table.
it('Nova CEWS adds 2 heat in the editor and in the support handler', () => {
  const state = loadState('Jifty Transportable Field Repair Unit JI-50 (ML)');
  const template = state.equipment[0];
  state.equipment = [
    'medium-laser',
    'nova-combined-electronic-warfare-system-cews',
  ].map((equipmentId, i) => ({
    ...template,
    id: String(i),
    equipmentId,
    location: VehicleLocation.FRONT,
  }));
  expect(computeVehicleWeightBreakdown(state, resolve).heatSinks).toBe(5);
  const parsed = new BlkParserService().parse(
    blk('Medium Laser\nNova CEWS', hoists),
  );
  if (!parsed.success) throw new Error('fixture parse');
  const result = new SupportVehicleUnitHandler().parse(parsed.data.document);
  if (!result.success) throw new Error('handler parse');
  const weight = computeSupportVehicleWeight(result.data.unit);
  expect(weight.unresolved).toEqual([]);
  expect(weight.heatSinks).toBe(5);
});

// TestSupportVehicle.java:928-930: a small support vehicle (under 5 t) needs no
// sinks whatever it mounts. Pinned Java on a 4 t ICE chassis with a medium
// laser, a PPC and a Spot Welder: count 0 (it would be 15 if the weapons and
// the welder counted). The handler flags the weapons unresolved on a chassis
// this small, so only the welder's heat can reach it.
it('charges no sinks under 5 tons whatever it mounts', () => {
  const state = loadState('Jifty Transportable Field Repair Unit JI-50 (ML)');
  const template = state.equipment[0];
  state.tonnage = 4;
  state.engineType = EngineType.ICE;
  state.equipment = ['medium-laser', 'ppc', 'spot-welder'].map(
    (equipmentId, i) => ({
      ...template,
      id: String(i),
      equipmentId,
      location: VehicleLocation.FRONT,
    }),
  );
  expect(computeVehicleWeightBreakdown(state, resolve).heatSinks).toBe(0);
  const parsed = new BlkParserService().parse(
    blk('Medium Laser\nPPC\nSpot Welder', hoists, '1', '4.0'),
  );
  if (!parsed.success) throw new Error('fixture parse');
  const result = new SupportVehicleUnitHandler().parse(parsed.data.document);
  if (!result.success) throw new Error('handler parse');
  expect(computeSupportVehicleWeight(result.data.unit).heatSinks).toBe(0);
});

// The one owner of the insulator-link laser rule: an energy weapon whose name
// says laser, in either category form the callers hold (registry enum for the
// editor, BV catalog string for the support handler); unresolved is never one.
it.each([
  [{ category: EquipmentCategory.ENERGY_WEAPON, name: 'Medium Laser' }, true],
  [{ category: 'Energy', name: 'ER Small Pulse Laser' }, true],
  [{ category: EquipmentCategory.ENERGY_WEAPON, name: 'PPC' }, false],
  [{ category: 'Energy', name: 'Flamer' }, false],
  [
    { category: EquipmentCategory.BALLISTIC_WEAPON, name: 'Laser Rifle' },
    false,
  ],
  [{ category: 'Ballistic', name: 'Laser Rifle' }, false],
  [undefined, false],
])('classifies %j as an insulator-linkable laser: %s', (item, expected) => {
  expect(isInsulatorLinkableLaser(item)).toBe(expected);
});
