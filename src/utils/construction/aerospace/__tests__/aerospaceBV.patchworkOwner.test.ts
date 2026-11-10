import fs from 'node:fs';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { AerospaceUnitHandler } from '@/services/units/handlers/AerospaceUnitHandler';
import { mapAerospaceDefinitionToState } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '@/services/units/unitLoaderService/definitionTypes';
import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import {
  clearAllAerospaceStores,
  hydrateOrCreateAerospace,
} from '@/stores/aerospaceStoreRegistry';
import { createAerospaceStore } from '@/stores/useAerospaceStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { AerospaceCockpitType } from '@/types/unit/AerospaceInterfaces';
import { serializeAerospaceArmorIdentity } from '@/types/unit/AerospaceSerialization';
import { getArmorBVMultiplier } from '@/types/validation/BattleValue';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { getNativeArmorBVMultiplier } from '@/utils/construction/battleValueDefensive';
import { resolveAerospaceContractArc } from '@/utils/construction/contractBVUnitAdapter';
import { projectAerospaceBVArmor } from '@/utils/construction/contractBVUnitAdapter';

import { aerospaceBVUnitFromState } from '../aerospaceBVUnitAdapter';

afterEach(() => clearAllAerospaceStores());

it.each([
  AerospaceCockpitType.STANDARD,
  AerospaceCockpitType.SMALL,
  AerospaceCockpitType.COMMAND_CONSOLE,
])('preserves the existing editor cockpit modifier for %s', (cockpitType) => {
  const state = createDefaultAerospaceState({
    name: 'Cockpit transport',
    tonnage: 25,
    techBase: TechBase.INNER_SPHERE,
  });
  state.cockpitType = cockpitType;
  const projected = aerospaceBVUnitFromState(state);
  expect(projected).toMatchObject({ cockpitType });
  expect(calculateBattleValueForUnit(projected)).toEqual(
    calculateBattleValueForUnit({
      ...state,
      movement: { safeThrust: state.safeThrust, maxThrust: state.maxThrust },
      totalArmorPoints: 0,
      heatSinkType: 0,
    }),
  );
});

it('retains native Nanook patchwork types and lower-camel armor keys through dispatch', () => {
  // mm-data 50f7efe Nanook construction/equipment facts; Java 48fcb2f64 BV 1571.
  const tags = {
    UnitType: 'AeroSpaceFighter',
    Name: 'Sangihe Shrike-Thrush',
    Model: 'Nanook',
    type: 'Mixed (IS Chassis) Experimental',
    year: '3068',
    tonnage: '25',
    SafeThrust: '12',
    structural_integrity: '12',
    heatsinks: '10',
    sink_type: '1',
    fuel: '80',
    armor_type: '7',
    armor: ['32', '20', '20', '14'],
    Nose_armor_type: '0',
    'Left Wing_armor_type': '3',
    'Right Wing_armor_type': '3',
    Aft_armor_type: '2',
    'Nose Equipment': ['CLMediumPulseLaser', 'CLMediumPulseLaser'],
    'Left Wing Equipment': ['CLERMediumLaser'],
    'Right Wing Equipment': ['CLERMediumLaser'],
    'Aft Equipment': ['Small Laser'],
  };
  const text = Object.entries(tags)
    .map(([k, v]) => `<${k}>\n${[v].flat().join('\n')}\n</${k}>`)
    .join('\n');
  const parsed = new BlkParserService().parse(text);
  if (!parsed.success) throw Error('Expected BLK');
  const loaded = new AerospaceUnitHandler().parse(parsed.data.document);
  if (!loaded.success) throw Error('Expected aircraft');
  expect(loaded.data.unit).toMatchObject({
    armorTypeByArc: { NOSE: 0, LEFT_WING: 3, RIGHT_WING: 3, AFT: 2 },
  });
  const bv = calculateBattleValueForUnit(loaded.data.unit);
  if (bv?.kind !== 'aerospace') throw Error('Expected aerospace BV');
  expect(bv.breakdown.armorBV).toBe(282.5);
  expect(bv.breakdown.final).toBe(1571);
});

