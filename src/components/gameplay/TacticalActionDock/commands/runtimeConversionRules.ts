import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  type CombatLocation,
  type IComponentDamageState,
  type ITacticalCommandContext,
  type MovementConversionMode,
  type MovementUnitHeightProfile,
} from '@/types/gameplay';
import { isHeavyDutyGyro } from '@/utils/gameplay/gyroRules';
import { parseWaterDepth } from '@/utils/gameplay/waterDepth';

const ARM_LOCATIONS: readonly CombatLocation[] = ['left_arm', 'right_arm'];
const LEG_LOCATIONS: readonly CombatLocation[] = ['left_leg', 'right_leg'];
const QUADVEE_CONVERSION_DAMAGE_LOCATIONS = [
  'right_arm',
  'right_leg',
  'left_arm',
  'left_leg',
] as const satisfies readonly CombatLocation[];
const QUADVEE_CONVERSION_ACTUATORS = [
  ActuatorType.SHOULDER,
  ActuatorType.UPPER_ARM,
  ActuatorType.LOWER_ARM,
  ActuatorType.HAND,
  ActuatorType.HIP,
  ActuatorType.UPPER_LEG,
  ActuatorType.LOWER_LEG,
  ActuatorType.FOOT,
] as const;

export interface IRuntimeConversionCommandMetadata {
  readonly conversionStepCount: number;
  readonly conversionMpCost: number;
}

export function runtimeConversionActionUnavailableReason(
  ctx: ITacticalCommandContext,
  conversionMode: MovementConversionMode,
): string | null {
  const profile = ctx.movementCapability?.unitHeightProfile;
  if (!profile || (profile.kind !== 'lam' && profile.kind !== 'quadvee')) {
    return 'Unit has no conversion movement profile.';
  }

  const currentMode = normalizedCommandConversionMode(
    ctx.activeUnitConversionMode,
    profile,
  );
  const targetMode = normalizedCommandConversionMode(conversionMode, profile);

  if (currentMode === targetMode) {
    return null;
  }

  if (ctx.activeUnitHasPlannedMovement) {
    return 'Clear the current movement preview before converting.';
  }
  if (ctx.activeUnitProne === true) {
    return 'Unit must stand before converting.';
  }
  if (isUnderwaterConversionContext(ctx)) {
    return 'Unit cannot convert while underwater.';
  }

  if (profile.kind === 'quadvee') {
    const conversionCost = quadVeeConversionCost(ctx.activeUnitComponentDamage);
    const runMP = ctx.movementCapability?.runMP ?? 0;
    if (conversionCost > runMP) {
      return `QuadVee conversion needs ${conversionCost} MP, but only ${runMP} run MP is available.`;
    }
    return null;
  }

  return lamConversionUnavailableReason(ctx, currentMode, targetMode);
}

export function runtimeConversionCommandMetadata(
  ctx: ITacticalCommandContext,
  conversionMode: MovementConversionMode,
): IRuntimeConversionCommandMetadata {
  const profile = ctx.movementCapability?.unitHeightProfile;
  const currentMode = profile
    ? normalizedCommandConversionMode(ctx.activeUnitConversionMode, profile)
    : undefined;
  const targetMode = profile
    ? normalizedCommandConversionMode(conversionMode, profile)
    : undefined;
  return {
    conversionStepCount: conversionStepCountFor(
      profile,
      currentMode,
      targetMode,
    ),
    conversionMpCost:
      profile?.kind === 'quadvee'
        ? quadVeeConversionCost(ctx.activeUnitComponentDamage)
        : 0,
  };
}

export function runtimeLamAirMekAutomaticLandingPatch(
  ctx: ITacticalCommandContext,
  conversionMode: MovementConversionMode,
): { readonly lamAirMekAltitude: number } | Record<string, never> {
  const profile = ctx.movementCapability?.unitHeightProfile;
  if (profile?.kind !== 'lam') return {};
  const currentMode = normalizedCommandConversionMode(
    ctx.activeUnitConversionMode,
    profile,
  );
  const targetMode = normalizedCommandConversionMode(conversionMode, profile);
  const altitude = normalizeNonNegativeInteger(ctx.activeUnitLamAirMekAltitude);
  return currentMode === 'airmek' && targetMode === 'mek' && altitude > 0
    ? { lamAirMekAltitude: 0 }
    : {};
}

export function normalizedCommandConversionMode(
  value: MovementConversionMode | number | undefined,
  profile: MovementUnitHeightProfile | undefined,
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  if (!profile) return undefined;
  if (value === undefined) return 'mek';

  if (typeof value === 'number') {
    if (value === 0) return 'mek';
    if (profile.kind === 'lam') {
      if (value === 1) return 'airmek';
      if (value === 2) return 'fighter';
    }
    if (profile.kind === 'quadvee' && value === 1) return 'vehicle';
    return undefined;
  }

  switch (value) {
    case 'mek':
    case 'mech':
      return 'mek';
    case 'airmek':
    case 'airmech':
      return 'airmek';
    case 'fighter':
      return 'fighter';
    case 'vehicle':
    case 'tracked':
    case 'wheeled':
      return 'vehicle';
    default:
      return undefined;
  }
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value)
    ? 0
    : Math.max(0, Math.floor(value));
}

