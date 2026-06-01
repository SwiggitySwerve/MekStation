/**
 * Game session movement event payloads
 * Extracted from GameSessionInterfaces.ts to keep focused type modules under the lint line cap.
 */

import type { MovementAnimationMode } from './GameSessionCoreTypes';

import {
  Facing,
  IHexCoordinate,
  MovementConversionMode,
  MovementType,
} from './HexGridInterfaces';

export type StandUpMode = 'normal' | 'careful';

/**
 * Movement declared event payload.
 */
export interface IMovementDeclaredPayload {
  /** Unit that moved */
  readonly unitId: string;
  /** Starting position */
  readonly from: IHexCoordinate;
  /** Ending position */
  readonly to: IHexCoordinate;
  /** New facing */
  readonly facing: Facing;
  /** Movement type used */
  readonly movementType: MovementType;
  /**
   * Phase 7 animation mode. Optional so legacy event streams that only
   * serialized `movementType` continue to replay.
   */
  readonly mode?: MovementAnimationMode;
  /**
   * Ordered axial coordinates visited by the committed move, including
   * the origin and destination. Optional for legacy replay backfill.
   */
  readonly path?: readonly IHexCoordinate[];
  /** MP spent */
  readonly mpUsed: number;
  /** Heat generated */
  readonly heatGenerated: number;
  /**
   * True when this declaration represents MP spent trying to stand from
   * prone. The prone flag is then cleared by a following `UnitStood`
   * event only if the stand-up PSR succeeds.
   */
  readonly standUpAttempt?: boolean;
  /**
   * Replay-safe outcome for `standUpAttempt`. `false` preserves prone after a
   * failed stand-up PSR while still recording the MP spent.
   */
  readonly standUpSucceeded?: boolean;
  /** Stand-up variant used for this declaration. */
  readonly standUpMode?: StandUpMode;
  /**
   * True when this declaration spends the GET_UP posture step to leave
   * hull-down before resolving movement. No stand-up PSR is implied.
   */
  readonly hullDownExitAttempt?: boolean;
  /**
   * True when this declaration represents MegaMek's standing `HULL_DOWN`
   * posture transition into hull-down.
   */
  readonly hullDownEntryAttempt?: boolean;
  /**
   * True when this declaration represents MegaMek's legal 0 MP
   * GO_PRONE posture transition from hull-down to prone.
   */
  readonly goProneAttempt?: boolean;
  /** Represented MegaMek CONVERT_MODE step count consumed before path steps. */
  readonly conversionStepCount?: number;
  /** Represented MP spent by CONVERT_MODE steps before path steps. */
  readonly conversionMpCost?: number;
  /** Represented VTOL/WiGE UP/DOWN altitude-control steps before path steps. */
  readonly altitudeControlStepCount?: number;
  /** MP spent by represented VTOL/WiGE altitude-control steps before path steps. */
  readonly altitudeControlMpCost?: number;
  /**
   * Per `enrich-movement-declared-with-chain-and-displacement` (movement-system
   * delta — Movement Decomposition Fields): total hex transitions in the
   * move (`path.length - 1`). Equals the count of forward + backward +
   * lateral + jump steps that result in a hex-position change. Optional
   * for legacy event-stream compat.
   */
  readonly hexesMoved?: number;
  /**
   * Per the same delta: hexes entered without a facing change in the
   * same step (forward + backward + lateral, excluding turns and
   * posture steps). Used by the readable-companion formatter
   * to render `mp=N(s<sh>+t<th>)` with the straight-vs-turning split.
   */
  readonly straightHexes?: number;
  /**
   * Per the same delta: MP spent on facing changes only. Equals
   * `mpUsed - straightHexes - sum(jumpMpCost) - sum(specialStepMpCost)`.
   */
  readonly turningMpCost?: number;
  /**
   * Per the same delta: `hexDistance(from, to)` — straight-line distance
   * from start to end regardless of path. Already used for TMM elsewhere;
   * just denormalized onto the event payload.
   */
  readonly netDisplacement?: number;
  /**
   * Per `enrich-movement-declared-with-chain-and-displacement` (movement-system
   * delta — Movement Phase Step Chain Emission). The chain of micro-moves
   * the unit executed in commit order. Optional for legacy event-stream
   * compat. Discriminated union keyed on `kind`.
   */
  readonly steps?: readonly IMovementStep[];
}

