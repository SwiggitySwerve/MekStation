import { z } from 'zod';

import type { IUnitContract } from '@/types/contracts';

import { formatTechType } from '@/services/conversion/BlkExportServiceCore.formatters';
import {
  getBlkProtoEquipmentByLocation,
  readBlkProtoBooster,
} from '@/services/conversion/BlkProtoEquipment';
import { readBlkProtoEquipmentEntry } from '@/services/conversion/BlkProtoEquipmentEntry';
import {
  type BattleArmorState,
  createDefaultBattleArmorState,
} from '@/stores/battleArmorState';
import {
  type ProtoMechState,
  createDefaultProtoMechState,
} from '@/stores/protoMechState';
import {
  BattleArmorLocation,
  ProtoMechLocation,
} from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  BAArmorType,
  BA_WEIGHT_CLASS_LIMITS,
} from '@/types/unit/BattleArmorInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  ManipulatorType,
} from '@/types/unit/PersonnelInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  battleArmorEditorSchema,
  protoMechEditorSchema,
  renewSmallUnitMounts,
} from '@/types/unit/SmallUnitSerialization';
import { mapBattleArmorContractArmor } from '@/utils/construction/battlearmor/battleArmorBVAdapter';
import { parseBattleArmorManipulator } from '@/utils/construction/battlearmor/manipulators';
import {
  getProtoWeightClass,
  ProtoWeightClass,
  computeProtoEngineRating,
  computeProtoStructure,
  computeRunMP,
} from '@/utils/construction/protomech';
import { PROTO_ARMOR_CODES } from '@/utils/construction/protomech/armorType';

import { mapRulesLevel, mapTechBase } from './componentMappers';
import { UnsupportedUnitConfigurationError } from './movementConfiguration';

export { PROTO_ARMOR_CODES } from '@/utils/construction/protomech/armorType';

function enumValue<T extends string>(
  values: Record<string, T>,
  key: string,
): T {
  const result = Object.hasOwn(values, key) ? values[key] : undefined;
  if (result === undefined)
    throw new UnsupportedUnitConfigurationError(
      'The editor cannot open this unit configuration yet.',
    );
  return result;
}
function identity(definition: IUnitContract) {
  const {
    chassis,
    model = '',
    techBase,
    year,
    rulesLevel,
    mulId,
  } = z
    .object({
      chassis: z.string(),
      model: z.string().optional(),
      techBase: z.string(),
      year: z.number(),
      rulesLevel: z.string(),
      mulId: z.union([z.string(), z.number()]).optional(),
    })
    .parse(definition);
  return {
    chassis,
    model,
    name: `${chassis} ${model}`.trim(),
    techBase: mapTechBase(techBase),
    year,
    rulesLevel: mapRulesLevel(rulesLevel),
    mulId: String(mulId ?? -1),
  };
}

/** Project source facts; construction arithmetic stays with the ProtoMech owner. */
export function mapProtoMechDefinitionToState(
  definition: IUnitContract,
): ProtoMechState {
  if (definition.smallUnitEditor !== undefined) {
    const editor = protoMechEditorSchema.parse(definition.smallUnitEditor);
    const state = { ...createDefaultProtoMechState(), ...editor };
    return {
      ...state,
      equipment: renewSmallUnitMounts(editor.equipment, state.id),
    };
  }
  const source = z
    .object({
      tonnage: z.number(),
      isQuad: z.boolean(),
      isGlider: z.boolean(),
      hasMainGun: z.boolean(),
      armor: z.object({
        type: z.enum(
          Object.keys(PROTO_ARMOR_CODES) as (keyof typeof PROTO_ARMOR_CODES)[],
        ),
        byLocation: z.record(z.string(), z.number()),
      }),
      movement: z.object({ cruiseMP: z.number(), jumpMP: z.number() }),
    })
    .parse(definition);
  const chassisType = source.isQuad
    ? ProtoChassis.QUAD
    : source.isGlider
      ? ProtoChassis.GLIDER
      : getProtoWeightClass(source.tonnage) === ProtoWeightClass.ULTRAHEAVY
        ? ProtoChassis.ULTRAHEAVY
        : ProtoChassis.BIPED;
  const fields = identity(definition);
  const state = createDefaultProtoMechState({
    ...fields,
    tonnage: source.tonnage,
    chassisType,
  });
  const equipment = [...(definition.equipment ?? [])].map((item, index) => ({
    id: `${state.id}-${index}`,
    equipmentId: item.name ?? item.id,
    name: item.name ?? item.id,
    location:
      item.location === 'BODY'
        ? ProtoMechLocation.TORSO
        : enumValue(ProtoMechLocation, item.location),
    blkSource: {
      ...readBlkProtoEquipmentEntry(item.name ?? item.id),
      blockKey:
        item.location === 'BODY'
          ? 'Body'
          : enumValue(ProtoMechLocation, item.location),
    },
  }));
  const hasMyomerBooster = readBlkProtoBooster(
    getBlkProtoEquipmentByLocation(equipment),
    source.hasMainGun,
    formatTechType(fields.techBase, fields.rulesLevel),
  ).hasMyomerBooster;
  return {
    ...state,
    ...fields,
    walkMP: source.movement.cruiseMP,
    cruiseMP: source.movement.cruiseMP,
    flankMP: computeRunMP(source.movement.cruiseMP, hasMyomerBooster),
    jumpMP: source.movement.jumpMP,
    engineRating:
      definition.engine?.rating ??
      computeProtoEngineRating(
        source.tonnage,
        source.movement.cruiseMP,
        chassisType,
      ),
    hasMainGun: source.hasMainGun,
    mainGunWeaponId: equipment.find(
      (e) => e.location === ProtoMechLocation.MAIN_GUN,
    )?.equipmentId,
    hasMyomerBooster,
    hasMagneticClamps: equipment.some((e) => e.name === 'ProtoMagneticClamp'),
    armorType: PROTO_ARMOR_CODES[source.armor.type],
    armorByLocation: {
      ...state.armorByLocation,
      ...Object.fromEntries(
        Object.entries(source.armor.byLocation).map(([location, value]) => [
          enumValue(ProtoMechLocation, location),
          value,
        ]),
      ),
    },
    structureByLocation: computeProtoStructure(
      source.tonnage,
      chassisType,
      source.hasMainGun,
    ),
    equipment,
    librarySource: definition,
  };
}

