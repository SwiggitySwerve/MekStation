import type {
  ArmorPipState,
  BipedPipLocation,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  ILocationDestroyedPayload,
  IUnitDestroyedPayload,
  QuadPipLocation,
} from '@/types/gameplay';

import { GameEventType } from '@/types/gameplay';

export const DAMAGE_EFFECT_SMOKE_SYMBOL_ID = 'damage-effect-smoke-symbol';
export const DAMAGE_EFFECT_FIRE_SYMBOL_ID = 'damage-effect-fire-symbol';

export const EFFECT_LOCATION_ORDER = [
  'head',
  'leftArm',
  'rightArm',
  'leftTorso',
  'rightTorso',
  'centerTorso',
  'leftLeg',
  'rightLeg',
  'frontLeftLeg',
  'frontRightLeg',
  'rearLeftLeg',
  'rearRightLeg',
] as const;

export type EffectLocation = (typeof EFFECT_LOCATION_ORDER)[number];
export type SmokeLocation = EffectLocation | 'wreck';

export interface EffectPoint {
  readonly x: number;
  readonly y: number;
}

type TypedGameEvent<TType extends GameEventType, TPayload> = IGameEvent & {
  readonly type: TType;
  readonly payload: TPayload;
};

export type DamageAppliedEvent = TypedGameEvent<
  GameEventType.DamageApplied,
  IDamageAppliedPayload
>;

export type LocationDestroyedEvent = TypedGameEvent<
  GameEventType.LocationDestroyed,
  ILocationDestroyedPayload
>;

export type CriticalHitResolvedEvent = TypedGameEvent<
  GameEventType.CriticalHitResolved,
  ICriticalHitResolvedPayload
>;

export type UnitDestroyedEvent = TypedGameEvent<
  GameEventType.UnitDestroyed,
  IUnitDestroyedPayload
>;

const LOCATION_ALIASES: Readonly<Record<string, EffectLocation>> = {
  h: 'head',
  hd: 'head',
  head: 'head',

  c: 'centerTorso',
  ct: 'centerTorso',
  ctr: 'centerTorso',
  center: 'centerTorso',
  centre: 'centerTorso',
  centertorso: 'centerTorso',
  centretorso: 'centerTorso',
  centertorsorear: 'centerTorso',
  centretorsorear: 'centerTorso',

  ltorso: 'leftTorso',
  lt: 'leftTorso',
  ltr: 'leftTorso',
  lefttorso: 'leftTorso',
  lefttorsorear: 'leftTorso',

  rtorso: 'rightTorso',
  rt: 'rightTorso',
  rtr: 'rightTorso',
  righttorso: 'rightTorso',
  righttorsorear: 'rightTorso',

  la: 'leftArm',
  larm: 'leftArm',
  leftarm: 'leftArm',

  ra: 'rightArm',
  rarm: 'rightArm',
  rightarm: 'rightArm',

  ll: 'leftLeg',
  lleg: 'leftLeg',
  leftleg: 'leftLeg',

  rl: 'rightLeg',
  rleg: 'rightLeg',
  rightleg: 'rightLeg',

  fll: 'frontLeftLeg',
  frontleftleg: 'frontLeftLeg',
  flleg: 'frontLeftLeg',

  frl: 'frontRightLeg',
  frontrightleg: 'frontRightLeg',
  frleg: 'frontRightLeg',

  rll: 'rearLeftLeg',
  rearleftleg: 'rearLeftLeg',
  rlleg: 'rearLeftLeg',

  rrl: 'rearRightLeg',
  rearrightleg: 'rearRightLeg',
  rrleg: 'rearRightLeg',
};

const LOCATION_LABELS: Readonly<Record<SmokeLocation, string>> = {
  head: 'Head',
  centerTorso: 'Center Torso',
  leftTorso: 'Left Torso',
  rightTorso: 'Right Torso',
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  leftLeg: 'Left Leg',
  rightLeg: 'Right Leg',
  frontLeftLeg: 'Front Left Leg',
  frontRightLeg: 'Front Right Leg',
  rearLeftLeg: 'Rear Left Leg',
  rearRightLeg: 'Rear Right Leg',
  wreck: 'Wreck',
};

const LOCATION_ANCHORS: Readonly<Record<SmokeLocation, EffectPoint>> = {
  head: { x: 0, y: -48 },
  leftArm: { x: -44, y: -24 },
  rightArm: { x: 44, y: -24 },
  leftTorso: { x: -34, y: -4 },
  rightTorso: { x: 34, y: -4 },
  centerTorso: { x: 0, y: 16 },
  leftLeg: { x: -24, y: 34 },
  rightLeg: { x: 24, y: 34 },
  frontLeftLeg: { x: -34, y: -18 },
  frontRightLeg: { x: 34, y: -18 },
  rearLeftLeg: { x: -30, y: 28 },
  rearRightLeg: { x: 30, y: 28 },
  wreck: { x: 0, y: -10 },
};

const LOCATION_ORDER_INDEX: Readonly<Record<EffectLocation, number>> =
  EFFECT_LOCATION_ORDER.reduce(
    (acc, location, index) => ({ ...acc, [location]: index }),
    {} as Record<EffectLocation, number>,
  );