/**
 * Movement-invalid event payload — emitted when a player-facing movement
 * commit is rejected before any position, heat, or lock-state change occurs.
 */
export interface IMovementInvalidPayload {
  readonly unitId: string;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly reason:
    | 'NoMovementCapability'
    | 'DestinationOutOfBounds'
    | 'DestinationOccupied'
    | 'JumpUnavailable'
    | 'NoLegalPath'
    | 'InsufficientMP'
    | 'UnitImmobile'
    | 'UnitAlreadyMoved'
    | 'InvalidPath'
    | 'TerrainBlocked'
    | 'InvalidDestination';
  readonly details?: string;
  readonly mpCost?: number;
  readonly heatGenerated?: number;
}

/**
 * Per `enrich-movement-declared-with-chain-and-displacement` (movement-system
 * delta — Movement Phase Step Chain Emission): a single micro-move
 * within a committed move. The `IMovementStep` union covers the
 * BattleMech ground-combat subset of MegaMek's `MoveStepType`
 * (`E:/Projects/megamek/megamek/src/megamek/common/enums/MoveStepType.java`).
 * Aerospace / infantry / battle-armor step types are out-of-scope
 * follow-ons named in `proposal.md`.
 */
export interface IForwardStep {
  readonly kind: 'forward';
  /** 0-based ordinal within the move's `steps` array. */
  readonly index: number;
  /** Direction of travel — FORWARDS or BACKWARDS in MegaMek terms. */
  readonly direction: 'forward' | 'backward';
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  /** Base MP plus terrain modifier (e.g. +1 entering Light Woods). */
  readonly mpCost: number;
  /**
   * `TerrainType`-as-string for forward-compat with new terrain types
   * appearing in source data without breaking serialized event logs.
   */
  readonly terrainEntered: string;
  /** `toElevation - fromElevation` — positive = climbing, negative = falling. */
  readonly elevationDelta: number;
}

export interface ITurnStep {
  readonly kind: 'turn';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly fromFacing: Facing;
  readonly toFacing: Facing;
  /** 1 MP per facing-step (TURN_LEFT / TURN_RIGHT each cost 1 MP). */
  readonly mpCost: number;
}

export interface ILateralStep {
  readonly kind: 'lateral';
  readonly index: number;
  /**
   * Sideslip direction — covers MegaMek's LATERAL_LEFT / LATERAL_RIGHT
   * and their backward variants used during skid resolution.
   */
  readonly direction: 'left' | 'right' | 'left-backwards' | 'right-backwards';
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly mpCost: number;
  readonly terrainEntered: string;
}

export interface IJumpStep {
  readonly kind: 'jump';
  readonly index: number;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  /** Distance jumped (1 MP per hex of jump distance for ground 'Mechs). */
  readonly mpCost: number;
  readonly terrainEntered: string;
}

export interface IStandUpStep {
  readonly kind: 'standUp';
  readonly index: number;
  readonly at: IHexCoordinate;
  /** Typically 2 MP per Total Warfare Errata stand-up cost. */
  readonly mpCost: number;
  /** AttemptStand fires regardless of stand outcome — always `true`. */
  readonly psrTriggered: boolean;
  /** Normal GET_UP or TacOps CAREFUL_STAND. */
  readonly mode?: StandUpMode;
}

export interface IGoProneStep {
  readonly kind: 'goProne';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly mpCost: number;
}

export interface IHullDownStep {
  readonly kind: 'hullDown';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly mpCost: number;
}

