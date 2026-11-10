import fs from 'node:fs';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import fixtures from '@/services/units/handlers/__tests__/fixtures/ba-harjel-parity.json';
import { BattleArmorUnitHandler } from '@/services/units/handlers/BattleArmorUnitHandler';
import { createDefaultBattleArmorState } from '@/stores/battleArmorState';
import { createBattleArmorStore } from '@/stores/useBattleArmorStore';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { BattleArmorLocation } from '@/types/construction/UnitLocation';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  ManipulatorType,
} from '@/types/unit/PersonnelInterfaces';
import {
  buildBattleArmorBVInput,
  buildBattleArmorBVInputFromUnit,
} from '@/utils/construction/battlearmor/battleArmorBVAdapter';

import { projectBattleArmorDefinition } from '../battleArmorDefinitionProjection';
import { mapBattleArmorDefinitionToState } from '../smallUnitDefinitionMapper';

function harjel(squadSize = 4) {
  return UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        `public/data/units/battlearmor/Gray Death Strike Suit (HarJel)(Sqd${squadSize}).json`,
        'utf8',
      ),
    ),
  );
}

// BattleArmor.java:953-987,1360-1387; pin 48fcb2f64.
it.each(fixtures)(
  'preserves canonical chassis eligibility and native BV for $path',
  ({ sourceText, expected }) => {
    const parsed = new BlkParserService().parse(sourceText);
    if (!parsed.success) throw Error('Expected source');
    const loaded = new BattleArmorUnitHandler().parse(parsed.data.document);
    if (!loaded.success) throw Error('Expected BA');
    const state = mapBattleArmorDefinitionToState(
      harjel(loaded.data.unit.squadSize),
    );
    expect(state.techBase).toBe(TechBase.CLAN);
    expect(buildBattleArmorBVInput(state)).toEqual(
      buildBattleArmorBVInputFromUnit(loaded.data.unit),
    );
    expect(createBattleArmorStore(state).getState().bvBreakdown?.final).toBe(
      expected.total,
    );
  },
);

it.each([
  ['MIXED', false, TechBase.INNER_SPHERE],
  ['MIXED', undefined, TechBase.INNER_SPHERE],
  ['CLAN', false, TechBase.CLAN],
  ['INNER_SPHERE', true, TechBase.INNER_SPHERE],
] as const)(
  'keeps %s / %s chassis and absent-field compatibility',
  (techBase, clanChassis, expected) => {
    const state = mapBattleArmorDefinitionToState(
      UnitContract.parse({ ...harjel(), techBase, clanChassis }),
    );
    expect(state.techBase).toBe(expected);
    if (expected === TechBase.INNER_SPHERE)
      expect(buildBattleArmorBVInput(state).canAntiMek).toBe(false);
  },
);

it('preserves root Mixed chassis over an older binary editor snapshot', () => {
  const editor = {
    ...mapBattleArmorDefinitionToState(harjel()),
    techBase: TechBase.INNER_SPHERE,
  };
  const state = mapBattleArmorDefinitionToState(
    UnitContract.parse({ ...harjel(), smallUnitEditor: editor }),
  );
  expect(state.techBaseMode).toBe(TechBaseMode.MIXED);
  expect(state.chassisTechBase).toBe(TechBase.CLAN);
  expect(state.techBase).toBe(TechBase.CLAN);
  expect(buildBattleArmorBVInput(state)).toEqual(
    buildBattleArmorBVInput(mapBattleArmorDefinitionToState(harjel())),
  );
});

it.each([
  { weightClass: BattleArmorWeightClass.HEAVY },
  { weightClass: BattleArmorWeightClass.ASSAULT },
  { chassisType: BattleArmorChassisType.QUAD },
  { motionType: SquadMotionType.UMU },
  {
    equipment: [],
    leftManipulator: ManipulatorType.NONE,
    rightManipulator: ManipulatorType.NONE,
  },
])('retains the shared anti-Mek guard %j', (guard) => {
  const state = {
    ...mapBattleArmorDefinitionToState(harjel()),
    techBase: TechBase.CLAN,
    ...guard,
  };
  expect(buildBattleArmorBVInput(state).canAntiMek).toBe(false);
});

it('projects PA(L), per-trooper armor and ordered native mounts without losing entity locations', () => {
  const definition = projectBattleArmorDefinition({
    ...createDefaultBattleArmorState(),
    weightClass: BattleArmorWeightClass.PA_L,
    chassisType: BattleArmorChassisType.BIPED,
    squadSize: 3,
    motionType: SquadMotionType.UMU,
    groundMP: 2,
    jumpMP: 0,
    umuMP: 3,
    armorType: 35,
    armorPerTrooper: 4,
    leftManipulator: ManipulatorType.BASIC,
    rightManipulator: ManipulatorType.SALVAGE_ARM,
    hasAPMount: true,
    hasModularMount: true,
    equipment: [
      {
        id: 'mount-original',
        equipmentId: 'InfantryAssaultRifle:APM:LA',
        name: 'native rifle',
        location: BattleArmorLocation.LEFT_ARM,
        unitLocation: 'Trooper 2',
        isAPMount: true,
        isTurretMounted: false,
        isModular: true,
      },
    ],
  });
  expect(definition).toEqual({
    tonnage: 3,
    squadSize: 3,
    weightClass: 'PAL',
    chassisType: 'BIPED',
    motionType: 'UMU',
    movement: { groundMP: 2, jumpMP: 0, umuMP: 3 },
    armor: { type: 'FIRE_RESISTANT', perTrooper: 4 },
    armorPerTrooper: 4,
    manipulators: { leftArm: 'Basic', rightArm: 'Salvage Arm' },
    hasAntiPersonnelMount: true,
    hasModularWeaponMount: true,
    equipment: [
      {
        id: 'InfantryAssaultRifle:APM:LA',
        name: 'native rifle',
        location: 'LEFT_ARM',
        unitLocation: 'Trooper 2',
        isAPMMounted: true,
      },
    ],
  });
});

it('rejects an unknown native armor code instead of inventing a standard type', () => {
  expect(() =>
    projectBattleArmorDefinition({
      ...createDefaultBattleArmorState(),
      armorType: 999,
    }),
  ).toThrow('Unknown battle armor code: 999');
});
