import type { IRawSerializedUnit } from '@/services/units/unitLoaderService/types';
import type { UnitState } from '@/stores/unitState';
import type { IArmorAllocation } from '@/types/construction/ArmorAllocation';
import type {
  IComponentTechBases,
  TechBaseComponent,
  TechBaseMode,
} from '@/types/construction/TechBaseConfiguration';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import {
  resolveUnitChassisTechBase,
  serializeComponentTechBases,
  serializeTechBaseMode,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import { calculateRatedWalkMP } from '@/utils/construction/engineCalculations';

import type { UnitData } from '../../../scripts/validate-bv-types';
import type {
  IEditableMech,
  IArmorAllocation as IEditableArmorAllocation,
} from './MechBuilderService';

import { deriveEffectiveConfiguration } from '../../../scripts/validate-bv-calculator-setup';
import { toMechLoc } from '../../../scripts/validate-bv-normalizers';
import { extractJumpMP } from './CalculationService.calculations';

export function buildEditableArmorAllocation(
  armorAllocation: IArmorAllocation,
): IEditableArmorAllocation {
  return {
    head: armorAllocation[MechLocation.HEAD],
    centerTorso: armorAllocation[MechLocation.CENTER_TORSO],
    centerTorsoRear: armorAllocation.centerTorsoRear,
    leftTorso: armorAllocation[MechLocation.LEFT_TORSO],
    leftTorsoRear: armorAllocation.leftTorsoRear,
    rightTorso: armorAllocation[MechLocation.RIGHT_TORSO],
    rightTorsoRear: armorAllocation.rightTorsoRear,
    leftArm: armorAllocation[MechLocation.LEFT_ARM],
    rightArm: armorAllocation[MechLocation.RIGHT_ARM],
    leftLeg: armorAllocation[MechLocation.LEFT_LEG],
    rightLeg: armorAllocation[MechLocation.RIGHT_LEG],
    frontLeftLeg: armorAllocation[MechLocation.FRONT_LEFT_LEG] ?? 0,
    frontRightLeg: armorAllocation[MechLocation.FRONT_RIGHT_LEG] ?? 0,
    rearLeftLeg: armorAllocation[MechLocation.REAR_LEFT_LEG] ?? 0,
    rearRightLeg: armorAllocation[MechLocation.REAR_RIGHT_LEG] ?? 0,
    centerLeg: armorAllocation[MechLocation.CENTER_LEG] ?? 0,
  };
}

export interface IEditableMechProjectionInput {
  readonly bvContext?: IMechBVContext;
  readonly jumpMP?: number;
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly tonnage: number;
  readonly configuration: MechConfiguration;
  readonly techBase: string;
  readonly techBaseMode?: TechBaseMode;
  readonly componentTechBases?: Pick<
    IComponentTechBases,
    TechBaseComponent.CHASSIS
  >;
  /**
   * Explicit chassis provenance for a caller that has no `bvContext`. No editor read point supplies
   * it any more: they all get `bvContext` from {@link buildEditableMechProjectionInput}, and the
   * projection falls back to `bvContext.source`.
   */
  readonly chassisSource?: Pick<IRawSerializedUnit, 'componentTechBases'>;
  readonly engineType: IEditableMech['engineType'];
  readonly engineRating: number;
  readonly internalStructureType: IEditableMech['structureType'];
  readonly gyroType: IEditableMech['gyroType'];
  readonly cockpitType: IEditableMech['cockpitType'];
  readonly armorType: IEditableMech['armorType'];
  readonly armorAllocation: IArmorAllocation;
  readonly heatSinkType: IEditableMech['heatSinkType'];
  readonly heatSinkCount: number;
  readonly equipment: readonly IMountedEquipmentInstance[];
}

/**
 * Every field of {@link IEditableMechProjectionInput}. `satisfies` makes the list exhaustive: adding a
 * field to the interface without listing it here is a compile error, so the owner can never silently
 * drop one (this is how `PreviewTab` once lost `bvContext`).
 */
const PROJECTION_INPUT_FIELDS = {
  bvContext: true,
  jumpMP: true,
  name: true,
  chassis: true,
  model: true,
  tonnage: true,
  configuration: true,
  techBase: true,
  techBaseMode: true,
  componentTechBases: true,
  chassisSource: true,
  engineType: true,
  engineRating: true,
  internalStructureType: true,
  gyroType: true,
  cockpitType: true,
  armorType: true,
  armorAllocation: true,
  heatSinkType: true,
  heatSinkCount: true,
  equipment: true,
} as const satisfies Record<keyof IEditableMechProjectionInput, true>;

/**
 * The one owner of `projectEditableMech`'s input. Picks every projection field from the unit's state
 * (a `UnitState`, the unit store's state, or a props object carrying the same fields) and nothing
 * else. Read points pass their state to this function; none assembles the input field by field.
 * Absent fields stay absent so `projectEditableMech`'s undefined checks keep their meaning.
 */
export function buildEditableMechProjectionInput<
  S extends IEditableMechProjectionInput,
>(source: S): Pick<S, Extract<keyof S, keyof IEditableMechProjectionInput>> {
  // Generic so a caller keeps its own narrower field types (the store's engine and gyro enums).
  const input: Record<string, unknown> = {};
  for (const key of Object.keys(PROJECTION_INPUT_FIELDS)) {
    const value = (source as unknown as Record<string, unknown>)[key];
    if (value !== undefined) input[key] = value;
  }
  return input as Pick<S, Extract<keyof S, keyof IEditableMechProjectionInput>>;
}

/** Shared construction-service projection for editor summaries and record sheets. */
export function projectEditableMech(
  state: IEditableMechProjectionInput,
  walkMP: number,
  id = 'preview',
): IEditableMech {
  const sourceChassis = resolveUnitChassisTechBase(
    'battlemechs',
    state.chassisSource ?? state.bvContext?.source ?? {},
  );
  // The loader's binary IS fallback is not construction evidence. Only a
  // source-backed selection may replace the legacy BV owner's fallback.
  const chassisTechBase =
    sourceChassis === undefined
      ? undefined
      : (state.componentTechBases?.chassis ?? sourceChassis);
  return {
    id,
    bvContext: state.bvContext,
    jumpMP: state.jumpMP,
    chassis: state.chassis || state.name.split(' ')[0] || 'Unknown',
    variant:
      state.model || state.name.split(' ').slice(1).join(' ') || 'Custom',
    tonnage: state.tonnage,
    configuration: state.configuration,
    techBase: state.techBase as TechBase,
    ...(state.techBaseMode === undefined
      ? {}
      : { techBaseMode: state.techBaseMode }),
    ...(chassisTechBase === undefined ? {} : { chassisTechBase }),
    engineType: state.engineType,
    engineRating: state.engineRating,
    walkMP,
    structureType: state.internalStructureType,
    gyroType: state.gyroType,
    cockpitType: state.cockpitType,
    armorType: state.armorType,
    armorAllocation: buildEditableArmorAllocation(state.armorAllocation),
    heatSinkType: state.heatSinkType,
    heatSinkCount: state.heatSinkCount,
    equipment: state.equipment.map((item) => ({
      instanceId: item.instanceId,
      name: item.name,
      category: item.category,
      slots: item.slots,
      criticalSlots: item.criticalSlots,
      isRearMounted: item.isRearMounted,
      equipmentId: item.equipmentId,
      location: item.location ?? '',
      slotIndex: item.slots?.[0] ?? 0,
    })),
    isDirty: false,
  };
}

/** Source details that normalization cannot represent; never a cached BV. */
export interface IMechBVContext {
  readonly source: IRawSerializedUnit;
  readonly equipment: readonly IMountedEquipmentInstance[];
  readonly types: Pick<
    UnitState,
    | 'engineType'
    | 'gyroType'
    | 'internalStructureType'
    | 'cockpitType'
    | 'armorType'
    | 'heatSinkType'
  >;
}

/** @spec openspec/specs/battle-value-system/spec.md */
export function buildEditableMechBVInput(mech: IEditableMech): UnitData {
  const context = mech.bvContext;
  const source = context?.source;
  const types = context?.types;
  const sourceType = (
    live: string,
    baseline: string | undefined,
    original: string | undefined,
  ) => (live === baseline && original ? original : live);
  const criticalSlots = Object.fromEntries(
    Object.entries(source?.criticalSlots ?? {}).map(([loc, slots]) => [
      loc,
      [...slots],
    ]),
  );
  const critLocation = (location: string) => {
    const short = toMechLoc(location);
    return (
      (short &&
        Object.keys(criticalSlots).find((key) => toMechLoc(key) === short)) ||
      location.toUpperCase().replace(/ /g, '_')
    );
  };
  const equipment: UnitData['equipment'] = [];
  const current = new Map(
    mech.equipment.map((item, index) => [
      item.instanceId ?? String(index),
      item,
    ]),
  );
  context?.equipment.forEach((original, index) => {
    const live = current.get(original.instanceId);
    const unchanged =
      live &&
      live.equipmentId === original.equipmentId &&
      live.location === (original.location ?? '') &&
      live.isRearMounted === original.isRearMounted &&
      JSON.stringify(live.slots) === JSON.stringify(original.slots);
    if (unchanged) {
      const raw = source?.equipment?.[index];
      // Recovered ammo/sinks already exist in the critical grid. Some ammo IDs
      // are also weapon IDs, so adding them here would invent extra weapons.
      if (raw)
        equipment.push({
          id: raw.id,
          location: raw.location,
          category: live.category,
        });
      current.delete(original.instanceId);
    } else if (original.location) {
      const loc = critLocation(original.location);
      for (const slot of original.slots ?? []) {
        if (criticalSlots[loc]) criticalSlots[loc][slot] = null;
      }
    }
  });
  for (const item of current.values()) {
    const loc = critLocation(item.location);
    equipment.push({
      id: item.equipmentId,
      location: loc + (item.isRearMounted ? ' (R)' : ''),
      category: item.category,
    });
    if (!loc) continue;
    const slots = (criticalSlots[loc] ??= []);
    const name =
      (item.name ?? item.equipmentId) + (item.isRearMounted ? ' (R)' : '');
    for (
      let i = 0;
      i < Math.max(1, item.slots?.length ?? item.criticalSlots ?? 1);
      i++
    ) {
      const slot = item.slots?.[i];
      if (slot === undefined) slots.push(name);
      else slots[slot] = name;
    }
  }
  const a = mech.armorAllocation;
  const effectiveConfiguration =
    source?.configuration === mech.configuration
      ? deriveEffectiveConfiguration(
          mech.configuration,
          '',
          Object.keys(source?.armor?.allocation ?? {}),
        )
      : mech.configuration;
  const quad =
    effectiveConfiguration === MechConfiguration.QUAD ||
    effectiveConfiguration === MechConfiguration.QUADVEE;
  const allocation: UnitData['armor']['allocation'] = {
    HEAD: a.head,
    CENTER_TORSO: { front: a.centerTorso, rear: a.centerTorsoRear },
    LEFT_TORSO: { front: a.leftTorso, rear: a.leftTorsoRear },
    RIGHT_TORSO: { front: a.rightTorso, rear: a.rightTorsoRear },
    ...(quad
      ? {
          FRONT_LEFT_LEG: a.frontLeftLeg ?? 0,
          FRONT_RIGHT_LEG: a.frontRightLeg ?? 0,
          REAR_LEFT_LEG: a.rearLeftLeg ?? 0,
          REAR_RIGHT_LEG: a.rearRightLeg ?? 0,
        }
      : {
          LEFT_ARM: a.leftArm,
          RIGHT_ARM: a.rightArm,
          LEFT_LEG: a.leftLeg,
          RIGHT_LEG: a.rightLeg,
          // The shared owner also recognizes legacy Biped-labeled tripods.
          ...(mech.configuration === MechConfiguration.TRIPOD || a.centerLeg
            ? { CENTER_LEG: a.centerLeg ?? 0 }
            : {}),
        }),
  };
  let engine = sourceType(
    String(mech.engineType),
    types?.engineType,
    source?.engine?.type,
  );
  if (engine === EngineType.XL_IS) engine = 'XL';
  if (engine === EngineType.XL_CLAN) engine = 'CLAN_XL';
  return {
    id: source?.id ?? mech.id,
    chassis: mech.chassis,
    model: mech.variant,
    unitType: source?.unitType ?? 'BattleMech',
    configuration: mech.configuration ?? 'Biped',
    lamType: typeof source?.lamType === 'string' ? source.lamType : undefined,
    techBase:
      mech.techBaseMode === undefined
        ? (source?.techBase ??
          String(mech.techBase).toUpperCase().replace(/ /g, '_'))
        : serializeTechBaseMode(mech.techBaseMode),
    ...(mech.chassisTechBase === undefined
      ? {}
      : {
          componentTechBases: serializeComponentTechBases({
            chassis: mech.chassisTechBase,
          }),
        }),
    tonnage: mech.tonnage,
    engine: { type: engine, rating: mech.engineRating },
    gyro: {
      type: sourceType(
        String(mech.gyroType),
        types?.gyroType,
        source?.gyro?.type,
      ),
    },
    cockpit: sourceType(
      String(mech.cockpitType),
      types?.cockpitType,
      source?.cockpit,
    ),
    structure: {
      type: sourceType(
        String(mech.structureType),
        types?.internalStructureType,
        source?.structure?.type,
      ),
    },
    armor: {
      type: sourceType(
        String(mech.armorType),
        types?.armorType,
        source?.armor?.type,
      ),
      allocation,
    },
    heatSinks: {
      type: sourceType(
        String(mech.heatSinkType),
        types?.heatSinkType,
        source?.heatSinks?.type,
      ),
      count: mech.heatSinkCount,
    },
    movement: {
      // Rated walk MP owns the primitive-engine rule; mech.walkMP is the fallback for an unrated mech.
      walk:
        mech.engineRating > 0 && mech.tonnage > 0
          ? calculateRatedWalkMP(
              mech.engineRating,
              mech.tonnage,
              String(mech.cockpitType),
            )
          : mech.walkMP,
      jump: mech.jumpMP ?? extractJumpMP(mech),
    },
    equipment,
    criticalSlots,
  };
}
