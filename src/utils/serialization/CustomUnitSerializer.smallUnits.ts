import type { BattleArmorState } from '@/stores/battleArmorState';
import type { InfantryState } from '@/stores/infantryState';
import type { ProtoMechState } from '@/stores/protoMechState';

import { projectBattleArmorDefinition } from '@/services/units/unitLoaderService/battleArmorDefinitionProjection';
import { projectInfantryDefinition } from '@/services/units/unitLoaderService/infantryDefinitionProjection';
import {
  mapProtoMechDefinitionToState,
  mapBattleArmorDefinitionToState,
} from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { applyUnitTechBaseIdentity } from '@/types/construction/TechBaseConfiguration';
import {
  BattleArmorLocation,
  ProtoMechLocation,
} from '@/types/construction/UnitLocation';
import { UnitContract, type IUnitContract } from '@/types/contracts';
import { CURRENT_UNIT_SCHEMA_VERSION } from '@/types/contracts/generated/unit.zod';
import { RULES_LEVEL_TAGS as RULES_LEVEL } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  battleArmorEditorSchema,
  protoMechEditorSchema,
  infantryEditorSchema,
} from '@/types/unit/SmallUnitSerialization';
import { mapInfantryDefinition } from '@/utils/construction/infantry/libraryMapping';
import { squadMotionTypeForMotive } from '@/utils/construction/infantry/platoonComposition';
import { protoArmorContractType } from '@/utils/construction/protomech/armorType';

import type { CustomUnitSaveIdentity } from './CustomUnitSerializer';

/** Small-unit store -> contract, retaining source declarations and exact editor facts. */
export function serializeCustomSmallUnitState(
  state: ProtoMechState | BattleArmorState | InfantryState,
  identity: CustomUnitSaveIdentity,
): IUnitContract & {
  family: 'protomechs' | 'battlearmor' | 'infantry';
  smallUnitEditor:
    | ReturnType<typeof protoMechEditorSchema.parse>
    | ReturnType<typeof battleArmorEditorSchema.parse>
    | ReturnType<typeof infantryEditorSchema.parse>;
} {
  const family =
    state.unitType === UnitType.PROTOMECH
      ? 'protomechs'
      : state.unitType === UnitType.BATTLE_ARMOR
        ? 'battlearmor'
        : 'infantry';
  const source = state.librarySource;
  const smallUnitEditor = (
    state.unitType === UnitType.PROTOMECH
      ? protoMechEditorSchema
      : state.unitType === UnitType.BATTLE_ARMOR
        ? battleArmorEditorSchema
        : infantryEditorSchema
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
    value: ProtoMechState | BattleArmorState | InfantryState,
  ): Record<string, unknown> => ({
    unitType: value.unitType,
    year: value.year,
    mulId: value.mulId,
    techBase: value.techBase === TechBase.CLAN ? 'CLAN' : 'INNER_SPHERE',
    rulesLevel: RULES_LEVEL[value.rulesLevel],
    ...(value.unitType === UnitType.INFANTRY
      ? projectInfantryDefinition({
          ...value,
          motiveType: squadMotionTypeForMotive(value.infantryMotive),
        })
      : value.unitType === UnitType.PROTOMECH
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
              type: protoArmorContractType(value.armorType),
              byLocation: Object.fromEntries(
                Object.entries(value.armorByLocation).map(([key, points]) => [
                  location(key),
                  points,
                ]),
              ),
            },
            mainGun: {
              weapons: value.equipment
                .filter(
                  (mount) => mount.location === ProtoMechLocation.MAIN_GUN,
                )
                .map((mount) => ({ id: mount.equipmentId, name: mount.name })),
            },
          }
        : projectBattleArmorDefinition(value)),
    ...(value.unitType === UnitType.PROTOMECH
      ? {
          equipment: value.equipment.map((mount) => ({
            id: mount.equipmentId,
            name: mount.name,
            location: location(mount.location),
            ...('unitLocation' in mount
              ? { unitLocation: mount.unitLocation }
              : {}),
            ...('isAPMount' in mount ? { isAPMMounted: mount.isAPMount } : {}),
          })),
        }
      : {}),
  });
  const original = source
    ? state.unitType === UnitType.INFANTRY
      ? { ...state, ...mapInfantryDefinition(source) }
      : state.unitType === UnitType.PROTOMECH
        ? mapProtoMechDefinitionToState(source)
        : mapBattleArmorDefinitionToState(source)
    : undefined;
  const baseline = original ? project(original) : {};
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
    schemaVersion: CURRENT_UNIT_SCHEMA_VERSION,
    id: identity.id,
    chassis: identity.chassis,
    model: identity.variant,
    variant: identity.variant,
    family,
    unitType: state.unitType,
    era: source?.year === state.year ? source.era : identity.era,
    smallUnitEditor,
  });
  return {
    ...applyUnitTechBaseIdentity(definition, state, family),
    family,
    smallUnitEditor,
  };
}
