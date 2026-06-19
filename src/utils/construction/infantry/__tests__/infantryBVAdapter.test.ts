import { RulesLevel, TechBase, WeightClass } from '@/types/enums';
import { Era } from '@/types/temporal/Era';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  InfantryMotive,
  type IInfantryFieldGun,
} from '@/types/unit/InfantryInterfaces';
import {
  type IInfantry,
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';

import {
  calculateInfantryBV,
  type InfantryBVInput,
  type InfantryWeaponRef,
} from '../infantryBV';
import {
  calculateInfantryBVFromUnit,
  computeInfantryBVFromState,
  type InfantryStateLike,
} from '../infantryBVAdapter';
import { findWeaponById } from '../weaponTable';

function weaponRef(id: string): InfantryWeaponRef {
  const weapon = findWeaponById(id);
  if (!weapon) {
    throw new Error(`Missing infantry weapon test fixture: ${id}`);
  }
  return {
    id: weapon.id,
    damageDivisor: weapon.damageDivisor,
  };
}

function fieldGun(weaponId: string): IInfantryFieldGun {
  return {
    weaponId,
    equipmentId: weaponId,
    name: weaponId,
    crewCount: 4,
    crew: 4,
    ammoRounds: 1,
  };
}

function baseState(
  overrides: Partial<InfantryStateLike> = {},
): InfantryStateLike {
  return {
    infantryMotive: InfantryMotive.FOOT,
    platoonComposition: { squads: 7, troopersPerSquad: 4 },
    armorKit: InfantryArmorKit.NONE,
    hasAntiMechTraining: false,
    primaryWeapon: 'Rifle',
    primaryWeaponId: 'inf-rifle',
    secondaryWeaponCount: 0,
    fieldGuns: [],
    ...overrides,
  };
}

function directInput(
  overrides: Partial<InfantryBVInput> = {},
): InfantryBVInput {
  return {
    motive: InfantryMotive.FOOT,
    totalTroopers: 28,
    primaryWeapon: weaponRef('inf-rifle'),
    armorKit: InfantryArmorKit.NONE,
    hasAntiMechTraining: false,
    ...overrides,
  };
}

function infantryUnit(overrides: Partial<IInfantry> = {}): IInfantry {
  return {
    id: 'infantry-adapter-test-unit',
    name: 'Infantry Adapter Test Unit',
    unitType: UnitType.INFANTRY,
    tonnage: 0,
    weightClass: WeightClass.ULTRALIGHT,
    metadata: {
      chassis: 'Infantry',
      model: 'Adapter Test Platoon',
      era: Era.LATE_SUCCESSION_WARS,
      year: 3025,
      rulesLevel: RulesLevel.STANDARD,
    },
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3025,
    era: Era.LATE_SUCCESSION_WARS,
    cost: 0,
    battleValue: 0,
    totalWeight: 0,
    remainingTonnage: 0,
    isValid: true,
    validationErrors: [],
    motionType: SquadMotionType.FOOT,
    movement: { groundMP: 1, jumpMP: 0, umuMP: 0 },
    squadSize: 4,
    armorPerTrooper: 0,
    numberOfSquads: 7,
    platoonStrength: 28,
    primaryWeapon: 'Rifle',
    primaryWeaponId: 'inf-rifle',
    secondaryWeaponCount: 0,
    armorKit: InfantryArmorKit.NONE,
    specialization: InfantrySpecialization.NONE,
    fieldGuns: [],
    hasAntiMechTraining: false,
    isAugmented: false,
    canSwarm: false,
    canLegAttack: false,
    ...overrides,
  };
}

describe('infantry BV adapter field-gun ammo resolution', () => {
  it.each([
    ['mg', 'isammomg'],
    ['ac5', 'isammoac5'],
    ['lrm15', 'isammolrm15'],
    ['flamer', 'isammoflamer'],
  ])('maps %s field guns to %s ammo ids', (weaponId, ammoId) => {
    const adapted = computeInfantryBVFromState(
      baseState({
        fieldGuns: [fieldGun(weaponId)],
      }),
    );
    const direct = calculateInfantryBV(
      directInput({
        fieldGuns: [
          {
            id: weaponId,
            ammo: [{ id: ammoId, weaponTypeOverride: weaponId }],
          },
        ],
      }),
    );

    expect(adapted).toEqual(direct);
  });

  it('keeps the sanitized fallback ammo id for unknown field guns', () => {
    const weaponId = 'custom ac/5';
    const adapted = computeInfantryBVFromState(
      baseState({
        fieldGuns: [fieldGun(weaponId)],
      }),
    );
    const direct = calculateInfantryBV(
      directInput({
        fieldGuns: [
          {
            id: weaponId,
            ammo: [
              {
                id: 'isammocustomac5',
                weaponTypeOverride: weaponId,
              },
            ],
          },
        ],
      }),
    );

    expect(adapted).toEqual(direct);
  });
});

describe('infantry BV adapter unit motion resolution', () => {
  it.each([
    [SquadMotionType.FOOT, InfantryMotive.FOOT],
    [SquadMotionType.JUMP, InfantryMotive.JUMP],
    [SquadMotionType.MOTORIZED, InfantryMotive.MOTORIZED],
    [SquadMotionType.MECHANIZED, InfantryMotive.MECHANIZED_TRACKED],
    [SquadMotionType.TRACKED, InfantryMotive.MECHANIZED_TRACKED],
    [SquadMotionType.WHEELED, InfantryMotive.MECHANIZED_WHEELED],
    [SquadMotionType.HOVER, InfantryMotive.MECHANIZED_HOVER],
    [SquadMotionType.VTOL, InfantryMotive.MECHANIZED_VTOL],
    [SquadMotionType.UMU, InfantryMotive.FOOT],
    [SquadMotionType.BEAST, InfantryMotive.FOOT],
  ])('maps %s handler motion to %s motive', (motionType, infantryMotive) => {
    const adapted = calculateInfantryBVFromUnit(infantryUnit({ motionType }));
    const direct = computeInfantryBVFromState(baseState({ infantryMotive }));

    expect(adapted).toEqual(direct);
  });
});
