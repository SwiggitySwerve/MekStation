import type {
  IMovementStandUpCapability,
  IMovementWaterCapability,
  MovementHeatProfile,
  MovementMotiveMode,
  MovementPavementRoadBonusProfile,
  MovementStandUpArmActuator,
  MovementStandUpLegProfile,
  MovementTerrainProfile,
} from '@/types/gameplay/HexGridInterfaces';

import { UNIT_QUIRK_IDS } from '@/utils/gameplay/quirkModifiers';

import {
  booleanField,
  normalizedKey,
  recordField,
  stringArrayField,
  stringField,
} from './CompendiumAdapter.fields';
import {
  isMekUnitType,
  isQuadMekStandUpUnitType,
  normalizedUnitTypeKeys,
} from './CompendiumAdapter.unitIdentity';

const NO_MOVEMENT_HEAT_UNIT_TYPES = new Set([
  'infantry',
  'battlearmor',
  'protomech',
  'vehicle',
  'combatvehicle',
  'tank',
  'supportvehicle',
  'supporttank',
  'supportvtol',
  'vtol',
  'aero',
  'aerospace',
  'conventionalfighter',
  'convfighter',
  'smallcraft',
  'dropship',
  'jumpship',
  'warship',
  'spacestation',
]);

const INFANTRY_MOTION_WITH_OWN_TERRAIN_RULES = new Set([
  'tracked',
  'mechanizedtracked',
  'inftracked',
  'wheeled',
  'mechanizedwheeled',
  'infwheeled',
  'hover',
  'mechanizedhover',
  'infhover',
  'vtol',
  'mechanizedvtol',
  'infvtol',
  'submarine',
]);

const TACOPS_INFANTRY_ROAD_BONUS_MOTIONS = new Set([
  'motorized',
  'infmotorized',
  'tracked',
  'mechanizedtracked',
  'inftracked',
  'wheeled',
  'mechanizedwheeled',
  'infwheeled',
  'hover',
  'mechanizedhover',
  'infhover',
]);

const TAC_OPS_ATTEMPTING_STAND_FIELDS = [
  'tacOpsAttemptingStand',
  'tacops_attempting_stand',
  'advancedGroundMovementTacOpsAttemptingStand',
] as const;

const MOVEMENT_MODE_BY_KEY: Readonly<Record<string, MovementMotiveMode>> = {
  biped: 'walk',
  tripod: 'walk',
  quad: 'walk',
  foot: 'walk',
  ground: 'walk',
  leg: 'walk',
  infleg: 'walk',
  infantryleg: 'walk',
  jump: 'walk',
  infjump: 'walk',
  infantryjump: 'walk',
  tracked: 'tracked',
  mechanizedtracked: 'tracked',
  inftracked: 'tracked',
  wheeled: 'wheeled',
  motorized: 'wheeled',
  infmotorized: 'wheeled',
  mechanizedwheeled: 'wheeled',
  infwheeled: 'wheeled',
  hover: 'hover',
  mechanizedhover: 'hover',
  infhover: 'hover',
  vtol: 'vtol',
  mechanizedvtol: 'vtol',
  infvtol: 'vtol',
  naval: 'naval',
  hydrofoil: 'hydrofoil',
  submarine: 'submarine',
  umu: 'umu',
  infumu: 'umu',
  infantryumu: 'umu',
  scuba: 'umu',
  infscuba: 'umu',
  infantryscuba: 'umu',
  bipedswim: 'biped_swim',
  bipedumu: 'biped_swim',
  quadswim: 'quad_swim',
  quadumu: 'quad_swim',
  wige: 'wige',
  wingingroundeffect: 'wige',
  rail: 'rail',
  maglev: 'maglev',
};

export function movementHeatProfileFromUnitData(
  unitData: Record<string, unknown>,
): MovementHeatProfile | undefined {
  const unitType = normalizedKey(unitData.unitType);
  if (isMekUnitType(unitType)) {
    return 'mek';
  }
  if (NO_MOVEMENT_HEAT_UNIT_TYPES.has(unitType)) {
    return 'none';
  }
  return undefined;
}

export function movementTerrainProfileFromUnitData(
  unitData: Record<string, unknown>,
): MovementTerrainProfile | undefined {
  const unitType = normalizedKey(unitData.unitType);
  if (unitType !== 'infantry' && unitType !== 'battlearmor') {
    return undefined;
  }

  const movement = recordField(unitData.movement);
  const raw =
    stringField(unitData, 'motionType', 'motiveType', 'movementType') ??
    stringField(movement, 'motionType', 'motiveType', 'movementType');
  return INFANTRY_MOTION_WITH_OWN_TERRAIN_RULES.has(normalizedKey(raw))
    ? undefined
    : 'infantry';
}

export function pavementRoadBonusProfileFromUnitData(
  unitData: Record<string, unknown>,
): MovementPavementRoadBonusProfile | undefined {
  if (normalizedKey(unitData.unitType) !== 'infantry') {
    return undefined;
  }

  const movement = recordField(unitData.movement);
  const raw =
    stringField(unitData, 'motionType', 'motiveType', 'movementType') ??
    stringField(movement, 'motionType', 'motiveType', 'movementType');
  return TACOPS_INFANTRY_ROAD_BONUS_MOTIONS.has(normalizedKey(raw))
    ? 'tacops_infantry'
    : undefined;
}

