import { readFileSync } from 'fs';
import * as path from 'path';

import {
  mapBattleArmorDefinitionToState,
  mapProtoMechDefinitionToState,
} from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { createDefaultInfantryState } from '@/stores/infantryState';
import { UnitContract } from '@/types/contracts';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { calculateBattleValueForUnit } from '../battleValueCalculations';
import { calculateUnitBV } from '../bvAdapter';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../contractBVUnitAdapter';
import { mapInfantryDefinition } from '../infantry/libraryMapping';

function load(family: string, id: string) {
  const base = path.join(process.cwd(), 'public/data/units', family);
  const index: { units: { id: string; path: string }[] } = JSON.parse(
    readFileSync(path.join(base, 'index.json'), 'utf8'),
  );
  const entry = index.units.find((unit) => unit.id === id);
  if (!entry) throw new Error(`Missing fixture ${id}`);
  return UnitContract.parse(
    JSON.parse(readFileSync(path.join(base, entry.path), 'utf8')),
  );
}

// MegaMek 48fcb2f64: BLKTankFile.java:200-233 loads source into a Tank;
// BVCalculator.java:103-139 selects a calculator for the loaded domain entity.
it.each([
  ['vehicles', 'ac-2-carrier', 403],
  ['aerospace', 'astrolux-staryacht-lc-100', 296],
] as const)(
  'projects the unchanged %s source %s to its Java total',
  (family, id, expected) => {
    const source = load(family, id);
    const before = JSON.stringify(source);
    expect(calculateUnitBV(source)).toBe(expected);
    expect(JSON.stringify(source)).toBe(before);
  },
);

it('retains the already domain-shaped AC/2 Carrier path', () => {
  const source = load('vehicles', 'ac-2-carrier');
  if (source.tonnage === undefined || !source.movement || !source.armor)
    throw new Error('Missing fixture facts');
  const domain = contractUnitToBVUnit({
    ...source,
    tonnage: source.tonnage,
    movement: source.movement as IContractBVSource['movement'],
    armor: source.armor,
  });
  expect(calculateUnitBV(domain)).toBe(403);
});

it('projects capital sources through the existing contract owner', () => {
  const source = load('capital', 'achilles-2582');
  if (source.tonnage === undefined || !source.movement || !source.armor)
    throw new Error('Missing fixture facts');
  const domain = contractUnitToBVUnit({
    ...source,
    tonnage: source.tonnage,
    movement: source.movement as IContractBVSource['movement'],
    armor: source.armor,
  });
  const expected = calculateBattleValueForUnit(domain)?.breakdown.final;
  expect(expected).toBeGreaterThan(0);
  expect(calculateUnitBV(source)).toBe(expected);
  expect(calculateUnitBV(domain)).toBe(expected);
});

it.each([
  ['battlearmor', 'achileus-light-battle-armor-wobsqd4', UnitType.BATTLE_ARMOR],
  ['protomechs', 'basilisk', UnitType.PROTOMECH],
  ['infantry', 'aa-jump-infantry-292nd-league-regulars', UnitType.INFANTRY],
] as const)(
  'uses the existing %s source projection',
  (family, id, unitType) => {
    const source = load(family, id);
    const config =
      unitType === UnitType.INFANTRY
        ? mapInfantryDefinition(source)
        : undefined;
    const editorState =
      unitType === UnitType.BATTLE_ARMOR
        ? mapBattleArmorDefinitionToState(source)
        : unitType === UnitType.PROTOMECH
          ? mapProtoMechDefinitionToState(source)
          : { ...createDefaultInfantryState(config), ...config };
    const domain = { unitType, editorState };
    const expected = calculateBattleValueForUnit(domain)?.breakdown.final;
    expect(expected).toBeGreaterThan(0);
    expect(calculateUnitBV(source)).toBe(expected);
    expect(calculateUnitBV(domain)).toBe(expected);
  },
);

it('preserves errors for invalid serialized construction facts', () => {
  const source = load('vehicles', 'ac-2-carrier');
  expect(() => calculateUnitBV({ ...source, movement: undefined })).toThrow();
  expect(() => calculateUnitBV({ ...source, motionType: 'Unknown' })).toThrow(
    /motionType/,
  );
});
