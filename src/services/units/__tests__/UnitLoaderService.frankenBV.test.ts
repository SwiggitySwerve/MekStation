import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { UnitState } from '@/stores/unitState';

import { getCalculationService } from '@/services/construction/CalculationService';
import {
  buildEditableMechBVInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createUnitStore } from '@/stores/unit/useUnitStore';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { Era } from '@/types/temporal/Era';
import { mechBVTerms } from '@/utils/construction/mechBV/bvTrace';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import { parseUnit } from '../unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '../unitLoaderService/unitLoader';

jest.mock('../../equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

// C1's pinned Java measurements. Pins: config/reference-policy/derivation.json goalPins.
// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// megamek/src/megamek/common/battlevalue/MekBVCalculator.java:80-123 includes gyro;
// megamek/src/megamek/common/units/Mek.java:1062-1087 owns donor-tonnage internals.
// mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985: data/mekfiles/meks/
// Snords Irregulars/Hybrid Rifleman RFL-3N (Sneede).mtf:34-43 and (Sneede II).mtf:34-42;
// XTRs/Boondocks/Temax Cat Ninjabolt TMC-NB.mtf:35-43;
// XTRs/Mercenaries/Schwerer Gustav.mtf:35-43.
const fixtures = [
  {
    file: '3-succession-wars/standard/Hybrid Rifleman RFL-3N (Sneede).json',
    structureBV: 181.5,
    bv: 1248,
  },
  {
    file: '6-dark-age/standard/Hybrid Rifleman RFL-3N (Sneede II).json',
    structureBV: 181.5,
    bv: 2165,
  },
  {
    file: '5-civil-war/standard/Temax Cat Ninjabolt TMC-NB.json',
    structureBV: 113.5,
    bv: 1490,
  },
  {
    file: '5-civil-war/standard/Schwerer Gustav Unknown.json',
    structureBV: 149,
    bv: 1643,
  },
];

function load(file: string): UnitState {
  const definition = parseUnit(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', file),
        'utf8',
      ),
    ),
    file,
  );
  return new UnitLoaderService().mapToUnitState(definition, true);
}

function reopen(state: UnitState): UnitState {
  const saved = serializeCustomUnitState(state, {
    id: state.id,
    chassis: state.chassis,
    variant: state.model,
    era: Era.CIVIL_WAR,
  });
  return new UnitLoaderService().mapToUnitState(
    parseUnit(JSON.parse(JSON.stringify(saved))),
    false,
  );
}

function runtimeBV(state: UnitState) {
  const mech = projectEditableMech(state, 0);
  const input = buildEditableMechBVInput(mech);
  const result = calculateUnitBV(input, input.id);
  if (!result.breakdown) throw new Error('Expected runtime BV breakdown');
  // Java's structure term includes gyro. Use the trace owner to name that sum.
  return {
    structureBV: mechBVTerms(result.breakdown).structureBV,
    bv: result.bv,
    serviceBV: getCalculationService().calculateBattleValue(mech),
  };
}

beforeAll(async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

describe.each(['loaded', 'saved and reopened'] as const)(
  '%s runtime BV',
  (stage) => {
    const atStage = (state: UnitState) =>
      stage === 'loaded' ? state : reopen(state);

    it.each(fixtures)('$file agrees with Java structure BV', (fixture) => {
      const state = atStage(load(fixture.file));
      expect(state.frankenStructure?.locationTonnage).toBeDefined();
      const result = runtimeBV(state);
      expect(result.structureBV).toBe(fixture.structureBV);
      // Reopened total parity is tracked in the weapon/save/chassis lanes.
      if (stage === 'loaded') {
        expect(result.bv).toBe(fixture.bv);
        expect(result.serviceBV).toBe(fixture.bv);
      }
    });

    it('keeps the ordinary Atlas control unchanged', () => {
      const state = atStage(load('2-star-league/standard/Atlas AS7-D.json'));
      expect(state.frankenStructure).toBeUndefined();
      expect(runtimeBV(state)).toEqual({
        structureBV: 278,
        bv: 1897,
        serviceBV: 1897,
      });
    });
  },
);

it('uses live donor metadata rather than falling back to the source context', () => {
  const state = load(fixtures[0].file);
  expect(state.bvContext?.source.structure?.locationTonnage).toBeDefined();
  expect(runtimeBV({ ...state, frankenStructure: undefined })).toEqual({
    structureBV: 178.5,
    bv: 1245,
    serviceBV: 1245,
  });
});

it('clears donor tonnage from the BV input after an editor structure-type change', () => {
  const store = createUnitStore(load(fixtures[0].file));
  store.getState().setInternalStructureType(InternalStructureType.REINFORCED);
  const state = store.getState();
  expect(state.frankenStructure).toBeUndefined();
  const input = buildEditableMechBVInput(projectEditableMech(state, 0));
  expect(input.structure.type).toBe(InternalStructureType.REINFORCED);
  expect(input.structure.locationTonnage).toBeUndefined();
});
