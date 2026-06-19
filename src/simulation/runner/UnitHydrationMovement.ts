import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IMovementCapability } from '@/types/gameplay';

import { deriveEdgePointCountFromPilotAbilities } from '@/utils/gameplay/spaModifiers';

import type {
  HeatSinkKind,
  IHydratedClawState,
  IHydratedTalonState,
} from './UnitHydrationTypes';

import {
  criticalSlotsFromFullUnit,
  equipmentSignalsFromFullUnit,
  locationSlotTexts,
} from './UnitHydrationEquipment';
import {
  normalizeCriticalSlotText,
  normalizeEquipmentId,
  normalizedWithoutTechPrefix,
} from './UnitHydrationText';

interface IFullUnitHeatSinks {
  readonly count?: number;
  readonly type?: string;
}

function toHeatSinkKind(type: unknown): HeatSinkKind {
  if (typeof type !== 'string') return 'single';
  return type.toUpperCase().includes('DOUBLE') ? 'double' : 'single';
}

export function hydrateHeatSinksFromFullUnit(fullUnit: IFullUnit): {
  readonly count: number;
  readonly kind: HeatSinkKind;
} {
  const heatSinks = (fullUnit as { heatSinks?: IFullUnitHeatSinks }).heatSinks;
  const count =
    typeof heatSinks?.count === 'number' && Number.isFinite(heatSinks.count)
      ? heatSinks.count
      : 10;
  return {
    count,
    kind: toHeatSinkKind(heatSinks?.type),
  };
}

export function hydratePilotAbilitiesFromFullUnit(
  fullUnit: IFullUnit,
): readonly string[] | undefined {
  const abilities = (fullUnit as { readonly abilities?: unknown }).abilities;
  if (!Array.isArray(abilities)) return undefined;

  const normalized = abilities.filter((ability): ability is string => {
    return typeof ability === 'string';
  });
  return normalized.length > 0 ? normalized : undefined;
}

function numericEdgePointValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export function hydrateEdgePointsFromFullUnit(
  fullUnit: IFullUnit,
): number | undefined {
  const abilities = hydratePilotAbilitiesFromFullUnit(fullUnit) ?? [];
  const explicitEdgePoints =
    numericEdgePointValue(
      (fullUnit as { readonly edgePointsRemaining?: unknown })
        .edgePointsRemaining,
    ) ??
    numericEdgePointValue(
      (fullUnit as { readonly edgePoints?: unknown }).edgePoints,
    );

  return deriveEdgePointCountFromPilotAbilities(abilities, explicitEdgePoints);
}

export function hydrateHasTSMFromFullUnit(fullUnit: IFullUnit): boolean {
  const movement = (
    fullUnit as {
      movement?: { enhancements?: readonly unknown[]; hasTSM?: boolean };
    }
  ).movement;
  if (movement?.hasTSM === true) return true;
  return (
    movement?.enhancements?.some(
      (enhancement) =>
        typeof enhancement === 'string' && enhancement.toLowerCase() === 'tsm',
    ) ?? false
  );
}

function movementEnhancementsContainSignal(
  fullUnit: IFullUnit,
  predicate: (id: string) => boolean,
): boolean {
  const movement = (
    fullUnit as {
      movement?: { enhancements?: readonly unknown[] };
    }
  ).movement;

  return (
    movement?.enhancements?.some(
      (enhancement) =>
        typeof enhancement === 'string' && predicate(enhancement),
    ) ?? false
  );
}

function isMASCSignal(id: string): boolean {
  return normalizeEquipmentId(id).includes('masc');
}

function isSuperchargerSignal(id: string): boolean {
  return normalizeEquipmentId(id).includes('supercharger');
}

export function hydrateHasMASCFromFullUnit(fullUnit: IFullUnit): boolean {
  const movement = (
    fullUnit as {
      movement?: { hasMASC?: boolean };
    }
  ).movement;
  if (movement?.hasMASC === true) return true;

  return (
    movementEnhancementsContainSignal(fullUnit, isMASCSignal) ||
    equipmentSignalsFromFullUnit(fullUnit).some((signal) =>
      isMASCSignal(signal.id),
    )
  );
}

export function hydrateHasSuperchargerFromFullUnit(
  fullUnit: IFullUnit,
): boolean {
  const movement = (
    fullUnit as {
      movement?: { hasSupercharger?: boolean };
    }
  ).movement;
  if (movement?.hasSupercharger === true) return true;

  return (
    movementEnhancementsContainSignal(fullUnit, isSuperchargerSignal) ||
    equipmentSignalsFromFullUnit(fullUnit).some((signal) =>
      isSuperchargerSignal(signal.id),
    )
  );
}

function isTargetingComputerSignal(id: string): boolean {
  const normalized = normalizeEquipmentId(id);
  const withoutTechPrefix = normalizedWithoutTechPrefix(normalized);
  return (
    normalized === 'targetingcomputer' ||
    normalized === 'targetingcomputeris' ||
    normalized === 'targetingcomputerclan' ||
    withoutTechPrefix === 'targetingcomputer'
  );
}

export function hydrateTargetingComputerEquipmentFromFullUnit(
  fullUnit: IFullUnit,
): boolean {
  return equipmentSignalsFromFullUnit(fullUnit).some((signal) =>
    isTargetingComputerSignal(signal.id),
  );
}

