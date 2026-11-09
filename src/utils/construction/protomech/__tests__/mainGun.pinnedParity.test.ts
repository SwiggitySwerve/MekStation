/**
 * Main Gun and arm placement against the pinned Java verifier.
 *
 * Every canonical ProtoMech is loaded through the production mapper and its
 * placement verdict, location limits, slot classification and mount weights are
 * compared with `fixtures/main-gun-java-verdicts.json`, which
 * `fixtures/ProtoMekPlacementProbe.java` produced by running the original
 * `TestProtoMek` at MegaMek 48fcb2f64 over the mm-data 50f7efe BLK files.
 *
 * Scope: Main Gun and arms (TestProtoMek.java:593-665 and the slot/weight/weapon
 * checks in hasIllegalEquipmentCombinations, 296-380). Torso needs the armor slot
 * and variable-weight miscellany and is not part of this rule.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import fs from 'node:fs';
import path from 'node:path';

import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';
import {
  getProtoLocationSlotLimit,
  getProtoLocationWeightLimit,
  protoMountTakesSlot,
  validateProtoMainGun,
} from '@/utils/construction/protomech';

import fixture from './fixtures/main-gun-java-verdicts.json';

interface JavaMount {
  n: string;
  l: string;
  t: number;
  s: boolean;
  w: boolean;
  p: boolean;
}
interface JavaUnit {
  chassis: string;
  model: string;
  tonnage: number;
  quad: boolean;
  ultra: boolean;
  hasMainGun: boolean;
  illegalEquipmentCombinations: boolean;
  limits: Record<string, { slots: number; weight: number | null }>;
  mounts: JavaMount[];
}

const UNITS = fixture.units as JavaUnit[];
const ABBR: Partial<Record<L, string>> = {
  [L.HEAD]: 'HD',
  [L.TORSO]: 'T',
  [L.LEFT_ARM]: 'LA',
  [L.RIGHT_ARM]: 'RA',
  [L.LEGS]: 'L',
  [L.MAIN_GUN]: 'MG',
};
const LOCATIONS_UNDER_RULE = [
  [L.MAIN_GUN, 'MG'],
  [L.LEFT_ARM, 'LA'],
  [L.RIGHT_ARM, 'RA'],
] as const;

const DIR = path.join(process.cwd(), 'public/data/units/protomechs');
const normalize = (id: string) => id.replace(/\s*\(\d+\)$/, '').toLowerCase();

function loadStates() {
  return fs
    .readdirSync(DIR)
    .filter((file) => file !== 'index.json')
    .map((file) => {
      const definition = JSON.parse(
        fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^﻿/, ''),
      );
      return {
        key: `${definition.chassis}|${definition.model ?? ''}`,
        state: mapProtoMechDefinitionToState(definition),
      };
    });
}

const STATES = loadStates();
const JAVA = new Map(UNITS.map((u) => [`${u.chassis}|${u.model}`, u]));

/** Java mounts for a state mount, matched by location and name. */
function javaMountFor(
  unit: JavaUnit,
  abbr: string,
  equipmentId: string,
  used: Set<JavaMount>,
): JavaMount | undefined {
  const found = unit.mounts.find(
    (m) =>
      !used.has(m) && m.l === abbr && normalize(m.n) === normalize(equipmentId),
  );
  if (found) used.add(found);
  return found;
}

