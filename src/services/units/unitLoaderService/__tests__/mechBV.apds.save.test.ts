import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildEditableMechBVInput,
  buildEditableMechProjectionInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { Era } from '@/types/temporal/Era';
import { getAmsBVWeaponKind } from '@/utils/construction/battleValueDefensive';
import {
  getAmmunitionEntry,
  getEquipmentEntry,
  resolveEquipmentBV,
} from '@/utils/construction/equipmentBVResolver';
import { mechBVTerms } from '@/utils/construction/mechBV/bvTrace';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

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
const score = (state: ReturnType<typeof load>) => {
  const input = buildEditableMechBVInput(
    projectEditableMech(
      buildEditableMechProjectionInput(state),
      Math.floor(state.engineRating / state.tonnage),
      state.id,
    ),
  );
  const result = calculateUnitBV(input, input.id);
  if (!result.breakdown) throw new Error('Missing runtime BV breakdown');
  return {
    bv: result.bv,
    defensiveEquipmentBV: mechBVTerms(result.breakdown).defensiveEquipmentBV,
  };
};

// Pinned 48fcb2f64 BVCalculator.java:549-632 and C3 JavaAmsProbe:
// 64 weapon + min(64, 22 ammo) per APDS mount. Harvey also has 10 BV of M-Pods.
it.each([
  ["Jackalope JLP-BD-L 'Harvey'.json", 1, 10],
  ['Jackalope JLP-KB.json', 1, 0],
  ['Osprey OSP-36.json', 2, 0],
  ["Vulpes VLP-1DX 'Beast'.json", 1, 0],
] as const)(
  'retains the Java APDS defensive term at load and both saved ammo spellings: %s',
  (file, mounts, otherDefensiveBV) => {
    const state = load(`6-dark-age/experimental/${file}`);
    const loaded = score(state);
    const saved = serializeCustomUnitState(state, {
      id: `custom-${state.id}`,
      chassis: state.chassis,
      variant: state.model,
      era: Era.DARK_AGE,
    });
    const reopen = (ammoToken: string) => {
      const document = parseUnit(JSON.parse(JSON.stringify(saved)));
      let bins = 0;
      const criticalSlots = Object.fromEntries(
        Object.entries(document.criticalSlots ?? {}).map(
          ([location, slots]) => [
            location,
            slots.map((token) => {
              if (
                token === 'RISC Advanced Point Defense System Ammo' ||
                token === 'ISAPDS Ammo'
              ) {
                bins++;
                return ammoToken;
              }
              return token;
            }),
          ],
        ),
      );
      expect(bins).toBe(mounts);
      expect(
        Object.values(criticalSlots)
          .flat()
          .filter((token) => token === 'RISC Advanced Point Defense System'),
      ).toHaveLength(mounts * 2);
      return score(
        loader.mapToUnitState(
          parseUnit(JSON.parse(JSON.stringify({ ...document, criticalSlots }))),
          false,
        ),
      );
    };
    const display = reopen('RISC Advanced Point Defense System Ammo');
    const native = reopen('ISAPDS Ammo');
    process.stdout.write(
      `APDS_MEASUREMENT ${JSON.stringify({ unit: file, loaded, display, native })}\n`,
    );
    for (const result of [loaded, display, native]) {
      expect(result.defensiveEquipmentBV - otherDefensiveBV).toBe(mounts * 86);
    }
  },
);

it.each(['ISAPDS', 'risc-apds', 'RISC Advanced Point Defense System'])(
  'resolves %s to the existing mech catalog identity',
  (name) => {
    expect(getEquipmentEntry(name)?.id).toBe('risc-apds');
    expect(resolveEquipmentBV(name)).toMatchObject({
      resolved: true,
      battleValue: 64,
    });
  },
);

it.each(['ISAPDS Ammo', 'RISC Advanced Point Defense System Ammo'])(
  'resolves %s only as ammunition',
  (name) => {
    expect(getAmmunitionEntry(name)).toMatchObject({
      id: 'isapds-ammo-registry',
      category: 'AMS',
      battleValue: 22,
    });
    expect(getAmsBVWeaponKind(name)).toBeUndefined();
  },
);

it('retains the distinct Battle Armor APDS identity and BV', () => {
  expect(getEquipmentEntry('ISBAAPDS')).toMatchObject({
    id: 'isbaapds-registry',
    battleValue: 7,
  });
  expect(getAmsBVWeaponKind('ISBAAPDS')).toBeUndefined();
});

it('caps excessive APDS ammunition at the surviving resolved weapon BV', () => {
  const state = load('6-dark-age/experimental/Jackalope JLP-KB.json');
  const input = buildEditableMechBVInput(
    projectEditableMech(
      buildEditableMechProjectionInput(state),
      Math.floor(state.engineRating / state.tonnage),
      state.id,
    ),
  );
  // Exercise the runtime critical consumer with the serializer's exact tokens.
  input.criticalSlots = {
    RIGHT_TORSO: [
      'RISC Advanced Point Defense System',
      'RISC Advanced Point Defense System',
      ...Array<string>(4).fill('RISC Advanced Point Defense System Ammo'),
    ],
  };
  const result = calculateUnitBV(input, input.id);
  expect(result.breakdown?.defEquipBV).toBe(128);
  input.criticalSlots.RIGHT_TORSO.splice(0, 2);
  expect(calculateUnitBV(input, input.id).breakdown?.defEquipBV).toBe(0);
});

it('retains the standard AMS control through save and reopen', () => {
  const state = load('6-dark-age/advanced/Brahma BRM-6T.json');
  const loaded = score(state);
  const saved = serializeCustomUnitState(state, {
    id: 'custom-ams-control',
    chassis: state.chassis,
    variant: state.model,
    era: Era.DARK_AGE,
  });
  const reopened = score(
    loader.mapToUnitState(parseUnit(JSON.parse(JSON.stringify(saved))), false),
  );
  process.stdout.write(`AMS_CONTROL ${JSON.stringify({ loaded, reopened })}\n`);
  expect(loaded.defensiveEquipmentBV).toBe(43);
  expect(reopened.defensiveEquipmentBV).toBe(loaded.defensiveEquipmentBV);
});
