import { BlkParserService } from '@/services/conversion/BlkParserService';
/** @spec openspec/changes/establish-all-unit-data-parity/specs/equipment-services/spec.md */
import { normalizeEquipmentId as normalizeMTFEquipment } from '@/services/conversion/MTFParser.mapping';
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';
import {
  buildProto,
  mount,
} from '@/utils/construction/protomech/__tests__/protoMechBV.test.helpers';
import { calculateProtoMechBV } from '@/utils/construction/protomech/protoMechBV';

import {
  getEquipmentEntry,
  normalizeEquipmentId,
  resetCatalogCache,
  resolveEquipmentBV,
} from '../equipmentBVResolver';

afterEach(resetCatalogCache);

// Actual EquipmentType registry observations, MegaMek 48fcb2f6.
const native = [
  [1, 15],
  [3, 30],
  [5, 47],
] as const;

describe.each(native)('ProtoMek SRM %i', (rack, bv) => {
  const id = `clan-srm-${rack}`;
  const names = [
    `CLSRM${rack}`,
    `Clan SRM ${rack}`,
    `Clan SRM-${rack}`,
    `SRM ${rack}`,
  ];

  it.each(
    names.flatMap((name) => [name, name.toLowerCase(), name.toUpperCase()]),
  )('resolves native %s independently of battle armor', (name) => {
    expect(normalizeEquipmentId(name)).toBe(id);
    expect(normalizeMTFEquipment(name)).toBe(id);
    expect(getEquipmentEntry(name)).toMatchObject({
      id,
      techBase: 'CLAN',
      battleValue: bv,
    });
    expect(resolveEquipmentBV(name)).toEqual({
      resolved: true,
      battleValue: bv,
      heat: 0,
    });
  });

  it('contributes native weapon BV once per mount', () => {
    const unit = buildProto({
      tonnage: 5,
      equipment: [
        mount(id, ProtoLocation.TORSO),
        mount(`CLSRM${rack}`, ProtoLocation.TORSO),
      ],
    });
    expect(calculateProtoMechBV(unit).weaponBV).toBe(bv * 2);
  });
});

it.each([
  ['basrm1', 15],
  ['basrm3', 21],
  ['basrm5', 47],
] as const)(
  'preserves explicit legacy %s without claiming native BA parity',
  (id, bv) => {
    expect(normalizeEquipmentId(id)).toBe(id);
    expect(resolveEquipmentBV(id)).toMatchObject({
      resolved: true,
      battleValue: bv,
    });
  },
);

it('uses the corrected SRM 3 in source-handler BV without rewriting equipment', () => {
  const text =
    '<UnitType>\nProtoMek\n</UnitType>\n<Name>\nSRM probe\n</Name>\n<Model>\nA\n</Model>\n<year>\n3060\n</year>\n<type>\nClan Level 3\n</type>\n<tonnage>\n5\n</tonnage>\n<motion_type>\nBiped\n</motion_type>\n<cruiseMP>\n4\n</cruiseMP>\n<armor>\n3\n7\n2\n2\n5\n</armor>\n<Torso Equipment>\nCLSRM3\n</Torso Equipment>';
  const parser = new BlkParserService();
  const handler = new ProtoMechUnitHandler();
  const parsed = parser.parse(text);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const loaded = handler.parse(parsed.data.document);
  if (!loaded.success) throw new Error(loaded.error.errors.join('; '));
  const unit = loaded.data.unit;
  const before = JSON.stringify(unit);
  const without = handler.calculateBV({ ...unit, equipment: [] });
  // Run 6 gives speed factor 1.12; this unit's isolated weapon adds 34 final BV.
  expect(handler.calculateBV(unit) - without).toBe(34);
  expect(unit.equipment[0].equipmentId).toBe('CLSRM3');
  expect(JSON.stringify(unit)).toBe(before);
});
