/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createSupportRegistryMass } from '@/services/units/handlers/supportRegistryMass';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';

import { computeSupportVehicleWeight } from '../supportWeight';
import { supportChassisBlk } from './supportChassisBlk.test.helpers';

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

/**
 * Pinned MegaMek 48fcb2f64, original classes, on the shared Jifty-chassis BLK
 * with only the front equipment block edited (TestSupportVehicle verifier).
 * The support handler receives the raw BLK token. For `LRT n` and `SRT n` the
 * BV catalog matches the legacy name stubs `lrtorpedoN` and `srtN`, which weigh
 * half the Java launcher; the unit loader resolves the same token to the
 * Java-derived registry entry (`lrt-10-registry`, 5 t). The pure payload rule
 * takes an injected registry mass; the handler injects the service-built lookup
 * (`createSupportRegistryMass`), which answers only for registry entries.
 */
const torpedoes: readonly (readonly [
  token: string,
  javaWeapons: number,
  javaTotal: number,
])[] = [
  ['LRT 5', 2, 53.5],
  ['LRT 10', 5, 56.5],
  ['LRT 15', 7, 58.5],
  ['LRT 20', 10, 61.5],
  ['SRT 2', 1, 52.5],
  ['SRT 4', 2, 53.5],
  ['SRT 6', 3, 54.5],
  ['LRT 10\nLRT 15\nSRT 2\nSRT 4', 15, 66.5],
];

const unitFor = (front: string) => {
  const parsed = new BlkParserService().parse(supportChassisBlk(front));
  if (!parsed.success) throw new Error('fixture parse');
  const handler = new SupportVehicleUnitHandler();
  const result = handler.parse(parsed.data.document);
  if (!result.success) throw new Error('handler parse');
  return { handler, unit: result.data.unit };
};

// The handler's own wiring: the service-built lookup feeds the pure rule.
const weigh = (front: string) => {
  const { handler, unit } = unitFor(front);
  return {
    weight: computeSupportVehicleWeight(
      unit,
      createSupportRegistryMass(unit.techBase),
    ),
    total: handler.calculateWeight(unit),
  };
};

it.each(torpedoes)(
  'weighs %j torpedo launchers at the Java mass',
  (token, javaWeapons, javaTotal) => {
    const { weight, total } = weigh(token);
    expect(weight.unresolved).toEqual([]);
    expect(weight.weapons).toBe(javaWeapons);
    expect(total).toBe(javaTotal);
  },
);

// Ammunition mounts stay on their existing path: the launcher takes the
// registry mass, the bin keeps its own (Java 1 t).
it('keeps the torpedo ammunition bin on its existing path', () => {
  const { weight, total } = weigh('LRT 10\nIS Ammo LRTorpedo-10');
  expect(weight.unresolved).toEqual([]);
  expect(weight.weapons).toBe(5);
  expect(weight.ammo).toBe(1);
  expect(total).toBe(57.5);
});

// Guard cases. The resolver also answers for equipment whose definition is not a
// Java-derived registry entry, and there its weight is not the pinned mass:
// the resolver says 0 for the wrecking ball and flail (the BV entries say 4 and
// 5, Java 4 and 5) and 1 for cargo (variable by size, Java 20 t for size 20).
// These stay on the BV entry; a registry-only rule must not reach them.
it.each([
  ['Wrecking Ball', 10, 55.5],
  ['Flail', 11, 56.5],
  ['Cargo:SIZE:20.0', 26, 71.5],
] as const)('keeps %s on its BV entry', (token, javaMiscEquip, javaTotal) => {
  const { weight, total } = weigh(token);
  expect(weight.unresolved).toEqual([]);
  expect(weight.miscEquipment).toBe(javaMiscEquip);
  expect(total).toBe(javaTotal);
});

// The pure payload rule, with a lookup injected directly: a non-ammunition mount
// uses the injected mass when there is one, otherwise its BV catalog entry's;
// ammunition never takes it.
describe('support payload rule with an injected registry mass', () => {
  const launcher = 'LRT 10';
  it('uses the injected mass for a non-ammunition mount', () => {
    const { unit } = unitFor(launcher);
    expect(
      computeSupportVehicleWeight(unit, (id) =>
        id === launcher ? 5 : undefined,
      ).weapons,
    ).toBe(5);
  });
  it('keeps the BV entry without a lookup or when it has no answer', () => {
    const { unit } = unitFor(launcher);
    expect(computeSupportVehicleWeight(unit).weapons).toBe(2.5);
    expect(computeSupportVehicleWeight(unit, () => undefined).weapons).toBe(
      2.5,
    );
  });
  it('never applies the injected mass to an ammunition bin', () => {
    const { unit } = unitFor(`${launcher}\nIS Ammo LRTorpedo-10`);
    const weight = computeSupportVehicleWeight(unit, () => 9);
    expect(weight.weapons).toBe(9);
    expect(weight.ammo).toBe(1);
  });
});
