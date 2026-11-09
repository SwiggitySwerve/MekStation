/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createSupportRegistryMass } from '@/services/units/handlers/supportRegistryMass';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';

import { computeVehicleMountedWeightFigures } from '../mountedWeight';
import { computeSupportVehicleWeight } from '../supportWeight';
import {
  applyVehicleDumperWeights,
  isFireControlBasisWeapon,
  resolveVehicleVariableMass,
  type IVehicleDumperMount,
} from '../variableEquipmentMass';
import fixture from './supportMiscMasses.pinned.json';

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

const LOCATIONS = ['Body', 'Front', 'Right', 'Left', 'Rear', 'Turret'];
type Row = (typeof fixture.rows)[number];

/** A row replaces every equipment block of its base (unlisted blocks are emptied). */
function blk(row: Row): string {
  let text = fixture.bases[row.base as keyof typeof fixture.bases];
  const blocks = row.blocks as Record<string, string[]>;
  for (const loc of LOCATIONS) {
    const body = (blocks[loc] ?? []).map((item) => `${item}\n`).join('');
    const block = `<${loc} Equipment>\n${body}</${loc} Equipment>`;
    const present = new RegExp(
      `<${loc} Equipment>\\n[\\s\\S]*?</${loc} Equipment>`,
    );
    if (present.test(text)) text = text.replace(present, block);
    else if (body)
      text = text.replace(
        '</Body Equipment>\n',
        `</Body Equipment>\n\n${block}\n`,
      );
  }
  return text;
}

const handler = new SupportVehicleUnitHandler();
function weigh(row: Row) {
  const parsed = new BlkParserService().parse(blk(row));
  if (!parsed.success) throw new Error(`parse ${row.name}`);
  const result = handler.parse(parsed.data.document);
  if (!result.success) throw new Error(`handler ${row.name}`);
  const unit = result.data.unit;
  return computeSupportVehicleWeight(
    unit,
    createSupportRegistryMass(unit.techBase),
  );
}

// MegaMek 48fcb2f64 TestSupportVehicle terms of 67 synthetic sources built from
// the Lesseps (50 t), Skoda (1 t) and Cascatelle (60 t VTOL) corpus excerpts:
// ladder MiscType.java:841-843, dumper Mounted.java:729-738 and
// MekFileParser.java:854-885, fluid suction MiscType.java:7578-7583, fire-control
// basis MiscType.java:707-725.
describe('rule sweep against the pinned verifier', () => {
  it.each(fixture.rows.filter((row) => row.group === 'rules'))(
    '$name equals the pinned Java terms',
    (row) => {
      const weight = weigh(row);
      expect(weight.unresolved).toEqual([]);
      expect(weight.weapons).toBeCloseTo(row.java.weapons, 9);
      expect(weight.ammo).toBeCloseTo(row.java.ammo, 9);
      expect(weight.miscEquipment).toBeCloseTo(row.java.miscEquipment, 9);
    },
  );
});

describe('ladder and fluid suction owner', () => {
  const ladder = { id: 'ladder', weight: 0, special: ['Variable weight'] };
  it.each([
    [0.5, 0.003], // nearest kg, not next kg: sizes below are pinned by the sweep
    [2.01, 0.01],
    [7.3, 0.037],
    [33.33, 0.167],
    [5, 0.025],
    [15, 0.075],
    [20, 0.1],
    [25, 0.125],
    [100, 0.5],
    [120, 0.6],
  ])(
    'a size-%s ladder weighs %s t on a large and a small vehicle',
    (size, expected) => {
      for (const tonnage of [50, 1])
        expect(
          resolveVehicleVariableMass(ladder, `Ladder:SIZE:${size}`, {
            tonnage,
            isSupportVehicle: true,
          }),
        ).toBeCloseTo(expected, 9);
    },
  );
  it('weighs the standard fluid suction system a fixed 1 t', () => {
    expect(
      resolveVehicleVariableMass(
        {
          id: 'fluid-suction-system-standard',
          weight: 1,
          special: ['Variable weight'],
        },
        'Fluid Suction System (Standard)',
        { tonnage: 60, isSupportVehicle: true },
      ),
    ).toBe(1);
  });
});

