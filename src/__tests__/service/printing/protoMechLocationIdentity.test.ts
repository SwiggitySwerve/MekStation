/** @spec openspec/changes/establish-all-unit-data-parity/specs/customizer-tabs/spec.md */
import fs from 'fs';
import path from 'path';

import * as protoBindings from '@/services/printing/svgRecordSheetRenderer/protomech/bindings';
import { UnitContract } from '@/types/contracts';

import {
  initializeEquipment,
  verifyCatalogUnit,
} from './catalogRecordSheets.helpers';

jest.mock(
  '@/services/printing/svgRecordSheetRenderer/protomech/bindings',
  () => {
    const actual = jest.requireActual<typeof protoBindings>(
      '@/services/printing/svgRecordSheetRenderer/protomech/bindings',
    );
    return { ...actual, bindProtoMech: jest.fn(actual.bindProtoMech) };
  },
);

const entry = { id: 'basilisk', path: 'Basilisk.json' };
const source = UnitContract.parse(
  JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), 'public/data/units/protomechs', entry.path),
      'utf8',
    ),
  ),
);
// Asymmetric armor catches arm swaps; native symmetric structure stays unchanged.
const fixture = {
  ...source,
  armor: {
    ...source.armor,
    byLocation: {
      HEAD: 2,
      TORSO: 11,
      LEGS: 7,
      LEFT_ARM: 3,
      RIGHT_ARM: 4,
      MAIN_GUN: 1,
    },
  },
};
const { bindProtoMech } = jest.requireActual<typeof protoBindings>(
  '@/services/printing/svgRecordSheetRenderer/protomech/bindings',
);
const verify = () =>
  verifyCatalogUnit('protomechs', entry, () => JSON.stringify(fixture));

describe('ProtoMech catalog location identity acceptance', () => {
  beforeAll(initializeEquipment);
  beforeEach(() =>
    jest.mocked(protoBindings.bindProtoMech).mockImplementation(bindProtoMech),
  );

  it('accepts all biped locations with their domain armor and structure', () => {
    const row = verify();
    expect(row.rejection).toBeUndefined();
    expect(row.differences).toEqual([]);
  });

  it.each(['LA', 'MG'] as const)(
    'rejects missing required %s binding',
    (code) => {
      jest.mocked(protoBindings.bindProtoMech).mockImplementation((data) => {
        const bindings = bindProtoMech(data);
        const pipCounts = { ...bindings.pipCounts };
        delete pipCounts[code];
        return { ...bindings, pipCounts };
      });
      const row = verify();
      expect(row.rejection).toBeUndefined();
      expect(row.differences.map(({ field }) => field)).toEqual([
        `armor.${code}`,
        `structure.${code}`,
      ]);
    },
  );

  it.each([
    ['LA', 'RA'],
    ['T', 'L'],
  ] as const)('rejects swapped %s/%s location bindings', (left, right) => {
    jest.mocked(protoBindings.bindProtoMech).mockImplementation((data) => {
      const bindings = bindProtoMech(data);
      return {
        ...bindings,
        pipCounts: {
          ...bindings.pipCounts,
          [left]: bindings.pipCounts[right],
          [right]: bindings.pipCounts[left],
        },
      };
    });
    const row = verify();
    expect(row.rejection).toBeUndefined();
    expect(row.differences.map(({ field }) => field)).toEqual(
      left === 'LA'
        ? ['armor.LA', 'armor.RA']
        : ['armor.T', 'structure.T', 'armor.L', 'structure.L'],
    );
  });

  it('accepts an absent main gun without requiring its nonexistent location', () => {
    const row = verifyCatalogUnit('protomechs', entry, () =>
      JSON.stringify({
        ...fixture,
        hasMainGun: false,
        mainGun: undefined,
        equipment: fixture.equipment?.filter(
          ({ location }) => location !== 'MAIN_GUN',
        ),
        armor: {
          ...fixture.armor,
          byLocation: { ...fixture.armor.byLocation, MAIN_GUN: 0 },
        },
      }),
    );
    expect(row.rejection).toBeUndefined();
    expect(row.differences).toEqual([]);
  });
});