export interface IConvertModeStep {
  readonly kind: 'convertMode';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly mpCost: number;
  readonly stepNumber: number;
  readonly stepCount: number;
}

export interface IAltitudeControlStep {
  readonly kind: 'altitudeControl';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly mpCost: number;
  readonly direction: 'up' | 'down';
  readonly stepNumber: number;
  readonly stepCount: number;
}

export interface IChargeDeclaredStep {
  readonly kind: 'chargeDeclared';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly targetId: string;
  /** Length of the trailing forward run that qualifies the charge. */
  readonly straightLineHexes: number;
}

export interface IDfaDeclaredStep {
  readonly kind: 'dfaDeclared';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly targetId: string;
  readonly jumpHeight: number;
}

export interface IShakeOffSwarmStep {
  readonly kind: 'shakeOffSwarm';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly psrTriggered: boolean;
}

/**
 * Discriminated union of all movement-step shapes. Consumers narrow on
 * `step.kind` before reading kind-specific fields.
 */
export type IMovementStep =
  | IForwardStep
  | ITurnStep
  | ILateralStep
  | IJumpStep
  | IStandUpStep
  | IGoProneStep
  | IHullDownStep
  | IConvertModeStep
  | IAltitudeControlStep
  | IChargeDeclaredStep
  | IDfaDeclaredStep
  | IShakeOffSwarmStep;

/**
 * Movement locked event payload.
 */
export interface IMovementLockedPayload {
  /** Unit whose movement was locked */
  readonly unitId: string;
}

/**
 * Replayable runtime movement-state mutation. These fields are the shared
 * source for map projection and commit validation after LAM/QuadVee conversion
 * or conventional-infantry mount-state changes.
 */
export interface IRuntimeMovementStateChangedPayload {
  readonly unitId: string;
  readonly source:
    | 'conversion_action'
    | 'altitude_control_action'
    | 'automatic_wige_landing'
    | 'infantry_mount_action'
    | 'scenario_setup'
    | 'rules_correction';
  readonly conversionMode?: MovementConversionMode | number | null;
  /** Represented MegaMek CONVERT_MODE step count for conversion-action audit/replay metadata. */
  readonly conversionStepCount?: number;
  /** Represented MP cost of the conversion action before later movement steps. */
  readonly conversionMpCost?: number;
  readonly unitHeight?: number | null;
  /** Runtime VTOL/WiGE vehicle altitude changed through altitude controls. */
  readonly vehicleAltitude?: number;
  /** Runtime ProtoMek Glider altitude changed through WiGE-style altitude controls. */
  readonly protoAltitude?: number;
  /** Runtime LAM AirMek WiGE elevation changed through altitude controls. */
  readonly lamAirMekAltitude?: number;
  /** Represented MegaMek UP/DOWN step count for altitude-control audit/replay metadata. */
  readonly altitudeControlStepCount?: number;
  /** Represented MP cost of the altitude-control action before later movement steps. */
  readonly altitudeControlMpCost?: number;
  /** True when a LAM AirMek descent to ground level needs a landing control roll. */
  readonly lamAirMekLandingControlRequired?: boolean;
  /** Source-backed reason label for the represented AirMek landing control result. */
  readonly lamAirMekLandingControlReason?: string;
  /** Net landing control roll modifier represented from damaged legs/actuators. */
  readonly lamAirMekLandingControlModifier?: number;
  /** Human-readable modifier breakdown for AirMek landing control explanation. */
  readonly lamAirMekLandingControlModifierDetails?: readonly string[];
  /** Elevation/altitude height used for failed AirMek landing fall damage. */
  readonly lamAirMekLandingControlFallHeight?: number;
  readonly infantryMounted?: boolean | null;
  readonly infantryMountHeight?: number | null;
}

/**
 * Attack locked event payload.
 */
export interface IAttackLockedPayload {
  /** Unit whose attack was locked */
  readonly unitId: string;
}