function lamConversionUnavailableReason(
  ctx: ITacticalCommandContext,
  currentMode: ReturnType<typeof normalizedCommandConversionMode>,
  targetMode: ReturnType<typeof normalizedCommandConversionMode>,
): string | null {
  if (!currentMode || !targetMode) {
    return 'LAM conversion mode is not represented.';
  }
  const gyroHits = ctx.activeUnitComponentDamage?.gyroHits ?? 0;
  if (gyroHits > (isHeavyDutyGyro(ctx.activeUnitGyroType) ? 1 : 0)) {
    return 'LAM cannot convert with gyro damage.';
  }
  if (
    (currentMode === 'mek' || targetMode === 'mek') &&
    hasAnyActuatorDamage(ctx.activeUnitComponentDamage, ARM_LOCATIONS, [
      ActuatorType.SHOULDER,
      ActuatorType.UPPER_ARM,
      ActuatorType.LOWER_ARM,
    ])
  ) {
    return 'LAM cannot convert to or from Mek mode with shoulder or arm actuator damage.';
  }
  if (
    (currentMode === 'fighter' || targetMode === 'fighter') &&
    hasAnyActuatorDamage(ctx.activeUnitComponentDamage, LEG_LOCATIONS, [
      ActuatorType.HIP,
      ActuatorType.UPPER_LEG,
      ActuatorType.LOWER_LEG,
    ])
  ) {
    return 'LAM cannot convert to or from Fighter mode with hip or leg actuator damage.';
  }
  if (isDirectStandardLamMekFighterConversion(currentMode, targetMode)) {
    return 'Standard LAMs must convert through AirMek mode first.';
  }
  return null;
}

function isUnderwaterConversionContext(ctx: ITacticalCommandContext): boolean {
  return (
    parseWaterDepth(ctx.activeUnitTerrain ?? '') > 0 &&
    (ctx.activeUnitElevation ?? 0) < 0
  );
}

function isDirectStandardLamMekFighterConversion(
  currentMode: string | undefined,
  targetMode: string | undefined,
): boolean {
  return (
    (currentMode === 'mek' && targetMode === 'fighter') ||
    (currentMode === 'fighter' && targetMode === 'mek')
  );
}

function conversionStepCountFor(
  profile: MovementUnitHeightProfile | undefined,
  currentMode: string | undefined,
  targetMode: string | undefined,
): number {
  if (!profile || !currentMode || !targetMode || currentMode === targetMode) {
    return 0;
  }
  return profile.kind === 'lam' &&
    requiresTwoLamConversionSteps(currentMode, targetMode)
    ? 2
    : 1;
}

function requiresTwoLamConversionSteps(
  currentMode: string | undefined,
  targetMode: string | undefined,
): boolean {
  return (
    isDirectStandardLamMekFighterConversion(currentMode, targetMode) ||
    (currentMode === 'airmek' && targetMode === 'mek')
  );
}

function quadVeeConversionCost(
  componentDamage: IComponentDamageState | undefined,
): number {
  const representedDamage = componentDamage?.actuatorsByLocation
    ? countLocationActuatorDamage(
        componentDamage,
        QUADVEE_CONVERSION_DAMAGE_LOCATIONS,
        QUADVEE_CONVERSION_ACTUATORS,
      )
    : countGlobalActuatorDamage(componentDamage, QUADVEE_CONVERSION_ACTUATORS);
  return 2 + representedDamage;
}

function countLocationActuatorDamage(
  componentDamage: IComponentDamageState,
  locations: readonly CombatLocation[],
  actuators: readonly ActuatorType[],
): number {
  let count = 0;
  for (const location of locations) {
    const damage = componentDamage.actuatorsByLocation?.[location];
    if (!damage) continue;
    for (const actuator of actuators) {
      if (damage[actuator]) count++;
    }
  }
  return count;
}

function countGlobalActuatorDamage(
  componentDamage: IComponentDamageState | undefined,
  actuators: readonly ActuatorType[],
): number {
  if (!componentDamage) return 0;
  return actuators.reduce(
    (count, actuator) => count + (componentDamage.actuators[actuator] ? 1 : 0),
    0,
  );
}

function hasAnyActuatorDamage(
  componentDamage: IComponentDamageState | undefined,
  locations: readonly CombatLocation[],
  actuators: readonly ActuatorType[],
): boolean {
  if (!componentDamage) return false;
  if (componentDamage.actuatorsByLocation) {
    return locations.some((location) =>
      actuators.some(
        (actuator) =>
          componentDamage.actuatorsByLocation?.[location]?.[actuator] === true,
      ),
    );
  }
  return actuators.some((actuator) => componentDamage.actuators[actuator]);
}
