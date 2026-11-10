/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
import { createHash } from 'node:crypto';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { readBlkProtoEquipmentEntry } from '@/services/conversion/BlkProtoEquipmentEntry';
import sources from '@/services/units/handlers/__tests__/fixtures/source-load-legality.json';
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';
import { getCatalogHeatNeutralWeaponHeat } from '@/utils/construction/vehicle/supportPayload';

import {
  computeProtoWeight,
  computeProtoWeightBreakdown,
  getProtoMinimumWeight,
  getProtoMountWeight,
} from '../weight';
import oracle from './fixtures/weight-java.json';

const parser = new BlkParserService();
const handler = new ProtoMechUnitHandler();

function load(reference: (typeof oracle.rows)[number]) {
  const content =
    reference.content ??
    sources.nativeValidity.rows.find((row) => row.path === reference.path)
      ?.content;
  if (!content) throw new Error('Missing source: ' + reference.path);
  expect(createHash('sha256').update(content).digest('hex')).toBe(
    reference.sha256,
  );
  const document = parser.parse(content);
  if (!document.success) throw new Error(JSON.stringify(document.error));
  const parsed = handler.parse(document.data.document);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  return parsed.data.unit;
}

describe('pinned ProtoMech component mass', () => {
  it.each(oracle.rows)('matches complete kg for $path', (reference) => {
    const unit = load(reference);
    expect(computeProtoWeight(unit)).toEqual({
      total: reference.total,
      missingEquipment: [],
    });
    expect(getProtoMinimumWeight(unit)).toBe(reference.total);
  });

  it.each(oracle.rows)('matches every component for $path', (reference) => {
    const breakdown = computeProtoWeightBreakdown(load(reference));
    const terms: Record<string, number> = Object.fromEntries(
      Object.keys(reference.terms).map((term) => [term, 0]),
    );
    for (const [term, mass] of Object.entries(breakdown.core)) {
      if (mass === null) throw new Error('Unavailable core ' + term);
      terms[term] = mass;
    }
    if (breakdown.heatSinks === null) throw new Error('Unavailable heat load');
    terms.heatSinks = breakdown.heatSinks;
    for (const mount of breakdown.mounts) {
      const syntax = readBlkProtoEquipmentEntry(mount.equipmentId);
      const native = reference.mounts.find(
        (entry) => entry.id === syntax.lookupName,
      );
      if (!native || mount.weight === null)
        throw new Error('Unavailable mount ' + mount.equipmentId);
      terms[native.kind] += mount.weight;
    }
    for (const [term, mass] of Object.entries(reference.terms))
      expect(terms[term]).toBeCloseTo(mass, 9);
  });

  it.each(oracle.boundaries)(
    'matches native $id mount mass at $tonnage tons',
    ({ id, tonnage, mass }) => {
      const unit = {
        weightPerUnit: tonnage,
        engineRating: 0,
        armorType: 42,
        hasMainGun: false,
        armorByLocation: {
          [L.HEAD]: 0,
          [L.TORSO]: 0,
          [L.LEFT_ARM]: 0,
          [L.RIGHT_ARM]: 0,
          [L.LEGS]: 0,
          [L.MAIN_GUN]: 0,
        },
        equipment: [],
      };
      const empty = computeProtoWeight(unit).total;
      const mounted = computeProtoWeight({
        ...unit,
        equipment: [{ equipmentId: id, location: L.TORSO }],
      });
      expect(mounted.missingEquipment).toEqual([]);
      if (empty === null || mounted.total === null)
        throw new Error('Unavailable mass');
      expect(mounted.total - empty).toBeCloseTo(mass, 9);
    },
  );

  it('does not certify a Java variable-weight zero without unit context', () => {
    expect(getProtoMountWeight('ProtoMechJumpJet')).toBeUndefined();
    expect(getProtoMountWeight('CLMyomerBooster')).toBeUndefined();
  });

  it('keeps unsupported mounts explicit while retaining a lower bound', () => {
    const reference = oracle.rows.find((row) =>
      row.path.endsWith('/Hydra 2.blk'),
    );
    if (!reference) throw new Error('Missing Hydra');
    const unit = load(reference);
    const unknown = {
      ...unit,
      equipment: [
        ...unit.equipment,
        { id: 'unknown', equipmentId: 'unknown-mass', location: L.TORSO },
      ],
    };
    expect(computeProtoWeight(unknown)).toEqual({
      total: null,
      missingEquipment: ['unknown-mass'],
    });
    expect(getProtoMinimumWeight(unknown)).toBeLessThanOrEqual(reference.total);
  });

  it('uses the exported heat adapter for ammunition-fed lasers and plasma', () => {
    const item = {
      id: 'probe',
      name: 'Medium Chemical Laser',
      category: 'Energy',
      heat: 2,
      special: ['Requires ammo'],
      battleValue: 0,
      techBase: 'Clan',
    };
    expect(getCatalogHeatNeutralWeaponHeat(item)).toBe(0);
    expect(
      getCatalogHeatNeutralWeaponHeat({
        ...item,
        name: 'Plasma Cannon',
        heat: 7,
      }),
    ).toBe(7);
    expect(
      getCatalogHeatNeutralWeaponHeat({
        ...item,
        name: 'ER Medium Laser',
        heat: 5,
        special: [],
      }),
    ).toBe(5);
  });
});
