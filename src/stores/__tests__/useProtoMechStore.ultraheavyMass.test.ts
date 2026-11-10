/**
 * Ultraheavy is a mass, not a chassis (4.1-b3d), through the real store and the pinned corpus.
 *
 * MegaMekLab 62bf193 offers three motives (BIPED, QUAD, GLIDER) and one tonnage spinner of
 * 2 to 15 for all of them (PMChassisView.java:75-79,135-139). "Ultraheavy" is
 * `tonnage > TestProtoMek.MAX_STD_TONNAGE` (PMChassisView.java:205-207). A tonnage edit
 * keeps the walk MP and is refused when the engine rating would be invalid
 * (PMStructureTab.java:446-456, recalculateEngineRating :264-276); it never rewrites walk.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import fs from 'node:fs';
import path from 'node:path';

import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

const DIR = path.join(process.cwd(), 'public/data/units/protomechs');
const definitions = fs
  .readdirSync(DIR)
  .filter((file) => file !== 'index.json')
  .map((file) =>
    JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^﻿/, '')),
  );
const heavy = definitions.filter((d) => d.tonnage > 9);
const name = (d: { chassis: string; model?: string }) =>
  `${d.chassis} ${d.model ?? ''}`.trim();

describe('the canonical ProtoMechs above 9 t re-applying their own chassis and tonnage', () => {
  it('finds the 10 ultraheavy units: 5 bipeds, 2 quads, 3 gliders', () => {
    expect(heavy).toHaveLength(10);
    expect(heavy.filter((d) => d.isQuad)).toHaveLength(2);
    expect(heavy.filter((d) => d.isGlider)).toHaveLength(3);
  });

  it.each(heavy.map((d) => [name(d), d] as const))(
    '%s keeps its motive and mass: the loaded chassis is never the Ultraheavy value',
    (_name, definition) => {
      const state = mapProtoMechDefinitionToState(definition);
      expect(state.chassisType).not.toBe(ProtoChassis.ULTRAHEAVY);
      expect(state.tonnage).toBe(definition.tonnage);
    },
  );

  it.each(heavy.map((d) => [name(d), d] as const))(
    '%s is unchanged by setChassisType(own) then setTonnage(own)',
    (_name, definition) => {
      const store = createProtoMechStore(
        mapProtoMechDefinitionToState(definition),
      );
      const before = store.getState();
      const keep = {
        chassisType: before.chassisType,
        tonnage: before.tonnage,
        walkMP: before.walkMP,
        cruiseMP: before.cruiseMP,
        jumpMP: before.jumpMP,
        flankMP: before.flankMP,
        engineRating: before.engineRating,
        structureByLocation: before.structureByLocation,
        armorByLocation: before.armorByLocation,
      };
      store.getState().setChassisType(before.chassisType);
      store.getState().setTonnage(before.tonnage);
      const after = store.getState();
      expect({
        chassisType: after.chassisType,
        tonnage: after.tonnage,
        walkMP: after.walkMP,
        cruiseMP: after.cruiseMP,
        jumpMP: after.jumpMP,
        flankMP: after.flankMP,
        engineRating: after.engineRating,
        structureByLocation: after.structureByLocation,
        armorByLocation: after.armorByLocation,
      }).toEqual(keep);
    },
  );
});

describe('one tonnage range, 2 to 15, for every motive', () => {
  it.each([ProtoChassis.BIPED, ProtoChassis.QUAD, ProtoChassis.GLIDER])(
    'a %s accepts every tonnage from 2 to 15 and clamps outside it',
    (chassisType) => {
      const store = createProtoMechStore(
        createDefaultProtoMechState({ tonnage: 5, chassisType }),
      );
      for (let tonnage = 2; tonnage <= 15; tonnage++) {
        store.getState().setTonnage(tonnage);
        expect(store.getState().tonnage).toBe(tonnage);
      }
      store.getState().setTonnage(40);
      expect(store.getState().tonnage).toBe(15);
      store.getState().setTonnage(1);
      expect(store.getState().tonnage).toBe(2);
    },
  );

  it.each([
    [ProtoChassis.QUAD, 13],
    [ProtoChassis.GLIDER, 14],
    [ProtoChassis.BIPED, 12],
  ])('re-selecting a %s motive keeps %s t', (chassisType, tonnage) => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 5 }),
    );
    store.getState().setTonnage(tonnage);
    store.getState().setChassisType(chassisType);
    expect(store.getState().tonnage).toBe(tonnage);
    expect(store.getState().chassisType).toBe(chassisType);
  });

  it('keeps a 12 t biped at 12 t when it becomes a glider or a quad', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 5 }),
    );
    store.getState().setTonnage(12);
    store.getState().setChassisType(ProtoChassis.GLIDER);
    expect(store.getState().tonnage).toBe(12);
    store.getState().setChassisType(ProtoChassis.QUAD);
    expect(store.getState().tonnage).toBe(12);
  });
});

describe('a tonnage edit keeps the walk MP, or is refused', () => {
  it('keeps the walk, run and jump limits of the unit, and recomputes the engine', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 5 }),
    );
    store.getState().setWalkMP(4);
    store.getState().setTonnage(9);
    expect(store.getState()).toMatchObject({
      tonnage: 9,
      walkMP: 4,
      cruiseMP: 4,
      flankMP: 6,
      // Pinned TestProtoMek.calcEngineRating observation: 9 t, walk 4 is 55
      // (protoEngineRating.test.ts).
      engineRating: 55,
    });
  });

  it('does not reset walk to 10 minus the tonnage (the old silent rewrite)', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 5 }),
    );
    store.getState().setWalkMP(7);
    store.getState().setTonnage(12);
    expect(store.getState().walkMP).toBe(7);
  });

  it('refuses a tonnage whose engine rating would be over 500, with the reason, and changes nothing', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 2 }),
    );
    store.getState().setWalkMP(40); // rating 120 at 2 t
    const before = store.getState();
    expect(() => store.getState().setTonnage(15)).toThrow(
      /engine rating would be 900/i,
    );
    expect(store.getState()).toBe(before);
    expect(store.getState()).toMatchObject({ tonnage: 2, walkMP: 40 });
  });

  it('allows the largest tonnage that still has a valid engine rating', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 2 }),
    );
    store.getState().setWalkMP(22); // ceil(33) x 15 = 495
    store.getState().setTonnage(15);
    expect(store.getState()).toMatchObject({
      tonnage: 15,
      walkMP: 22,
      engineRating: 495,
    });
  });
});
