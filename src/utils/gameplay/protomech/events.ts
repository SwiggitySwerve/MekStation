/**
 * ProtoMech Combat Events
 *
 * Discriminated-union event types emitted by the proto combat pipeline.
 * The combat engine is expected to collect these from resolver return values
 * and fan them out onto whatever event bus / replay log is in use.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-protomech-combat-behavior/specs/protomech-unit-system/spec.md
 */

import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

// =============================================================================
// Event tag enum
// =============================================================================

export enum ProtoEventType {
  /** A proto location's structure has dropped to 0. */
  PROTO_LOCATION_DESTROYED = 'ProtoLocationDestroyed',
  /** A main gun was removed following MainGun location destruction. */
  PROTO_MAIN_GUN_REMOVED = 'ProtoMainGunRemoved',
  /** Pilot wound or pilot-killed event. */
  PROTO_PILOT_HIT = 'ProtoPilotHit',
  /** A pilot-killed crit (12) fired — proto counts as destroyed. */
  PROTO_PILOT_KILLED = 'ProtoPilotKilled',
  /** A proto-level component / equipment was destroyed by a crit. */
  PROTO_COMPONENT_DESTROYED = 'ProtoComponentDestroyed',
  /** Engine critical — 1 = -1 MP, 2 = destroyed. */
  PROTO_ENGINE_HIT = 'ProtoEngineHit',
  /** Glider took damage that triggered a fall roll. */
  GLIDER_FALL_CHECK = 'GliderFallCheck',
  /** Glider fell from altitude (fall roll failed). */
  GLIDER_FALL = 'GliderFall',
  /** A coordinated 5-proto point declared a point-level attack. */
  PROTO_POINT_ATTACK = 'ProtoPointAttack',
  /** The proto was destroyed. */
  PROTO_UNIT_DESTROYED = 'ProtoUnitDestroyed',
}

// =============================================================================
// Event payloads
// =============================================================================

export interface IProtoLocationDestroyedEvent {
  readonly type: ProtoEventType.PROTO_LOCATION_DESTROYED;
  readonly unitId: string;
  readonly location: ProtoLocation;
}

export interface IProtoMainGunRemovedEvent {
  readonly type: ProtoEventType.PROTO_MAIN_GUN_REMOVED;
  readonly unitId: string;
}

export interface IProtoPilotHitEvent {
  readonly type: ProtoEventType.PROTO_PILOT_HIT;
  readonly unitId: string;
  /** True when this hit also set the wounded flag for the first time. */
  readonly firstWound: boolean;
}

export interface IProtoPilotKilledEvent {
  readonly type: ProtoEventType.PROTO_PILOT_KILLED;
  readonly unitId: string;
}

export interface IProtoComponentDestroyedEvent {
  readonly type: ProtoEventType.PROTO_COMPONENT_DESTROYED;
  readonly unitId: string;
  readonly location: ProtoLocation;
  /** Kind of component destroyed (as known to the crit resolver). */
  readonly component: 'equipment' | 'weapon' | 'heat_sink' | 'ammo';
}

export interface IProtoEngineHitEvent {
  readonly type: ProtoEventType.PROTO_ENGINE_HIT;
  readonly unitId: string;
  readonly engineHits: number;
  readonly engineDestroyed: boolean;
}

export interface IGliderFallCheckEvent {
  readonly type: ProtoEventType.GLIDER_FALL_CHECK;
  readonly unitId: string;
  readonly targetNumber: number;
  readonly rollTotal: number;
  readonly dice: readonly [number, number];
  readonly passed: boolean;
}

export interface IGliderFallEvent {
  readonly type: ProtoEventType.GLIDER_FALL;
  readonly unitId: string;
  readonly altitudeAtFall: number;
  readonly fallDamage: number;
}

export interface IProtoPointAttackEvent {
  readonly type: ProtoEventType.PROTO_POINT_ATTACK;
  readonly pointId: string;
  readonly protoIds: readonly string[];
  readonly totalDamage: number;
  /** Per-member damage distribution after cluster rolling. */
  readonly distribution: ReadonlyArray<{
    readonly protoId: string;
    readonly damage: number;
  }>;
}

export interface IProtoUnitDestroyedEvent {
  readonly type: ProtoEventType.PROTO_UNIT_DESTROYED;
  readonly unitId: string;
  readonly cause:
    | 'head_destroyed'
    | 'torso_destroyed'
    | 'engine_destroyed'
    | 'pilot_killed'
    | 'glider_fall';
}

/** Union of every proto combat event. */
export type ProtoEvent =
  | IProtoLocationDestroyedEvent
  | IProtoMainGunRemovedEvent
  | IProtoPilotHitEvent
  | IProtoPilotKilledEvent
  | IProtoComponentDestroyedEvent
  | IProtoEngineHitEvent
  | IGliderFallCheckEvent
  | IGliderFallEvent
  | IProtoPointAttackEvent
  | IProtoUnitDestroyedEvent;
