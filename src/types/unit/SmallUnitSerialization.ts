import { z } from 'zod';

import {
  BattleArmorLocation,
  ProtoMechLocation,
} from '@/types/construction/UnitLocation';
import { UnitContract } from '@/types/contracts';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';

import { SquadMotionType } from './BaseUnitInterfaces';
import { BAArmorType } from './BattleArmorInterfaces';
import { UnitType } from './BattleMechInterfaces';
import { InfantryMotive } from './InfantryInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  ManipulatorType,
  InfantryArmorKit,
  InfantrySpecialization,
} from './PersonnelInterfaces';
import { ProtoChassis, ProtoWeightClass } from './ProtoMechInterfaces';

export function isEditableSmallUnit(unit: { unitType: UnitType }): boolean {
  return (
    unit.unitType === UnitType.PROTOMECH ||
    unit.unitType === UnitType.BATTLE_ARMOR ||
    unit.unitType === UnitType.INFANTRY
  );
}

const common = z.object({
  name: z.string(),
  chassis: z.string(),
  model: z.string(),
  mulId: z.string(),
  year: z.number(),
  rulesLevel: z.enum(RulesLevel),
  techBase: z.enum(TechBase),
  librarySource: UnitContract.optional(),
});
const mount = z.object({
  id: z.string(),
  equipmentId: z.string(),
  name: z.string(),
});
const protoAllocation = z
  .object({
    [ProtoMechLocation.HEAD]: z.number(),
    [ProtoMechLocation.TORSO]: z.number(),
    [ProtoMechLocation.LEFT_ARM]: z.number(),
    [ProtoMechLocation.RIGHT_ARM]: z.number(),
    [ProtoMechLocation.LEGS]: z.number(),
    [ProtoMechLocation.MAIN_GUN]: z.number(),
  })
  .catchall(z.number());

/** Exact editor facts; the contract remains authoritative for original source facts. */
export const protoMechEditorSchema = common.extend({
  unitType: z.literal(UnitType.PROTOMECH),
  tonnage: z.number(),
  weightClass: z.enum(ProtoWeightClass),
  chassisType: z.enum(ProtoChassis),
  pointSize: z.number(),
  engineRating: z.number(),
  walkMP: z.number(),
  cruiseMP: z.number(),
  flankMP: z.number(),
  jumpMP: z.number(),
  structureByLocation: protoAllocation,
  armorByLocation: protoAllocation,
  armorType: z.number(),
  hasMainGun: z.boolean(),
  mainGunWeaponId: z.string().optional(),
  hasMyomerBooster: z.boolean(),
  glidingWings: z.boolean(),
  hasMagneticClamps: z.boolean(),
  hasExtendedTorsoTwist: z.boolean(),
  equipment: z.array(
    mount.extend({
      location: z.enum(ProtoMechLocation),
      linkedAmmoId: z.string().optional(),
      blkSource: z
        .object({
          blockKey: z.string(),
          rawEntry: z.string(),
          lookupName: z.string().optional(),
          shots: z.number().optional(),
          size: z.number().optional(),
          rearPrefix: z.boolean().optional(),
          errors: z.array(z.string()),
        })
        .optional(),
    }),
  ),
});

export const battleArmorEditorSchema = common.extend({
  unitType: z.literal(UnitType.BATTLE_ARMOR),
  chassisType: z.enum(BattleArmorChassisType),
  weightClass: z.enum(BattleArmorWeightClass),
  weightPerTrooper: z.number(),
  squadSize: z.number(),
  motionType: z.enum(SquadMotionType),
  groundMP: z.number(),
  jumpMP: z.number(),
  umuMP: z.number(),
  hasMechanicalJumpBoosters: z.boolean(),
  leftManipulator: z.enum(ManipulatorType),
  rightManipulator: z.enum(ManipulatorType),
  armorType: z.number(),
  baArmorType: z.enum(BAArmorType),
  armorPerTrooper: z.number(),
  hasAPMount: z.boolean(),
  hasModularMount: z.boolean(),
  hasTurretMount: z.boolean(),
  hasStealthSystem: z.boolean(),
  stealthType: z.string().optional(),
  hasMimeticArmor: z.boolean(),
  hasFireResistantArmor: z.boolean(),
  equipment: z.array(
    mount.extend({
      location: z.enum(BattleArmorLocation),
      unitLocation: z.string().optional(),
      isAPMount: z.boolean(),
      isTurretMounted: z.boolean(),
      isModular: z.boolean(),
    }),
  ),
});

/** IDs are session-local; linked ammo renews with its actual target mount. */
export function renewSmallUnitMounts<
  T extends { id: string; linkedAmmoId?: string },
>(equipment: readonly T[], sessionId: string): T[] {
  return equipment.map((mount, index) => {
    const target = equipment.findIndex(
      (item) => item.id === mount.linkedAmmoId,
    );
    return {
      ...mount,
      id: `${sessionId}-${index}`,
      ...('linkedAmmoId' in mount
        ? {
            linkedAmmoId:
              target < 0 ? mount.linkedAmmoId : `${sessionId}-${target}`,
          }
        : {}),
    };
  });
}

export const infantryEditorSchema = common.extend({
  unitType: z.literal(UnitType.INFANTRY),
  umuMP: z.number().optional(),
  squadSize: z.number(),
  numberOfSquads: z.number(),
  motionType: z.enum(SquadMotionType),
  infantryMotive: z.enum(InfantryMotive),
  platoonComposition: z.object({
    squads: z.number(),
    troopersPerSquad: z.number(),
  }),
  groundMP: z.number(),
  jumpMP: z.number(),
  primaryWeapon: z.string(),
  primaryWeaponId: z.string().optional(),
  secondaryWeapon: z.string().optional(),
  secondaryWeaponId: z.string().optional(),
  secondaryWeaponCount: z.number(),
  armorKit: z.enum(InfantryArmorKit),
  damageDivisor: z.number(),
  specialization: z.enum(InfantrySpecialization),
  hasAntiMechTraining: z.boolean(),
  isAugmented: z.boolean(),
  augmentationType: z.string().optional(),
  fieldGuns: z.array(
    z.object({
      weaponId: z.string(),
      equipmentId: z.string(),
      name: z.string(),
      ammoRounds: z.number(),
      crewCount: z.number(),
      crew: z.number(),
    }),
  ),
});