const BIPED_LOCATION_MAP: Readonly<Record<BipedPipLocation, EffectLocation>> = {
  head: 'head',
  centerTorso: 'centerTorso',
  leftTorso: 'leftTorso',
  rightTorso: 'rightTorso',
  leftArm: 'leftArm',
  rightArm: 'rightArm',
  leftLeg: 'leftLeg',
  rightLeg: 'rightLeg',
};

const QUAD_LOCATION_MAP: Readonly<Record<QuadPipLocation, EffectLocation>> = {
  head: 'head',
  centerTorso: 'centerTorso',
  frontLeftLeg: 'frontLeftLeg',
  frontRightLeg: 'frontRightLeg',
  rearLeftLeg: 'rearLeftLeg',
  rearRightLeg: 'rearRightLeg',
};

export function isDamageAppliedEvent(
  event: IGameEvent,
): event is DamageAppliedEvent {
  return event.type === GameEventType.DamageApplied;
}

export function isLocationDestroyedEvent(
  event: IGameEvent,
): event is LocationDestroyedEvent {
  return event.type === GameEventType.LocationDestroyed;
}

export function isCriticalHitResolvedEvent(
  event: IGameEvent,
): event is CriticalHitResolvedEvent {
  return event.type === GameEventType.CriticalHitResolved;
}

export function isUnitDestroyedEvent(
  event: IGameEvent,
): event is UnitDestroyedEvent {
  return event.type === GameEventType.UnitDestroyed;
}

export function isEngineCriticalEvent(
  event: IGameEvent,
): event is CriticalHitResolvedEvent {
  if (!isCriticalHitResolvedEvent(event)) return false;

  const componentType = event.payload.componentType.trim().toLowerCase();
  const componentName = event.payload.componentName.trim().toLowerCase();

  return componentType.includes('engine') || componentName.includes('engine');
}

export function normalizeDamageLocation(
  location: string | undefined,
): EffectLocation {
  const key = toLocationKey(location);
  return LOCATION_ALIASES[key] ?? 'centerTorso';
}

export function effectAnchorForLocation(location: SmokeLocation): EffectPoint {
  return LOCATION_ANCHORS[location];
}

export function effectLocationLabel(location: SmokeLocation): string {
  return LOCATION_LABELS[location];
}

export function compareEffectLocations(
  left: EffectLocation,
  right: EffectLocation,
): number {
  return LOCATION_ORDER_INDEX[left] - LOCATION_ORDER_INDEX[right];
}

export function damageFlashLocations(
  payload: IDamageAppliedPayload,
): readonly EffectLocation[] {
  const sourceLocation =
    readStringField(payload, 'fromLocation') ??
    readStringField(payload, 'sourceLocation') ??
    readStringField(payload, 'transferredFromLocation') ??
    readStringField(payload, 'originalLocation');
  const targetLocation =
    readStringField(payload, 'toLocation') ??
    readStringField(payload, 'transferredToLocation') ??
    payload.location;

  const locations: EffectLocation[] = [];
  if (sourceLocation) {
    locations.push(normalizeDamageLocation(sourceLocation));
  }
  locations.push(normalizeDamageLocation(targetLocation));

  return uniqueEffectLocations(locations);
}

export function destroyedLocationsFromEvent(
  payload: ILocationDestroyedPayload,
): readonly EffectLocation[] {
  const locations = [normalizeDamageLocation(payload.location)];
  if (payload.cascadedTo) {
    locations.push(normalizeDamageLocation(payload.cascadedTo));
  }
  return uniqueEffectLocations(locations);
}

export function destroyedLocationsFromArmorState(
  state: ArmorPipState | undefined,
): readonly EffectLocation[] {
  if (!state) return [];

  const destroyed: EffectLocation[] = [];
  if (state.archetype === 'quad') {
    const entries = Object.entries(state.locations) as readonly [
      QuadPipLocation,
      string,
    ][];
    for (const [location, value] of entries) {
      if (value === 'destroyed') destroyed.push(QUAD_LOCATION_MAP[location]);
    }
    return uniqueEffectLocations(destroyed);
  }

  const entries = Object.entries(state.locations) as readonly [
    BipedPipLocation,
    string,
  ][];
  for (const [location, value] of entries) {
    if (value === 'destroyed') destroyed.push(BIPED_LOCATION_MAP[location]);
  }
  return uniqueEffectLocations(destroyed);
}

export function uniqueEffectLocations(
  locations: readonly EffectLocation[],
): readonly EffectLocation[] {
  return Array.from(new Set(locations)).sort(compareEffectLocations);
}

export function toDomToken(value: string): string {
  const token = value.trim().replace(/[^A-Za-z0-9_-]+/g, '-');
  return token.length > 0 ? token : 'effect';
}

function toLocationKey(location: string | undefined): string {
  return (location ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function readStringField<TField extends string>(
  payload: IDamageAppliedPayload,
  field: TField,
): string | undefined {
  const value = (
    payload as IDamageAppliedPayload & Partial<Record<TField, unknown>>
  )[field];
  return typeof value === 'string' ? value : undefined;
}