describe('dumper pass', () => {
  const mount = (
    id: string,
    location: string,
    sourceId = id,
  ): IVehicleDumperMount<string> => ({ id, location, sourceId, weight: null });
  const dumpers = (
    mounts: IVehicleDumperMount<string>[],
    tonnage = 50,
  ): (number | null)[] => {
    applyVehicleDumperWeights(mounts, { tonnage, isSupportVehicle: true });
    return mounts.filter((m) => m.id.startsWith('dumper')).map((m) => m.weight);
  };
  it.each([
    [0.5, 0.5],
    [10.5, 1],
    [21, 1.5],
    [49.5, 2.5],
  ])(
    'rounds 5%% of a size-%s cargo up to the half ton (%s t)',
    (size, expected) => {
      expect(
        dumpers([
          mount('dumper-rear', 'r'),
          mount('cargo', 'r', `Cargo:SIZE:${size}`),
        ]),
      ).toEqual([expected]);
    },
  );
  it('rounds up to the kilogram on a small support vehicle', () => {
    expect(
      dumpers(
        [mount('dumper-rear', 'r'), mount('cargo', 'r', 'Cargo:SIZE:10.5')],
        1,
      )[0],
    ).toBeCloseTo(0.525, 9);
  });
  it('links the first unlinked Cargo of its own location, in either order', () => {
    expect(
      dumpers([
        mount('cargo', 'r', 'Cargo:SIZE:10'),
        mount('dumper-rear', 'r'),
        mount('cargo', 'r', 'Cargo:SIZE:30'),
      ]),
    ).toEqual([0.5]);
  });
  it('gives a second dumper, another location, no cargo and Liquid Storage nothing', () => {
    expect(
      dumpers([
        mount('dumper-rear', 'r'),
        mount('dumper-rear', 'r'),
        mount('cargo', 'r', 'Cargo:SIZE:20'),
      ]),
    ).toEqual([1, 0]);
    expect(
      dumpers([
        mount('dumper-rear', 'r'),
        mount('cargo', 'f', 'Cargo:SIZE:20'),
      ]),
    ).toEqual([0]);
    expect(dumpers([mount('dumper-rear', 'r')])).toEqual([0]);
    expect(
      dumpers([
        mount('dumper-rear', 'r'),
        mount('liquid-storage', 'r', 'Liquid Storage:SIZE:10'),
        mount('cargo', 'r', 'Cargo:SIZE:6'),
      ]),
    ).toEqual([0.5]);
  });
});

describe('fire-control basis', () => {
  // The BV catalog names the Java class in `subType`, the editor's items only in
  // the `special` source reference; both must give the same answer.
  const reference = (cls: string) =>
    `https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/weapons/infantry/${cls}.java: x`;
  it.each([
    ['medium-laser', undefined, true],
    ['ams', 'Anti-Missile System', false],
    ['clan-ams', undefined, false],
    ['laser-ams', undefined, false],
    ['clan-laser-ams', 'Anti-Missile System', false],
    ['infantryassaultrifle-registry', 'InfantryRifleAutoRifleWeapon', false],
    ['infantrystandardsrm-registry', 'InfantrySupportSRMStandardWeapon', true],
    ['support-laser-registry', 'InfantrySupportLaserWeapon', true],
    [
      'infantryminigrenadeinferno-registry',
      'InfantryGrenadeMiniInfernoWeapon',
      true,
    ],
  ])('%s (%s) in the basis: %s', (id, subType, expected) => {
    expect(isFireControlBasisWeapon({ id, subType })).toBe(expected);
    if (subType)
      expect(
        isFireControlBasisWeapon({ id, special: [reference(subType)] }),
      ).toBe(expected);
  });
});

// The editor reads the same owners (dumper link, ladder size).
describe('editor path', () => {
  const figures = (file: string) =>
    computeVehicleMountedWeightFigures(
      mapToVehicleState(
        JSON.parse(
          readFileSync(
            join(process.cwd(), 'public/data/units/vehicles', file),
            'utf8',
          ),
        ),
      ),
      (id, isAmmo) =>
        getEquipmentLookupService().getMountedById(id, isAmmo === true),
    );
  // Equipment before this change: 25, 55 and 1.03 t (dumpers and ladders 0).
  it.each([
    ['Lesseps Dump Truck.json', 26], // + rear dumper, 5% of the 20 t cargo
    ['Brunel Dump Truck.json', 57.5], // + rear dumper, 5% of the 50 t cargo
    ['Saurer-Bucher Fire Engine TLF-LL6500.json', 2.03], // + two 100 m ladders
    // Advanced fire control 0.003 t (the SRM only), not 0.004 t: it was 0.049 t
    ['Limpet Half-Track.json', 0.048],
  ])('%s weighs %s t of equipment', (file, expected) => {
    const result = figures(file);
    expect(result.unresolvedMountIds).toEqual([]);
    expect(result.equipment).toBeCloseTo(expected, 9);
  });
});
