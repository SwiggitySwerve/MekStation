import { createHash } from 'crypto';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import * as equipmentBV from '@/utils/construction/equipmentBVResolver';

import { calculateProtoMechBV } from '../protoMechBV';
import sources from './fixtures/bv-residual-sources.json';
import { buildProto, mount } from './protoMechBV.test.helpers';

jest.mock('@/utils/construction/equipmentBVResolver', () => ({
  __esModule: true,
  ...jest.requireActual<typeof equipmentBV>(
    '@/utils/construction/equipmentBVResolver',
  ),
}));

// MegaMek 48fcb2f6 / mm-data 50f7efef; full pinned BLKs and Java stages.
const handler = new ProtoMechUnitHandler();
function load(content: string) {
  const document = new BlkParserService().parse(content);
  if (!document.success) throw new Error(document.error.errors.join('; '));
  const parsed = handler.parse(document.data.document);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  return parsed.data.unit;
}

afterEach(() => jest.restoreAllMocks());

it.each(sources)('$path retains the native Quad equipment term', (source) => {
  expect(createHash('sha256').update(source.content).digest('hex')).toBe(
    source.sha256,
  );
  const unit = load(source.content);
  const b = handler.calculateBVBreakdown(unit);
  const quad = unit.equipment.some(
    (m) => m.equipmentId === 'ProtoQuadMeleeSystem',
  );
  if (quad) {
    const without = handler.calculateBVBreakdown({
      ...unit,
      equipment: unit.equipment.filter(
        (m) => m.equipmentId !== 'ProtoQuadMeleeSystem',
      ),
    });
    expect(b.offensiveEquipmentBV - without.offensiveEquipmentBV).toBe(5);
  }
  expect(b.defensiveBV).toBeCloseTo(source.javaDefensive, 10);
  const dispatched = calculateBattleValueForUnit(unit);
  expect(dispatched?.kind).toBe('protomech');
  if (dispatched?.kind !== 'protomech') throw new Error('Wrong dispatcher');
  expect(dispatched.breakdown).toEqual(b);
  expect(handler.calculateBV(unit)).toBe(b.final);
});

it.each(sources)(
  '$path matches Java when missing catalog facts are supplied',
  (source) => {
    // Catalog boundary only: MiscType.java:9401, ArmorType.java:1405,
    // CLFussilade.java:81. These are owner defects, not production overrides.
    const original = equipmentBV.resolveEquipmentBV;
    const missing: Record<string, number> = {
      ProtoMagneticClamp: 1,
      'Clan Electric Discharge ProtoMech': 32,
      Fusillade: 11,
    };
    jest
      .spyOn(equipmentBV, 'resolveEquipmentBV')
      .mockImplementation((id) =>
        id in missing
          ? { battleValue: missing[id], heat: 0, resolved: true }
          : original(id),
      );
    const unit = load(source.content);
    const b = handler.calculateBVBreakdown(unit);
    expect(b.offensiveEquipmentBV).toBe(source.javaOffensiveEquipment);
    expect(b.offensiveBV).toBeCloseTo(source.javaOffensive, 10);
    expect(b.final).toBe(source.javaTotal);
    const fusillades = unit.equipment.filter(
      (m) => m.equipmentId === 'Fusillade',
    ).length;
    if (fusillades) {
      // Its two built-in shots do not double launcher BV or add ammo BV.
      const without = handler.calculateBVBreakdown({
        ...unit,
        equipment: unit.equipment.filter((m) => m.equipmentId !== 'Fusillade'),
      });
      expect(b.weaponBV - without.weaponBV).toBe(11 * fusillades);
      expect(b.ammoBV).toBe(without.ammoBV);
    }
  },
);

it.each([4, 5, 6, 10, 11])(
  'Quad melee BV uses ceiling at %s tons',
  (tonnage) => {
    const b = calculateProtoMechBV(
      buildProto({
        tonnage,
        equipment: [mount('ProtoQuadMeleeSystem', ProtoLocation.TORSO)],
      }),
    );
    expect(b.offensiveEquipmentBV).toBe(2.5 * Math.ceil(0.2 * tonnage));
    expect(b.weaponBV).toBe(0);
  },
);