it.each(['nose', 'leftWing', 'rightWing', 'aft'])(
  'resolves represented native armor key %s',
  (key) => {
    expect(resolveAerospaceContractArc(key)).toBe(
      resolveAerospaceContractArc(
        key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),
      ),
    );
  },
);
it('rejects unknown armor arcs', () =>
  expect(() => resolveAerospaceContractArc('unknown')).toThrow(
    'Unknown aerospace arc',
  ));

it('shares the contract armor facts with the store projection without changing live points', () => {
  const armor = {
    type: 'STANDARD',
    byArc: { Nose: 12, Aft: 7 },
    typeByArc: { NOSE: 0, AFT: 2 },
  };
  const projected = projectAerospaceBVArmor(armor);
  expect(projected).toEqual({
    armorType: 'standard',
    totalArmorPoints: 19,
    armorByArc: armor.byArc,
    armorTypeByArc: armor.typeByArc,
  });
  const state = createDefaultAerospaceState({
    name: 'Projection',
    tonnage: 25,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(
    aerospaceBVUnitFromState({
      ...state,
      armorAllocation: { ...state.armorAllocation, Nose: 12, Aft: 7 },
      armorType: ArmorTypeEnum.STANDARD,
      armorTypeByArc: armor.typeByArc,
    }),
  ).toMatchObject(projected);
});

// MegaMek 48fcb2f64: BVCalculator.java:350-420,1489-1503.
// This API extracts the existing vehicle rule without changing it.
it.each([
  [2, 'reactive'],
  [3, 'reflective'],
  [4, 'hardened'],
] as const)(
  'projects native code %s through the existing multiplier owner',
  (code, name) => {
    expect(getNativeArmorBVMultiplier(code)).toBe(getArmorBVMultiplier(name));
  },
);
it('preserves normalized spellings and unknown numeric fallback', () => {
  expect(getNativeArmorBVMultiplier('ANTI_PENETRATIVE_ABLATION')).toBe(1.2);
  expect(getNativeArmorBVMultiplier(-1)).toBe(1);
});
it('retains native patchwork codes separately from the existing allocated points', () => {
  const source = UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        "public/data/units/aerospace/Sangihe Shrike-Thrush 'Nanook'.json",
        'utf8',
      ),
    ),
  );
  if (!isDefinitionForFamily('aerospace', source))
    throw Error('Expected aircraft');
  const state = mapAerospaceDefinitionToState(source);
  expect(state.armorTypeByArc).toEqual(source.armor?.typeByArc);
  expect(state.armorAllocation.Nose).toBe(32);
});
it('serializes source codes with PATCHWORK identity without copying allocated points', () => {
  const codes = { NOSE: 0, LEFT_WING: 3, RIGHT_WING: 3, AFT: 2 };
  expect(
    serializeAerospaceArmorIdentity('STANDARD', { armorTypeByArc: codes }),
  ).toEqual({ type: 'PATCHWORK', typeByArc: codes, barRating: undefined });
});
it('reopens persisted native codes and clears them when choosing a global armor type', () => {
  localStorage.clear();
  const state = createDefaultAerospaceState({
    name: 'Patchwork',
    tonnage: 25,
    techBase: TechBase.INNER_SPHERE,
  });
  const store = createAerospaceStore(state);
  store.setState({ armorTypeByArc: { NOSE: 4 } });
  const key = `megamek-aerospace-${state.id}`;
  expect(JSON.parse(localStorage.getItem(key) ?? 'null')).toMatchObject({
    state: { armorTypeByArc: { NOSE: 4 } },
  });
  const reopened = hydrateOrCreateAerospace(state.id, {
    name: 'Reopened',
    tonnage: 25,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(reopened.getState().armorTypeByArc).toEqual({ NOSE: 4 });
  reopened.getState().setArmorType(ArmorTypeEnum.STANDARD);
  expect(reopened.getState().armorTypeByArc).toBeUndefined();
  expect(JSON.parse(localStorage.getItem(key) ?? 'null')).not.toHaveProperty(
    'state.armorTypeByArc',
  );
});
it('preserves ordinary support BAR serialization', () => {
  expect(
    serializeAerospaceArmorIdentity('STANDARD', {
      isFixedWingSupport: true,
      barRating: 5,
    }),
  ).toEqual({ type: 'BAR', barRating: 5 });
});
