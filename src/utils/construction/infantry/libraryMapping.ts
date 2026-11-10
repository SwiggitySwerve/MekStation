import { z } from 'zod';

import type { InfantryState } from '@/stores/infantryState';
import type { IUnitContract } from '@/types/contracts';

import {
  mapRulesLevel,
  mapTechBase,
  mapUnitTechBaseIdentity,
} from '@/services/units/unitLoaderService/componentMappers';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { InfantryMotive } from '@/types/unit/InfantryInterfaces';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';
import { infantryEditorSchema } from '@/types/unit/SmallUnitSerialization';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';

import { FIELD_GUN_CATALOG, buildFieldGun } from './fieldGuns';
import {
  resolveInfantryProtection,
  type InfantryStateLike,
} from './infantryBVAdapter';
import {
  resolveInfantryOffenseSource,
  squadMotionTypeForMotive,
} from './platoonComposition';

/** Reconstruct declarations for the existing source owner; never recalculate protection here. */
function sourceTags(source: IUnitContract): Record<string, string | string[]> {
  const tags: Record<string, string | string[]> = {
    motion_type: source.motiveType ?? 'Leg',
    armordivisor: String(source.customArmorDamageDivisor ?? 1),
    specialization: String(source.specializations ?? 0),
    augmentation: source.augmentations ?? [],
    ...source.prostheticEnhancements,
    ...Object.fromEntries(
      Object.entries(source.prostheticEnhancementCounts ?? {}).map(
        ([key, value]) => [`${key}Count`, String(value)],
      ),
    ),
    'Troopers Equipment': [...(source.equipment ?? [])]
      .filter((e) => e.location === 'TROOPERS')
      .map((e) => e.name ?? e.id),
    'Field Guns Equipment': [...(source.equipment ?? [])]
      .filter((e) => e.location === 'FIELD_GUNS')
      .map((e) => e.name ?? e.id),
  };
  for (const flag of source.armorFlags ?? []) tags[flag] = '';
  if (source.armorKit) tags.armorKit = source.armorKit;
  if (source.customArmorName) tags.armor_name = source.customArmorName;
  return tags;
}

function sourceOffense(
  source: IUnitContract,
  state: Pick<
    InfantryState,
    | 'primaryWeapon'
    | 'secondaryWeapon'
    | 'numberOfSquads'
    | 'secondaryWeaponCount'
  >,
) {
  const tags = sourceTags(source);
  tags.Primary = state.primaryWeapon;
  tags.squadn = String(state.numberOfSquads);
  if (state.secondaryWeapon) tags.Secondary = state.secondaryWeapon;
  tags.secondn = String(state.secondaryWeaponCount);
  const protection = resolveInfantryProtection(tags);
  return {
    protection,
    movement: resolveInfantryOffenseSource(tags, protection.isArmorEncumbering),
  };
}

/** Native source modifiers with editable composition and weapon inputs. */
export function infantryLibraryBVInput(
  state: InfantryState,
): InfantryStateLike | undefined {
  const source = state.librarySource;
  if (!source) return undefined;
  const { protection, movement } = sourceOffense(source, state);
  return {
    ...state,
    hasArmorKit: protection.hasArmorKit,
    hasPheromoneEffuser: protection.hasPheromoneEffuser,
    bvArmorFlags: source.effectiveArmorFlags ?? protection.bvArmorFlags,
    bvOffense: movement,
    // The converter already applied kit, augmentation and beast divisor effects.
    damageDivisor: state.damageDivisor,
  };
}

/** Pure catalog-to-store projection. The loader supplies existing factory identity/timestamps. */
export function mapInfantryDefinition(
  definition: IUnitContract,
): Partial<InfantryState> {
  if (definition.smallUnitEditor !== undefined)
    return {
      ...infantryEditorSchema.parse(definition.smallUnitEditor),
      ...mapUnitTechBaseIdentity('infantry', definition),
    };
  const source = z
    .object({
      unitType: z.literal('Infantry'),
      chassis: z.string(),
      model: z.string().optional(),
      techBase: z.string(),
      year: z.number(),
      rulesLevel: z.string(),
      platoon: z.object({
        squadSize: z.number().int().positive(),
        squadCount: z.number().int().positive(),
      }),
      primaryWeapon: z.union([
        z.string(),
        z.object({ id: z.string(), name: z.string() }),
      ]),
      secondaryWeapon: z
        .object({ id: z.string(), name: z.string(), count: z.number() })
        .optional(),
      motionType: z.string(),
      motiveType: z.string(),
      damageDivisor: z.number().positive(),
    })
    .parse(definition);
  const motionType =
    source.motionType === 'SUBMARINE'
      ? SquadMotionType.UMU
      : Object.entries(SquadMotionType).find(
          ([key]) => key === source.motionType,
        )?.[1];
  if (!motionType)
    throw new Error('The infantry editor cannot open this movement type yet.');
  const infantryMotive =
    Object.values(InfantryMotive).find(
      (motive) => squadMotionTypeForMotive(motive) === motionType,
    ) ?? InfantryMotive.FOOT;
  const primary =
    typeof source.primaryWeapon === 'string'
      ? { name: source.primaryWeapon, id: source.primaryWeapon }
      : source.primaryWeapon;
  const armorKit =
    Object.values(InfantryArmorKit).find(
      (kit) => kit === definition.armorKit,
    ) ?? InfantryArmorKit.NONE;
  const config = {
    chassis: source.chassis,
    model: source.model ?? '',
    techBase: mapTechBase(source.techBase),
    rulesLevel: mapRulesLevel(source.rulesLevel),
    year: source.year,
    mulId: String(definition.mulId ?? -1),
    squadSize: source.platoon.squadSize,
    numberOfSquads: source.platoon.squadCount,
    platoonComposition: {
      squads: source.platoon.squadCount,
      troopersPerSquad: source.platoon.squadSize,
    },
    motionType,
    infantryMotive,
    armorKit,
    damageDivisor: source.damageDivisor,
    primaryWeapon: primary.name,
    primaryWeaponId: primary.id,
    secondaryWeapon: source.secondaryWeapon?.name,
    secondaryWeaponId: source.secondaryWeapon?.id,
    secondaryWeaponCount: source.secondaryWeapon?.count ?? 0,
    isAugmented: !!definition.augmentations?.length,
    augmentationType: definition.augmentations?.join(', '),
    librarySource: definition,
    fieldGuns: [...(definition.equipment ?? [])]
      .filter((e) => e.location === 'FIELD_GUNS')
      .flatMap((e) => {
        const item = getEquipmentEntry(e.name ?? e.id);
        const gun = FIELD_GUN_CATALOG.find(
          (g) =>
            g.name === e.name ||
            g.id === e.id ||
            (item && getEquipmentEntry(g.name)?.id === item.id),
        );
        return gun ? [buildFieldGun(gun, 0)] : [];
      }),
  } satisfies Partial<InfantryState>;
  const { movement } = sourceOffense(definition, config);
  return {
    ...config,
    groundMP: movement.runMP,
    jumpMP: movement.jumpMP,
    umuMP: movement.umuMP,
    ...mapUnitTechBaseIdentity('infantry', definition),
  };
}