/** Existing BA stores retain suit mounts separately from squad/trooper locations. */
export function mapBattleArmorDefinitionToState(
  definition: IUnitContract,
): BattleArmorState {
  if (definition.smallUnitEditor !== undefined) {
    const editor = battleArmorEditorSchema.parse(definition.smallUnitEditor);
    const state = { ...createDefaultBattleArmorState(), ...editor };
    return {
      ...state,
      equipment: renewSmallUnitMounts(editor.equipment, state.id),
    };
  }
  const source = z
    .object({
      squadSize: z.number().int().positive(),
      weightClass: z.string(),
      chassisType: z.string(),
      motionType: z.string(),
      armorPerTrooper: z.number(),
      armor: z.object({ type: z.string() }),
      movement: z.object({
        groundMP: z.number(),
        jumpMP: z.number(),
        umuMP: z.number(),
      }),
      manipulators: z.object({
        leftArm: z.string().nullable(),
        rightArm: z.string().nullable(),
      }),
    })
    .parse(definition);
  const fields = identity(definition);
  // BattleArmor.java:953-987 (48fcb2f64): native Clan chassis ignore missile burden.
  if (definition.techBase === 'MIXED' && definition.clanChassis !== undefined)
    fields.techBase = definition.clanChassis
      ? TechBase.CLAN
      : TechBase.INNER_SPHERE;
  const state = createDefaultBattleArmorState(fields);
  const weightClass = enumValue(
    BattleArmorWeightClass,
    source.weightClass === 'PAL' ? 'PA_L' : source.weightClass,
  );
  const { armorType, baArmorType } = mapBattleArmorContractArmor(
    source.armor.type,
  );
  const manipulator = (value: string | null) => {
    const result = parseBattleArmorManipulator(
      value
        ?.replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/Claw|Manipulator/g, '')
        .replace(/\s+/g, ' '),
    );
    if (value && result === ManipulatorType.NONE)
      throw new UnsupportedUnitConfigurationError(
        'The battle armor editor cannot open this manipulator type yet.',
      );
    return result;
  };
  const equipment = [...(definition.equipment ?? [])].map((item, index) => ({
    id: `${state.id}-${index}`,
    equipmentId: [
      item.name ?? item.id,
      ...(item.isDWPMounted ? ['DWP'] : []),
      ...(item.isSquadSupportWeapon ? ['SSWM'] : []),
      ...(item.shots === undefined ? [] : [`Shots${item.shots}#`]),
      ...(item.size === undefined ? [] : [`SIZE:${item.size}`]),
    ].join(':'),
    name: item.name ?? item.id,
    location:
      item.location === 'NONE'
        ? BattleArmorLocation.SQUAD
        : enumValue(BattleArmorLocation, item.location),
    unitLocation: item.unitLocation,
    isAPMount: item.isAPMMounted ?? false,
    isTurretMounted: item.location === 'TURRET',
    isModular: false,
  }));
  return {
    ...state,
    ...fields,
    squadSize: source.squadSize,
    weightClass,
    weightPerTrooper: BA_WEIGHT_CLASS_LIMITS[weightClass].maxMassKg,
    chassisType: enumValue(BattleArmorChassisType, source.chassisType),
    motionType: enumValue(
      SquadMotionType,
      source.motionType === 'GROUND' ? 'FOOT' : source.motionType,
    ),
    groundMP: source.movement.groundMP,
    jumpMP: source.movement.jumpMP,
    umuMP: source.movement.umuMP,
    armorPerTrooper: source.armorPerTrooper,
    armorType,
    baArmorType,
    leftManipulator: manipulator(source.manipulators.leftArm),
    rightManipulator: manipulator(source.manipulators.rightArm),
    hasMechanicalJumpBoosters: equipment.some(
      (e) => e.name === 'BAMechanicalJumpBooster',
    ),
    hasAPMount: definition.hasAntiPersonnelMount ?? false,
    hasModularMount: definition.hasModularWeaponMount ?? false,
    hasTurretMount: equipment.some((e) => e.isTurretMounted),
    hasStealthSystem: baArmorType.startsWith('Stealth'),
    stealthType: baArmorType.startsWith('Stealth') ? baArmorType : undefined,
    hasMimeticArmor: baArmorType === BAArmorType.MIMETIC,
    hasFireResistantArmor: baArmorType === BAArmorType.FIRE_RESISTANT,
    equipment,
    librarySource: definition,
  };
}