export function waterCapabilityFromUnitData(
  unitData: Record<string, unknown>,
): IMovementWaterCapability | undefined {
  const frogmanSpecialist = booleanField(
    unitData,
    'frogman',
    'hasFrogman',
    'isFrogman',
    'frogmanSpecialist',
  );
  const waterCapability: IMovementWaterCapability = {
    fullyAmphibious: booleanField(
      unitData,
      'isAmphibious',
      'amphibious',
      'fullyAmphibious',
      'isFullyAmphibious',
    ),
    limitedAmphibious: booleanField(
      unitData,
      'limitedAmphibious',
      'isLimitedAmphibious',
    ),
    flotationHull: booleanField(unitData, 'hasFlotationHull', 'flotationHull'),
    ...(frogmanSpecialist ? { frogmanSpecialist } : {}),
  };
  return waterCapability.fullyAmphibious ||
    waterCapability.limitedAmphibious ||
    waterCapability.flotationHull ||
    waterCapability.frogmanSpecialist
    ? waterCapability
    : undefined;
}

export function standUpCapabilityFromUnitData(
  unitData: Record<string, unknown>,
): IMovementStandUpCapability | undefined {
  const movement = recordField(unitData.movement);
  const source =
    recordField(unitData.standUpCapability) ??
    recordField(movement?.standUpCapability);
  const armActuators =
    standUpArmActuatorsFromSource(source) ??
    standUpArmActuatorsFromSource(movement) ??
    standUpArmActuatorsFromSource(unitData);
  const noMinimalArmsQuirk = stringArrayField(unitData, 'quirks').some(
    (quirk) => normalizedKey(quirk) === normalizedKey(UNIT_QUIRK_IDS.NO_ARMS),
  );
  const tacOpsAttemptingStand =
    booleanField(unitData, ...TAC_OPS_ATTEMPTING_STAND_FIELDS) ||
    booleanField(movement, ...TAC_OPS_ATTEMPTING_STAND_FIELDS) ||
    booleanField(source, ...TAC_OPS_ATTEMPTING_STAND_FIELDS);
  const explicitStandUpLegProfile =
    standUpLegProfileFromSource(source) ??
    standUpLegProfileFromSource(movement) ??
    standUpLegProfileFromSource(unitData);
  const unitTypeKeys = normalizedUnitTypeKeys(unitData);
  const standUpLegProfile =
    explicitStandUpLegProfile ??
    (unitTypeKeys.some(isQuadMekStandUpUnitType) ? 'quad' : undefined);

  const standUpCapability: IMovementStandUpCapability = {
    ...(standUpLegProfile ? { standUpLegProfile } : {}),
    ...(noMinimalArmsQuirk ? { noMinimalArmsQuirk } : {}),
    ...(tacOpsAttemptingStand ? { tacOpsAttemptingStand } : {}),
    ...(armActuators ? { armActuators } : {}),
  };

  return standUpCapability.standUpLegProfile ||
    standUpCapability.noMinimalArmsQuirk ||
    standUpCapability.tacOpsAttemptingStand ||
    standUpCapability.armActuators !== undefined
    ? standUpCapability
    : undefined;
}

function standUpLegProfileFromSource(
  source: Record<string, unknown> | undefined,
): MovementStandUpLegProfile | undefined {
  const normalized =
    normalizedKey(source?.standUpLegProfile) ||
    normalizedKey(source?.legProfile) ||
    normalizedKey(source?.megamekStandUpLegProfile);
  switch (normalized) {
    case 'biped':
    case 'bipedmek':
    case 'bipedmech':
      return 'biped';
    case 'quad':
    case 'quadmek':
    case 'quadmech':
      return 'quad';
    default:
      return undefined;
  }
}

function standUpArmActuatorsFromSource(
  source: Record<string, unknown> | undefined,
): IMovementStandUpCapability['armActuators'] | undefined {
  const armActuators = recordField(source?.armActuators);
  const left =
    standUpArmActuatorField(armActuators, 'left') ??
    standUpArmActuatorField(source, 'leftArmActuator', 'left_arm_actuator');
  const right =
    standUpArmActuatorField(armActuators, 'right') ??
    standUpArmActuatorField(source, 'rightArmActuator', 'right_arm_actuator');

  return left || right
    ? {
        ...(left ? { left } : {}),
        ...(right ? { right } : {}),
      }
    : undefined;
}

function standUpArmActuatorField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): MovementStandUpArmActuator | undefined {
  switch (normalizedKey(stringField(source, ...fieldNames))) {
    case 'hand':
      return 'hand';
    case 'lower':
    case 'lowerarm':
      return 'lower_arm';
    case 'upper':
    case 'upperarm':
      return 'upper_arm';
    case 'shoulder':
      return 'shoulder';
    default:
      return undefined;
  }
}

export function movementModeFromUnitData(
  unitData: Record<string, unknown>,
): MovementMotiveMode | undefined {
  const movement = recordField(unitData.movement);
  const raw =
    stringField(unitData, 'motionType', 'motiveType', 'movementType') ??
    stringField(movement, 'motionType', 'motiveType', 'movementType');
  if (typeof raw !== 'string') return undefined;
  return MOVEMENT_MODE_BY_KEY[normalizedKey(raw)];
}
