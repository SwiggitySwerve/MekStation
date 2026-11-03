import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import { createDefaultBattleArmorState } from '@/stores/battleArmorState';
import { createDefaultInfantryState } from '@/stores/infantryState';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { createDefaultUnitState } from '@/stores/unitState';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import {
  serializeCustomUnitState,
  serializeCustomVehicleState,
  serializeCustomAerospaceState,
  serializeCustomSmallUnitState,
} from '@/utils/serialization/CustomUnitSerializer';

import atlas from '../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { projectCustomCombatSnapshot } from '../CustomCombatSnapshot';
import { UnitContract } from '../index';

const identity = {
  id: 'custom-version',
  chassis: 'Version',
  variant: 'V1',
  era: Era.CLAN_INVASION,
};
const options = {
  id: identity.id,
  name: 'Version V1',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
};
const unitTypes = [
  'BattleMech',
  'OmniMech',
  'IndustrialMech',
  'Vehicle',
  'VTOL',
  'Support Vehicle',
  'SupportVehicle',
  'Aerospace',
  'Conventional Fighter',
  'ConventionalFighter',
  'Small Craft',
  'SmallCraft',
  'DropShip',
  'JumpShip',
  'WarShip',
  'Space Station',
  'Battle Armor',
  'BattleArmor',
  'BATTLEARMOR',
  'Infantry',
  'ProtoMech',
];

it.each(unitTypes)(
  'defaults absent %s schemaVersion to 1.0.0 and retains compatible versions',
  (unitType) => {
    const unit = { ...atlas, unitType };
    expect(UnitContract.parse(unit).schemaVersion).toBe('1.0.0');
    for (const schemaVersion of ['1.0.0', '1.9.23', '1.123456789.0']) {
      const parsed = UnitContract.parse({
        ...unit,
        schemaVersion,
        'org.example:note': { text: 'retain' },
      });
      expect(parsed.schemaVersion).toBe(schemaVersion);
      expect(parsed['org.example:note']).toEqual({ text: 'retain' });
    }
    expect(unit).not.toHaveProperty('schemaVersion');
  },
);

it.each([
  '0.9.0',
  '2.0.0',
  '12.1.3',
  '1.0',
  '01.0.0',
  '1.01.0',
  '1.0.01',
  '1.0.0-alpha',
  '1.0.0+build',
  '1.0.0\n',
  '',
  1,
  null,
])(
  'rejects unsupported or malformed version %j at the generated boundary',
  (schemaVersion) => {
    expect(UnitContract.safeParse({ ...atlas, schemaVersion }).success).toBe(
      false,
    );
  },
);

it('reports the found version and supported major through both loader boundaries', async () => {
  expect(() => parseUnit({ ...atlas, schemaVersion: '2.3.4' })).toThrow(
    /schemaVersion.*2\.3\.4.*supported major 1/,
  );
  const result = await loadUnitDefinition(
    {
      read: async () => ({
        id: 'future',
        unitType: 'Aerospace',
        schemaVersion: '3.0.0',
      }),
    },
    { source: 'canonical', family: 'aerospace', id: 'future' },
  );
  expect(result).toMatchObject({
    success: false,
    code: 'invalid-definition',
    error: expect.stringMatching(/schemaVersion.*3\.0\.0.*supported major 1/),
  });
});

it.each([
  [
    'mech',
    () => serializeCustomUnitState(createDefaultUnitState(options), identity),
  ],
  [
    'vehicle',
    () =>
      serializeCustomVehicleState(createDefaultVehicleState(options), identity),
  ],
  [
    'aerospace',
    () =>
      serializeCustomAerospaceState(
        createDefaultAerospaceState(options),
        identity,
      ),
  ],
  [
    'battle armor',
    () =>
      serializeCustomSmallUnitState(createDefaultBattleArmorState(), identity),
  ],
  [
    'infantry',
    () => serializeCustomSmallUnitState(createDefaultInfantryState(), identity),
  ],
  [
    'ProtoMech',
    () =>
      serializeCustomSmallUnitState(createDefaultProtoMechState(), identity),
  ],
] as const)('writes the current version on %s saves', (_family, save) => {
  const document = JSON.parse(JSON.stringify(save()));
  expect(document).toHaveProperty('schemaVersion', '1.0.0');
  if (['mech', 'vehicle', 'aerospace'].includes(_family)) {
    const snapshot = projectCustomCombatSnapshot(document);
    expect(snapshot).not.toBeNull();
    expect(snapshot).not.toHaveProperty('schemaVersion');
  }
});

it('keeps recorded BattleMech construction bytes independent of document versions', () => {
  const source = { ...atlas, id: identity.id };
  const baseline = projectCustomCombatSnapshot(source);
  if (!baseline) throw new Error('Expected BattleMech construction');
  for (const schemaVersion of ['1.0.0', '1.22.3']) {
    const snapshot = projectCustomCombatSnapshot({ ...source, schemaVersion });
    expect(snapshot).not.toHaveProperty('schemaVersion');
    expect(JSON.stringify(snapshot)).toBe(JSON.stringify(baseline));
  }
});

it('writes the current version when saving a compatible newer source document', () => {
  const state = createDefaultProtoMechState();
  const source = serializeCustomSmallUnitState(state, identity);
  const saved = serializeCustomSmallUnitState(
    {
      ...state,
      librarySource: UnitContract.parse({ ...source, schemaVersion: '1.22.3' }),
    },
    identity,
  );
  expect(saved.schemaVersion).toBe('1.0.0');
});

it.each(['2.0.0', '1.0.0-alpha'])(
  'refuses %s before combat snapshot projection',
  (schemaVersion) => {
    expect(projectCustomCombatSnapshot({ ...atlas, schemaVersion })).toBeNull();
  },
);
