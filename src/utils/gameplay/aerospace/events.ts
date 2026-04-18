/**
 * Aerospace Combat Events
 *
 * Discriminated-union event types emitted by the aerospace combat pipeline.
 * The combat engine is expected to collect these from resolver return values
 * and fan them out onto whatever event bus / replay log is in use.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/movement-system/spec.md
 */

import { AerospaceArc } from '../../../types/unit/AerospaceInterfaces';

// ============================================================================
// Event tag enum
// ============================================================================

export enum AerospaceEventType {
  /** SI value changed (usually decreased). */
  SI_REDUCED = 'SIReduced',
  /** Control roll resolved (pass or fail). */
  CONTROL_ROLL = 'ControlRoll',
  /** An aerospace unit flew off the board edge. */
  AEROSPACE_EXITED = 'AerospaceExited',
  /** An aerospace unit re-entered the board. */
  AEROSPACE_ENTERED = 'AerospaceEntered',
  /** A fly-over / strafe attack was declared + resolved. */
  AEROSPACE_FLY_OVER = 'AerospaceFlyOver',
  /** Fuel has been reduced to 0. */
  FUEL_DEPLETED = 'FuelDepleted',
  /** A component / system was destroyed by an aerospace crit. */
  COMPONENT_DESTROYED = 'ComponentDestroyed',
  /** The unit was destroyed. */
  UNIT_DESTROYED = 'UnitDestroyed',
}

// ============================================================================
// Event payloads
// ============================================================================

export interface IHexLikeCoord {
  readonly q: number;
  readonly r: number;
}

export interface ISIReducedEvent {
  readonly type: AerospaceEventType.SI_REDUCED;
  readonly unitId: string;
  readonly previousSI: number;
  readonly newSI: number;
  readonly damageApplied: number;
}

export interface IControlRollEvent {
  readonly type: AerospaceEventType.CONTROL_ROLL;
  readonly unitId: string;
  readonly targetNumber: number;
  readonly rollTotal: number;
  readonly dice: readonly [number, number];
  readonly passed: boolean;
  readonly modifier: number;
}

export interface IAerospaceExitedEvent {
  readonly type: AerospaceEventType.AEROSPACE_EXITED;
  readonly unitId: string;
  readonly exitCoord: IHexLikeCoord;
  readonly returnTurn: number;
}

export interface IAerospaceEnteredEvent {
  readonly type: AerospaceEventType.AEROSPACE_ENTERED;
  readonly unitId: string;
  readonly entryCoord: IHexLikeCoord;
}

export interface IAerospaceFlyOverEvent {
  readonly type: AerospaceEventType.AEROSPACE_FLY_OVER;
  readonly unitId: string;
  readonly strafedHexes: readonly IHexLikeCoord[];
  readonly damageByHex: readonly { hex: IHexLikeCoord; damage: number }[];
  readonly bombsDropped: readonly IHexLikeCoord[];
}

export interface IFuelDepletedEvent {
  readonly type: AerospaceEventType.FUEL_DEPLETED;
  readonly unitId: string;
}

export interface IComponentDestroyedEvent {
  readonly type: AerospaceEventType.COMPONENT_DESTROYED;
  readonly unitId: string;
  readonly component:
    | 'crewStunned'
    | 'cargo'
    | 'fuel'
    | 'avionics'
    | 'engine'
    | 'controlSurfaces'
    | 'catastrophic';
  readonly arc?: AerospaceArc;
}

export interface IUnitDestroyedEvent {
  readonly type: AerospaceEventType.UNIT_DESTROYED;
  readonly unitId: string;
  readonly cause:
    | 'si_zero'
    | 'catastrophic_crit'
    | 'fuel_off_board'
    | 'off_map_timeout';
}

/** Union of all aerospace combat events. */
export type AerospaceEvent =
  | ISIReducedEvent
  | IControlRollEvent
  | IAerospaceExitedEvent
  | IAerospaceEnteredEvent
  | IAerospaceFlyOverEvent
  | IFuelDepletedEvent
  | IComponentDestroyedEvent
  | IUnitDestroyedEvent;