describe('pinned Java parity: Main Gun and arm placement', () => {
  it('records the pinned provenance', () => {
    expect(fixture.meta.pins.megamek).toBe(
      '48fcb2f64a1b3f2d575707ce5653dad64927b587',
    );
    expect(fixture.meta.pins.mmData).toBe(
      '50f7efef0c9f775b0258f8283525ed4f906e1985',
    );
    expect(fixture.meta.megamekJarSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('covers every canonical ProtoMech exactly once', () => {
    expect(UNITS).toHaveLength(fixture.meta.units);
    expect(STATES).toHaveLength(UNITS.length);
    expect(new Set(STATES.map((s) => s.key))).toEqual(new Set(JAVA.keys()));
  });

  it('agrees with Java that every canonical unit is legal', () => {
    // The oracle finds no illegal equipment combination in any unit.
    expect(UNITS.filter((u) => u.illegalEquipmentCombinations)).toEqual([]);
  });

  it('derives quad and ultraheavy as Java does', () => {
    for (const { key, state } of STATES) {
      const java = JAVA.get(key)!;
      expect(state.chassisType === ProtoChassis.QUAD).toBe(java.quad);
      expect(state.tonnage > 9).toBe(java.ultra);
    }
  });

  it('matches the Java slot and weight limit at the Main Gun and both arms', () => {
    for (const { key, state } of STATES) {
      const java = JAVA.get(key)!;
      const quad = state.chassisType === ProtoChassis.QUAD;
      const ultra = state.tonnage > 9;
      for (const [location, abbr] of LOCATIONS_UNDER_RULE) {
        const limit = java.limits[abbr];
        if (!limit) {
          // ProtoMek.locations() only includes the Main Gun when it is mounted.
          expect([key, abbr, java.hasMainGun]).toEqual([key, 'MG', false]);
          continue;
        }
        expect([
          key,
          abbr,
          'slots',
          getProtoLocationSlotLimit(location, quad, ultra),
        ]).toEqual([key, abbr, 'slots', limit.slots]);
        expect([
          key,
          abbr,
          'weight',
          getProtoLocationWeightLimit(location, quad, ultra),
        ]).toEqual([key, abbr, 'weight', limit.weight ?? Infinity]);
      }
    }
  });

  it('keeps two Main Gun slots for the quad ultraheavy Boggart', () => {
    const boggart = STATES.filter(
      (s) =>
        s.state.chassis.startsWith('Boggart') &&
        s.state.chassisType === ProtoChassis.QUAD &&
        s.state.tonnage > 9,
    );
    expect(boggart.length).toBeGreaterThan(0);
    for (const { key } of boggart) {
      expect(JAVA.get(key)!.limits.MG.slots).toBe(2);
    }
  });

  it('classifies slot-taking mounts exactly as requiresSlot does', () => {
    let compared = 0;
    for (const { key, state } of STATES) {
      const java = JAVA.get(key)!;
      const used = new Set<JavaMount>();
      for (const mount of state.equipment) {
        const abbr =
          mount.blkSource?.blockKey === 'Body'
            ? 'BD'
            : (ABBR[mount.location as L] ?? '?');
        const match = javaMountFor(java, abbr, mount.equipmentId, used);
        // Ammunition outside any location has no abbreviation match; Java
        // reports it at "none", and it never takes a slot.
        const expected = match?.s ?? false;
        expect([
          key,
          mount.equipmentId,
          protoMountTakesSlot(mount.equipmentId),
        ]).toEqual([key, mount.equipmentId, expected]);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(500);
  });

  it('gives arm mounts the same weight as Java', () => {
    let compared = 0;
    for (const { key, state } of STATES) {
      const java = JAVA.get(key)!;
      const used = new Set<JavaMount>();
      for (const mount of state.equipment) {
        if (mount.location !== L.LEFT_ARM && mount.location !== L.RIGHT_ARM)
          continue;
        const match = javaMountFor(
          java,
          ABBR[mount.location]!,
          mount.equipmentId,
          used,
        );
        expect(match).toBeDefined();
        expect([
          key,
          mount.equipmentId,
          getEquipmentEntry(mount.equipmentId)?.weight,
        ]).toEqual([key, mount.equipmentId, match!.t]);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(20);
  });

  it("returns Java's verdict for every canonical unit", () => {
    const disagreements: string[] = [];
    for (const { key, state } of STATES) {
      const java = JAVA.get(key)!;
      const result = validateProtoMainGun({
        tonnage: state.tonnage,
        chassisType: state.chassisType,
        equipmentPlacements: state.equipment.map((mount) => ({
          equipmentId: mount.equipmentId,
          location: mount.location,
        })),
      });
      if (result.passed === java.illegalEquipmentCombinations) {
        disagreements.push(
          `${key}: ours ${result.passed ? 'valid' : 'invalid'}, Java ${java.illegalEquipmentCombinations ? 'invalid' : 'valid'}: ${result.findings.map((f) => f.message).join('; ')}`,
        );
      }
    }
    expect(disagreements).toEqual([]);
  });
});
