/**
 * Game session movement event payloads
 * Extracted from GameSessionInterfaces.ts to keep focused type modules under the lint line cap.
 */

import type { MovementAnimationMode } from './GameSessionCoreTypes';

import { Facing, IHexCoordinate, MovementType } from './HexGridInterfaces';

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
   * stand-up / go-prone steps). Used by the readable-companion formatter
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
  /**
   * Source-backed MegaMek `JUMP_MEK_MECHANICAL_BOOSTER` movement path marker.
   * DFA rejects jump paths that used mechanical boosters.
   */
  readonly usesMechanicalJumpBooster?: boolean;
}

export interface IStandUpStep {
  readonly kind: 'standUp';
  readonly index: number;
  readonly at: IHexCoordinate;
  /** Typically 2 MP per Total Warfare Errata stand-up cost. */
  readonly mpCost: number;
  /** AttemptStand fires regardless of stand outcome — always `true`. */
  readonly psrTriggered: boolean;
}

export interface IGoProneStep {
  readonly kind: 'goProne';
  readonly index: number;
  readonly at: IHexCoordinate;
  readonly mpCost: number;
}

export type MovementEnhancementActivationKind = 'MASC' | 'Supercharger';

export interface IMovementEnhancementActivatedPayload {
  readonly unitId: string;
  readonly enhancement: MovementEnhancementActivationKind;
}

export interface IFacingChangedPayload {
  readonly unitId: string;
  /** Chassis facing after a same-hex turn or fall rotation. */
  readonly facing?: Facing;
  /** Upper-body secondary facing after a torso-twist action. */
  readonly secondaryFacing?: Facing;
  /**
   * Backward-compatible relative twist used by pre-secondary-facing helpers.
   * Prefer `secondaryFacing` for new replayable torso-twist events.
   */
  readonly torsoTwist?: 'left' | 'right';
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
 * Attack locked event payload.
 */
export interface IAttackLockedPayload {
  /** Unit whose attack was locked */
  readonly unitId: string;
}