function normalizeMovementMP(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.floor(value));
}

export function hydrateMovementCapabilityFromFullUnit(
  fullUnit: IFullUnit,
): IMovementCapability | undefined {
  const movement = (
    fullUnit as {
      movement?: {
        walk?: unknown;
        walkMP?: unknown;
        cruiseMP?: unknown;
        run?: unknown;
        runMP?: unknown;
        flankMP?: unknown;
        jump?: unknown;
        jumpMP?: unknown;
      };
    }
  ).movement;
  if (!movement) return undefined;

  const walkMP = normalizeMovementMP(
    movement.walk ?? movement.walkMP ?? movement.cruiseMP,
  );
  if (walkMP === undefined) return undefined;

  const jumpMP = normalizeMovementMP(movement.jump ?? movement.jumpMP) ?? 0;
  const explicitRunMP = normalizeMovementMP(
    movement.run ?? movement.runMP ?? movement.flankMP,
  );

  return {
    walkMP,
    runMP: explicitRunMP ?? Math.ceil(walkMP * 1.5),
    jumpMP,
  };
}

export function hydrateMotionTypeFromFullUnit(
  fullUnit: IFullUnit,
): string | undefined {
  const motionType = (fullUnit as { motionType?: unknown }).motionType;
  return typeof motionType === 'string' && motionType.trim().length > 0
    ? motionType
    : undefined;
}

function isBattleMechPartialWingHost(fullUnit: IFullUnit): boolean {
  const unitType = (fullUnit as { unitType?: unknown }).unitType;
  if (typeof unitType !== 'string') return false;

  const normalized = normalizeCriticalSlotText(unitType);
  return (
    normalized === 'battlemech' ||
    normalized === 'omnimech' ||
    normalized === 'industrialmech'
  );
}

function isPartialWingSignal(id: string): boolean {
  const normalized = normalizeEquipmentId(id);
  return (
    normalized === 'partialwing' ||
    normalized === 'ispartialwing' ||
    normalized === 'clpartialwing'
  );
}

export function hydratePartialWingJumpBonusFromFullUnit(
  fullUnit: IFullUnit,
): number | undefined {
  if (!isBattleMechPartialWingHost(fullUnit)) return undefined;

  const hasPartialWing =
    movementEnhancementsContainSignal(fullUnit, isPartialWingSignal) ||
    equipmentSignalsFromFullUnit(fullUnit).some((signal) =>
      isPartialWingSignal(signal.id),
    );
  if (!hasPartialWing) return undefined;

  const tonnage = fullUnit.tonnage;
  if (typeof tonnage !== 'number' || !Number.isFinite(tonnage)) {
    return undefined;
  }

  return tonnage <= 55 ? 2 : 1;
}

export function hydrateHasStealthArmorFromFullUnit(
  fullUnit: IFullUnit,
): boolean {
  const armorType = (fullUnit as { armor?: { type?: unknown } }).armor?.type;
  if (
    typeof armorType === 'string' &&
    normalizeCriticalSlotText(armorType) === 'stealth'
  ) {
    return true;
  }

  return equipmentSignalsFromFullUnit(fullUnit).some((signal) => {
    const normalized = normalizeCriticalSlotText(signal.id);
    return (
      normalized === 'stealtharmor' ||
      normalized === 'isstealth' ||
      normalized.endsWith('stealtharmor')
    );
  });
}

function hasTalonCriticalSlot(slots: readonly string[]): boolean {
  return slots.some((slot) =>
    normalizeCriticalSlotText(slot).includes('talons'),
  );
}

function hasClawCriticalSlot(slots: readonly string[]): boolean {
  return slots.some((slot) => {
    const normalized = normalizeCriticalSlotText(slot);
    return normalized === 'isclaw' || normalized === 'claw';
  });
}

export function hydrateTalonStateFromFullUnit(
  fullUnit: IFullUnit,
): IHydratedTalonState {
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  return {
    leftLegHasTalons: hasTalonCriticalSlot(
      locationSlotTexts(criticalSlots, 'LEFT_LEG'),
    ),
    rightLegHasTalons: hasTalonCriticalSlot(
      locationSlotTexts(criticalSlots, 'RIGHT_LEG'),
    ),
    leftArmHasTalons: hasTalonCriticalSlot(
      locationSlotTexts(criticalSlots, 'LEFT_ARM'),
    ),
    rightArmHasTalons: hasTalonCriticalSlot(
      locationSlotTexts(criticalSlots, 'RIGHT_ARM'),
    ),
  };
}

export function hydrateClawStateFromFullUnit(
  fullUnit: IFullUnit,
): IHydratedClawState {
  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  return {
    leftArmHasClaw: hasClawCriticalSlot(
      locationSlotTexts(criticalSlots, 'LEFT_ARM'),
    ),
    rightArmHasClaw: hasClawCriticalSlot(
      locationSlotTexts(criticalSlots, 'RIGHT_ARM'),
    ),
  };
}

export function hydrateUnitQuirksFromFullUnit(
  fullUnit: IFullUnit,
): readonly string[] {
  const quirks = (fullUnit as { quirks?: readonly unknown[] }).quirks;
  return (
    quirks?.filter((quirk): quirk is string => typeof quirk === 'string') ?? []
  );
}
