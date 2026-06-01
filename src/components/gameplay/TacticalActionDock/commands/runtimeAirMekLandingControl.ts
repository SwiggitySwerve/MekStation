import type {
  ITacticalCommandContext,
  IRuntimeMovementStateChangedPayload,
} from '@/types/gameplay';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { isHeavyDutyGyro } from '@/utils/gameplay/gyroRules';

import { normalizedCommandConversionMode } from './runtimeConversionRules';

const LAM_AIRMEK_LANDING_CONTROL_REASON = 'landing with gyro or leg damage';
const LAM_AIRMEK_LANDING_CONTROL_NOT_REQUIRED_REASON =
  'Check not required for landing';
const TAC_OPS_LEG_DAMAGE_OPTION_KEY = 'tacopslegdamage';
const TAC_OPS_LEG_DAMAGE_VERBOSE_OPTION_KEY =
  'advancedgroundmovementtacopslegdamage';
const LEG_LOCATIONS = ['left_leg', 'right_leg'] as const;
const LEG_ACTUATORS = [
  ActuatorType.UPPER_LEG,
  ActuatorType.LOWER_LEG,
  ActuatorType.FOOT,
] as const;

type LegLocation = (typeof LEG_LOCATIONS)[number];
type LamAirMekLandingControlPatch = Pick<
  IRuntimeMovementStateChangedPayload,
  | 'lamAirMekLandingControlRequired'
  | 'lamAirMekLandingControlReason'
  | 'lamAirMekLandingControlModifier'
  | 'lamAirMekLandingControlModifierDetails'
  | 'lamAirMekLandingControlFallHeight'
>;

const LEG_LOCATION_LABELS: Record<LegLocation, string> = {
  left_leg: 'Left Leg',
  right_leg: 'Right Leg',
};

const LEG_ACTUATOR_LABELS: Partial<Record<ActuatorType, string>> = {
  [ActuatorType.HIP]: 'Hip Actuator',
  [ActuatorType.UPPER_LEG]: 'Upper Leg Actuator',
  [ActuatorType.LOWER_LEG]: 'Lower Leg Actuator',
  [ActuatorType.FOOT]: 'Foot Actuator',
};

export function lamAirMekLandingControlPatch(
  ctx: ITacticalCommandContext,
  currentAltitude: number,
  nextAltitude: number,
): Partial<LamAirMekLandingControlPatch> {
  if (
    !isLamAirMekWigeAltitudeControl(ctx) ||
    currentAltitude <= 0 ||
    nextAltitude !== 0
  ) {
    return {};
  }

  const details: string[] = [];
  const gyroHits = ctx.activeUnitComponentDamage?.gyroHits ?? 0;
  const effectiveGyroHits = Math.max(
    0,
    gyroHits - (isHeavyDutyGyro(ctx.activeUnitGyroType) ? 1 : 0),
  );
  let required = effectiveGyroHits > 0;
  if (required) {
    details.push('Gyro damage requires landing control roll');
  }

  let modifier = 0;
  const legDamage = lamAirMekLandingLegDamage(ctx);
  required ||= legDamage.required;
  modifier += legDamage.modifier;
  details.push(...legDamage.details);

  return {
    lamAirMekLandingControlRequired: required,
    lamAirMekLandingControlReason: required
      ? LAM_AIRMEK_LANDING_CONTROL_REASON
      : LAM_AIRMEK_LANDING_CONTROL_NOT_REQUIRED_REASON,
    lamAirMekLandingControlModifier: modifier,
    lamAirMekLandingControlModifierDetails: details,
    lamAirMekLandingControlFallHeight: currentAltitude,
  };
}

function isLamAirMekWigeAltitudeControl(ctx: ITacticalCommandContext): boolean {
  const profile = ctx.movementCapability?.unitHeightProfile;
  return (
    profile?.kind === 'lam' &&
    normalizedCommandConversionMode(ctx.activeUnitConversionMode, profile) ===
      'airmek' &&
    ctx.movementCapability?.movementMode === 'wige'
  );
}

function lamAirMekLandingLegDamage(ctx: ITacticalCommandContext): {
  readonly required: boolean;
  readonly modifier: number;
  readonly details: readonly string[];
} {
  let required = false;
  let modifier = 0;
  const details: string[] = [];
  const tacOpsLegDamage = hasTacOpsLegDamageOption(ctx.optionalRules);
  const locationDamage = ctx.activeUnitComponentDamage?.actuatorsByLocation;

  for (const location of LEG_LOCATIONS) {
    if (isDestroyedLandingLeg(ctx, location)) {
      required = true;
      modifier += 5;
      details.push(`${LEG_LOCATION_LABELS[location]} destroyed +5`);
      continue;
    }

    const actuators = locationDamage?.[location];
    if (!actuators) continue;

    if (actuators[ActuatorType.HIP]) {
      if (tacOpsLegDamage) {
        required = true;
        modifier += 2;
        details.push(landingActuatorDetail(location, ActuatorType.HIP, 2));
      } else {
        continue;
      }
    }

    for (const actuator of LEG_ACTUATORS) {
      if (!actuators[actuator]) continue;
      required = true;
      modifier += 1;
      details.push(landingActuatorDetail(location, actuator, 1));
    }
  }

  if (locationDamage || !ctx.activeUnitComponentDamage) {
    return { required, modifier, details };
  }

  const globalActuators = ctx.activeUnitComponentDamage.actuators;
  if (globalActuators[ActuatorType.HIP] && tacOpsLegDamage) {
    required = true;
    modifier += 2;
    details.push(globalLandingActuatorDetail(ActuatorType.HIP, 2));
  }
  for (const actuator of LEG_ACTUATORS) {
    if (!globalActuators[actuator]) continue;
    required = true;
    modifier += 1;
    details.push(globalLandingActuatorDetail(actuator, 1));
  }

  return { required, modifier, details };
}

function landingActuatorDetail(
  location: LegLocation,
  actuator: ActuatorType,
  modifier: number,
): string {
  return `${LEG_LOCATION_LABELS[location]} ${
    LEG_ACTUATOR_LABELS[actuator] ?? actuator
  } destroyed +${modifier}`;
}

function globalLandingActuatorDetail(
  actuator: ActuatorType,
  modifier: number,
): string {
  return `${LEG_ACTUATOR_LABELS[actuator] ?? actuator} destroyed +${modifier}`;
}

function isDestroyedLandingLeg(
  ctx: ITacticalCommandContext,
  location: LegLocation,
): boolean {
  const destroyedLocations = ctx.activeUnitDestroyedLocations ?? [];
  const aliases =
    location === 'left_leg' ? ['leftleg', 'll'] : ['rightleg', 'rl'];
  return destroyedLocations.some((destroyedLocation) =>
    aliases.includes(normalizedLandingRuleKey(destroyedLocation)),
  );
}

function hasTacOpsLegDamageOption(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (optionalRules ?? []).some((rule) => {
    const normalized = normalizedLandingRuleKey(rule);
    return (
      normalized === TAC_OPS_LEG_DAMAGE_OPTION_KEY ||
      normalized === TAC_OPS_LEG_DAMAGE_VERBOSE_OPTION_KEY
    );
  });
}

function normalizedLandingRuleKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
