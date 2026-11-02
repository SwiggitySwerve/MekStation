import type { BattleArmorState } from '@/stores/battleArmorState';
import type { ProtoMechState } from '@/stores/protoMechState';

import {
  mapProtoMechDefinitionToState,
  mapBattleArmorDefinitionToState,
  PROTO_ARMOR_CODES,
} from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import {
  BattleArmorLocation,
  ProtoMechLocation,
} from '@/types/construction/UnitLocation';
import { UnitContract, type IUnitContract } from '@/types/contracts';
import { RULES_LEVEL_TAGS as RULES_LEVEL } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { BattleArmorWeightClass } from '@/types/unit/PersonnelInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  battleArmorEditorSchema,
  protoMechEditorSchema,
} from '@/types/unit/SmallUnitSerialization';
import { battleArmorContractArmorType } from '@/utils/construction/battlearmor/battleArmorBVAdapter';

import type { CustomUnitSaveIdentity } from './CustomUnitSerializer';

/** Small-unit store -> contract, retaining source declarations and exact editor facts. */
export function serializeCustomSmallUnitState(
  state: ProtoMechState | BattleArmorState,
  identity: CustomUnitSaveIdentity,
): IUnitContract & {
  family: 'protomechs' | 'battlearmor';
  smallUnitEditor:
    | ReturnType<typeof protoMechEditorSchema.parse>
    | ReturnType<typeof battleArmorEditorSchema.parse>;
} {
  const family =
    state.unitType === UnitType.PROTOMECH ? 'protomechs' : 'battlearmor';
  const source = state.librarySource;
  const smallUnitEditor = (
    state.unitType === UnitType.PROTOMECH
      ? protoMechEditorSchema
      : battleArmorEditorSchema
  ).parse({
    ...state,
    chassis: identity.chassis,
    model: identity.variant,
    name: [identity.chassis, identity.variant].filter(Boolean).join(' '),
  });
  const location = (value: string) => {
    const tag = Object.entries({
      ...ProtoMechLocation,
      ...BattleArmorLocation,
    }).find(([, name]) => name === value)?.[0];
    if (!tag) throw new TypeError(`Unknown small-unit location: ${value}`);
    return tag;
  };
  const project = (
    value: ProtoMechState | BattleArmorState,
  ): Record<string, unknown> => ({
    unitType: value.unitType,
    year: value.year,
    mulId: value.mulId,
    techBase: value.techBase === TechBase.CLAN ? 'CLAN' : 'INNER_SPHERE',
    rulesLevel: RULES_LEVEL[value.rulesLevel],
    ...(value.unitType === UnitType.PROTOMECH
      ? {
          tonnage: value.tonnage,
          weightClass: value.weightClass.toUpperCase(),
          isQuad: value.chassisType === ProtoChassis.QUAD,
          isGlider: value.chassisType === ProtoChassis.GLIDER,
          hasMainGun: value.hasMainGun,
          engine: {
            type: value.librarySource?.engine?.type ?? 'FUSION',
            rating: value.engineRating,
          },
          movement: { cruiseMP: value.cruiseMP, jumpMP: value.jumpMP },
          armor: {
            type: Object.entries(PROTO_ARMOR_CODES).find(
              ([, code]) =>
                code ===
                (value.armorType || PROTO_ARMOR_CODES.STANDARD_PROTOMEK),
            )?.[0],
            byLocation: Object.fromEntries(
              Object.entries(value.armorByLocation).map(([key, points]) => [
                location(key),
                points,
              ]),
            ),
          },
          mainGun: {
            weapons: value.equipment
              .filter((mount) => mount.location === ProtoMechLocation.MAIN_GUN)
              .map((mount) => ({ id: mount.equipmentId, name: mount.name })),
          },
        }
      : {
          tonnage: value.squadSize,
          squadSize: value.squadSize,
          weightClass:
            value.weightClass === BattleArmorWeightClass.PA_L
              ? 'PAL'
              : value.weightClass.toUpperCase(),
          chassisType: value.chassisType.toUpperCase(),
          motionType: value.motionType.toUpperCase(),
          movement: {
            groundMP: value.groundMP,
            jumpMP: value.jumpMP,
            umuMP: value.umuMP,
          },
          armor: {
            type: battleArmorContractArmorType(value.armorType),
            perTrooper: value.armorPerTrooper,
          },
          armorPerTrooper: value.armorPerTrooper,
          manipulators: {
            leftArm: value.leftManipulator,
            rightArm: value.rightManipulator,
          },
          hasAntiPersonnelMount: value.hasAPMount,
          hasModularWeaponMount: value.hasModularMount,
        }),
    equipment: value.equipment.map((mount) => ({
      id: mount.equipmentId,
      name: mount.name,
      location: location(mount.location),
      ...('unitLocation' in mount ? { unitLocation: mount.unitLocation } : {}),
      ...('isAPMount' in mount ? { isAPMMounted: mount.isAPMount } : {}),
    })),
  });
  const baseline = source
    ? project(
        state.unitType === UnitType.PROTOMECH
          ? mapProtoMechDefinitionToState(source)
          : mapBattleArmorDefinitionToState(source),
      )
    : {};
  const patch = Object.fromEntries(
    Object.entries(project(state))
      .filter(
        ([key, value]) =>
          !source || JSON.stringify(value) !== JSON.stringify(baseline[key]),
      )
      .map(([key, value]) => {
        const original = source?.[key];
        return [
          key,
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          typeof original === 'object' &&
          original !== null &&
          !Array.isArray(original)
            ? { ...original, ...value }
            : value,
        ];
      }),
  );
  const definition = UnitContract.parse({
    ...source,
    ...patch,
    id: identity.id,
    chassis: identity.chassis,
    model: identity.variant,
    variant: identity.variant,
    family,
    unitType: state.unitType,
    era: source?.year === state.year ? source.era : identity.era,
    smallUnitEditor,
  });
  return { ...definition, family, smallUnitEditor };
}
