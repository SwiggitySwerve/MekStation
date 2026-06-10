/**
 * Gameplay UI Interfaces
 * Type definitions for the gameplay user interface layer.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import type {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

import { WeightClass } from '@/types/enums/WeightClass';

import type { IMovementInvalidPayload } from './GameSessionMovementEvents';
import type { WeaponFireMode } from './IndirectFireInterfaces';
import type { ArmorPipState, ChassisArchetype } from './UnitSpriteTypes';

import { GamePhase, GameSide, IToHitModifier } from './GameSessionInterfaces';
import {
  IHexCoordinate,
  Facing,
  FiringArc,
  MovementType,
} from './HexGridInterfaces';

// =============================================================================
// Layout Types
// =============================================================================

/**
 * Panel emphasis state for contextual layout.
 */
export type PanelEmphasis = 'map' | 'recordSheet' | 'balanced';

/**
 * Layout configuration for gameplay view.
 */
export interface ILayoutConfig {
  /** Current panel emphasis */
  readonly emphasis: PanelEmphasis;
  /** Map panel width percentage (0-100) */
  readonly mapPanelWidth: number;
  /** Is event log collapsed? */
  readonly eventLogCollapsed: boolean;
  /** Minimum panel width in pixels */
  readonly minPanelWidth: number;
}

/**
 * Default layout configuration.
 */
export const DEFAULT_LAYOUT_CONFIG: ILayoutConfig = {
  emphasis: 'balanced',
  mapPanelWidth: 50,
  eventLogCollapsed: false,
  minPanelWidth: 300,
};

// =============================================================================
// Tactical Map View Types
// =============================================================================

/**
 * Render-only presentation mode for the tactical map. BattleTech rules remain
 * anchored to axial hex coordinates; projection mode only changes how the SVG
 * layer is presented to the player.
 */
export type MapProjectionMode = 'topDown' | 'isometric2d' | 'isometricPreview';

export type MapIsometricRotationStep = 0 | 1 | 2 | 3 | 4 | 5;

export const MAP_LAYER_IDS = [
  'terrain',
  'elevation',
  'movement',
  'path',
  'cover',
  'los',
  'firingArcs',
  'objectives',
  'fog',
  'effects',
  'sensors',
] as const;

/**
 * Stable identifier for map layers that can be shown, hidden, locked, or
 * dimmed by the tactical-map controls.
 */
export type MapLayerId = (typeof MAP_LAYER_IDS)[number];

/**
 * Player-facing visibility contract for a tactical map layer.
 */
export interface IMapLayerState {
  readonly id: MapLayerId;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly intensity: number;
}

export type IMapLayerStateById = Readonly<Record<MapLayerId, IMapLayerState>>;

function mapLayer(
  id: MapLayerId,
  visible: boolean,
  locked = false,
  intensity = 1,
): IMapLayerState {
  return { id, visible, locked, intensity };
}

/**
 * Default tactical-map layer stack. Locked layers are structural; callers may
 * still read them through the same public contract, but controls should not
 * hide them.
 */
export const DEFAULT_MAP_LAYER_STATE: IMapLayerStateById = {
  terrain: mapLayer('terrain', true, true),
  elevation: mapLayer('elevation', true),
  movement: mapLayer('movement', false),
  path: mapLayer('path', true, true),
  cover: mapLayer('cover', false),
  los: mapLayer('los', false),
  firingArcs: mapLayer('firingArcs', true),
  objectives: mapLayer('objectives', true),
  fog: mapLayer('fog', true, true),
  effects: mapLayer('effects', true, true),
  sensors: mapLayer('sensors', true),
};

export function setMapLayerVisibility(
  layers: IMapLayerStateById,
  id: MapLayerId,
  visible: boolean,
): IMapLayerStateById {
  const layer = layers[id];
  if (layer.locked || layer.visible === visible) return layers;
  return {
    ...layers,
    [id]: { ...layer, visible },
  };
}

/**
 * Get layout config for a given phase.
 */
export function getLayoutForPhase(phase: GamePhase): Partial<ILayoutConfig> {
  switch (phase) {
    case GamePhase.Movement:
      return { emphasis: 'map', mapPanelWidth: 60 };
    case GamePhase.WeaponAttack:
    case GamePhase.PhysicalAttack:
      return { emphasis: 'recordSheet', mapPanelWidth: 40 };
    case GamePhase.Heat:
      return { emphasis: 'recordSheet', mapPanelWidth: 35 };
    default:
      return { emphasis: 'balanced', mapPanelWidth: 50 };
  }
}

// =============================================================================
// Unit Token Types
// =============================================================================

/**
 * Unit type discriminator for per-type token rendering.
 * Aligns with BattleTech unit classifications.
 */
export enum TokenUnitType {
  Mech = 'mech',
  Vehicle = 'vehicle',
  Aerospace = 'aerospace',
  BattleArmor = 'battle_armor',
  Infantry = 'infantry',
  ProtoMech = 'protomech',
}

/**
 * Vehicle motion type — determines the icon overlay on a VehicleToken
 * and applies the appropriate movement rules.
 */
export enum VehicleMotionType {
  Tracked = 'tracked',
  Wheeled = 'wheeled',
  Hover = 'hover',
  VTOL = 'vtol',
  Naval = 'naval',
  WiGE = 'wige',
}

/**
 * Infantry motive type — determines the badge shown on an InfantryToken.
 */
export enum InfantryMotiveType {
  Foot = 'foot',
  Motorized = 'motorized',
  Jump = 'jump',
  Mechanized = 'mechanized',
  Beast = 'beast',
}

/**
 * Infantry specialization — optional icon overlay on InfantryToken.
 */
export enum InfantryTokenSpecialization {
  AntiMech = 'anti_mech',
  Marine = 'marine',
  Scuba = 'scuba',
  Mountain = 'mountain',
  XCT = 'xct',
}

export type UnitFogStatus = 'visible' | 'hidden' | 'lastKnown';

export type BattleArmorPassengerBadgeSlot = 'shoulder' | 'side' | 'back';

export interface IBattleArmorPassengerBadge {
  readonly hostTokenId: string;
  readonly slot: BattleArmorPassengerBadgeSlot;
}

/**
 * Visual token shared base — fields common to every per-type variant.
 *
 * Per Council #1 PR8 (Momus god-type concern), `IUnitToken` is now a
 * discriminated union over `unitType`. Each variant extends this base
 * with only its legal per-type fields. Per-type fields stay OPTIONAL —
 * fog-of-war redaction can strip them, and PR8 deliberately does not
 * promote them to required (out of scope per Oracle Phase 3 ruling).
 */
export interface IUnitTokenBase {
  /** Unit ID */
  readonly unitId: string;
  /** Unit name for display */
  readonly name: string;
  /** Side (for coloring) */
  readonly side: GameSide;
  /** Current position */
  readonly position: IHexCoordinate;
  /** Last visible position for fog-of-war placeholder rendering. */
  readonly lastKnownPosition?: IHexCoordinate;
  /** Current facing */
  readonly facing: Facing;
  /** Fog display state for redacted or last-known enemy contacts. */
  readonly fogStatus?: UnitFogStatus;
  /** Sensor range in hexes; HexMapDisplay draws a ring when present. */
  readonly sensorRange?: number;
  /** Is this unit selected? */
  readonly isSelected: boolean;
  /** Is this unit a valid target? */
  readonly isValidTarget: boolean;
  /**
   * Per `add-attack-phase-ui` § 2.2: is this unit the currently
   * locked-in attack target (i.e. `useGameplayStore.attackPlan.targetUnitId
   * === unitId` during the Weapon Attack phase)?  When true the per-type
   * token renderers paint a pulsing red ring around the token.  Distinct
   * from `isValidTarget` (which flags every fireable enemy) — only one
   * token is the "active" target at a time.
   */
  readonly isActiveTarget?: boolean;
  /** Is this unit destroyed? */
  readonly isDestroyed: boolean;
  /**
   * Is this unit prone? Optional and currently projected by the replay
   * reducer (`useHexMapStateFromEvents`) from `UnitFell` / `UnitStood` and
   * posture-as-movement `MovementDeclared` events (audit 2026-06-09 G,
   * W5.1b). Live-play projections may leave it unset; renderers treat
   * `undefined` as standing.
   */
  readonly isProne?: boolean;
  /** Short designation (e.g., "ATL-1") */
  readonly designation: string;
}

/**
 * Mech variant — adds the sprite-system flags consumed by `MechSprite` +
 * `ArmorPipRing` (see add-mech-silhouette-sprite-set/specs/unit-sprite-system).
 * When any sprite field is absent, the renderer falls back to the
 * "medium humanoid, undamaged" silhouette so Phase-1 callers keep
 * rendering cleanly.
 */
export interface IMechToken extends IUnitTokenBase {
  readonly unitType: TokenUnitType.Mech;
  /** Tonnage-class bucket used to pick the sprite's weight silhouette. */
  readonly weightClass?: WeightClass;
  /**
   * Silhouette archetype override. When absent, a biped with `isQuad ||
   * isLAM` flags drives selection; otherwise the humanoid sprite is used.
   */
  readonly chassisArchetype?: ChassisArchetype;
  /** Is this a quadruped 'Mech chassis? Feeds sprite selection. */
  readonly isQuad?: boolean;
  /** Is this a Land-Air 'Mech? Feeds sprite selection. */
  readonly isLAM?: boolean;
  /**
   * Per-location armor+structure state for the damage pip ring. When
   * absent, the ring renders every location as `full` (fresh-off-the-lot).
   */
  readonly armorPipState?: ArmorPipState;
}

/**
 * Vehicle variant — ground / VTOL / naval / WiGE.
 */
export interface IVehicleToken extends IUnitTokenBase {
  readonly unitType: TokenUnitType.Vehicle;
  /** Vehicle motion type — used for icon overlay. */
  readonly vehicleMotionType?: VehicleMotionType;
  /** Turret facing in 8-directions (0=N, 1=NE, …, 7=NW). Absent if no turret. */
  readonly turretFacing?: number;
  /**
   * Current altitude level for altitude-tracked vehicle motives such as VTOL
   * and WiGE. Undefined for ground-only vehicles or callers that have not
   * projected vehicle combat state yet. 0 = hover/landed.
   */
  readonly altitude?: number;
}

/**
 * Aerospace variant — fighters / drop / etc.
 */
export interface IAerospaceToken extends IUnitTokenBase {
  readonly unitType: TokenUnitType.Aerospace;
  /**
   * Current altitude level (0–10). 0 = landed. Wired from
   * `IAerospaceCombatState.altitude` via the unified `unitStateToToken`
   * adapter (`src/lib/gameplay/unitStateToToken.ts`). Per
   * `wire-combat-behavior-dispatch` (Council #1 PR7).
   */
  readonly altitude: number;
  /**
   * Current velocity in thrust points. Wired from
   * `IAerospaceCombatState.currentVelocity` through the shared
   * `unitStateToToken` adapter so token vectors mirror engine state.
   */
  readonly velocity?: number;
}

/**
 * BattleArmor variant — squad / point / passenger badge.
 */
export interface IBattleArmorToken extends IUnitTokenBase {
  readonly unitType: TokenUnitType.BattleArmor;
  /**
   * ID of the unit this BA is mounted on. When set, the BA token renders
   * as a passenger badge on the host mech rather than a standalone token.
   *
   * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
   *       Mounted-Trooper Passenger Badge
   */
  readonly mountedOn?: string;
  /**
   * Renderer hint for the host token badge slot. `mountedOn` remains the
   * rules-state relationship; this optional hint lets the map place multiple
   * BA passengers around the host without changing the underlying rules state.
   */
  readonly passengerBadge?: IBattleArmorPassengerBadge;
  /** Number of surviving troopers (1–6), projected from combatState. */
  readonly trooperCount: number;
  /** Is jump / UMU movement active this turn? */
  readonly jumpActive?: boolean;
}

/**
 * Infantry variant — platoons of foot / motorized / jump / mechanized / beast.
 */
export interface IInfantryToken extends IUnitTokenBase {
  readonly unitType: TokenUnitType.Infantry;
  /** Number of surviving troopers (1–30 for a platoon), projected from combatState. */
  readonly infantryCount: number;
  /** How many platoons share this hex (for stack indicator), projected from combatState. */
  readonly platoonCount: number;
  /** Motive type badge. */
  readonly infantryMotiveType?: InfantryMotiveType;
  /** Specialization icon. */
  readonly infantrySpecialization?: InfantryTokenSpecialization;
}

/**
 * ProtoMech variant — point of 1–5 protos sharing a hex.
 */
export interface IProtoMechToken extends IUnitTokenBase {
  readonly unitType: TokenUnitType.ProtoMech;
  /** Number of surviving protos in this point (1–5), projected from combatState. */
  readonly protoCount: number;
  /** Glider variant — renders extended wings. Projected from combatState. */
  readonly isGlider: boolean;
  /** Has main gun equipped. Projected from combatState. */
  readonly hasMainGun: boolean;
}

/**
 * Visual token representing a unit on the hex map. Discriminated union over
 * `unitType`; each variant carries only the legal per-type fields. Token
 * components accept their narrowed variant directly. Per-type fields are
 * required on their variants; fog-redacted hidden enemies are projected as
 * the safe Mech variant so these fields never leak through last-known tokens.
 *
 * Per Council #1 PR8 (Momus god-type concern). Replaces the prior flat
 * interface with 19 optional cross-type fields.
 */
export type IUnitToken =
  | IMechToken
  | IVehicleToken
  | IAerospaceToken
  | IBattleArmorToken
  | IInfantryToken
  | IProtoMechToken;

// =============================================================================
// Movement Preview Types
// =============================================================================

/**
 * Preview data for a potential movement.
 */
export interface IMovementPreview {
  /** Unit being moved */
  readonly unitId: string;
  /** Starting position */
  readonly from: IHexCoordinate;
  /** Target position */
  readonly to: IHexCoordinate;
  /** Path of hexes traversed */
  readonly path: readonly IHexCoordinate[];
  /** Proposed facing */
  readonly facing: Facing;
  /** Movement type */
  readonly movementType: MovementType;
  /** MP cost */
  readonly mpCost: number;
  /** MP available */
  readonly mpAvailable: number;
  /** Heat that will be generated */
  readonly heatGenerated: number;
  /** Target movement modifier (TMM) */
  readonly tmm: number;
  /** To-hit penalty from movement */
  readonly toHitPenalty: number;
  /** Is this movement valid? */
  readonly isValid: boolean;
  /** Validation error message if invalid */
  readonly errorMessage?: string;
}

/**
 * Hex highlight for movement range display.
 */
export interface IMovementRangeModeOption {
  /** Movement type represented by this same-hex option. */
  readonly movementType: MovementType;
  /** Rules-level motive mode used for terrain/elevation costs. */
  readonly movementMode?: string;
  /** Is this option reachable with its movement allowance? */
  readonly reachable: boolean;
  /** MP cost to reach or evaluate this hex with this option. */
  readonly mpCost: number;
  /** Terrain modifier paid on the final step for this option. */
  readonly terrainCost?: number;
  /** Elevation delta from the previous path hex for this option. */
  readonly elevationDelta?: number;
  /** Elevation MP paid on the final step for this option. */
  readonly elevationCost?: number;
  /** Heat generated by committing this movement option. */
  readonly heatGenerated?: number;
  /** Represented conversion steps reserved before this movement option. */
  readonly conversionStepCount?: number;
  /** MP reserved by represented conversion steps before this movement option. */
  readonly conversionMpCost?: number;
  /** Represented altitude-control steps reserved before this movement option. */
  readonly altitudeControlStepCount?: number;
  /** MP reserved by represented altitude-control steps before this movement option. */
  readonly altitudeControlMpCost?: number;
  /** True when altitude controls, not ground movement, own this option. */
  readonly altitudeControlRequired?: boolean;
  /** Altitude-control motive that owns this option, when represented. */
  readonly altitudeControlMode?: 'vtol' | 'wige';
  /** Represented altitude that triggered altitude-control ownership. */
  readonly altitudeControlAltitude?: number;
  /** True when source-backed WiGE rules will force a landing after this move. */
  readonly automaticLandingRequired?: boolean;
  /** Player-facing reason for the automatic landing consequence. */
  readonly automaticLandingReason?: string;
  /** Motive mode whose automatic landing rule owns this consequence. */
  readonly automaticLandingMode?: 'wige';
  /** Hexes moved for the automatic landing minimum-distance check. */
  readonly automaticLandingDistance?: number;
  /** Minimum hex distance needed to remain airborne for this unit. */
  readonly automaticLandingMinimumDistance?: number;
  /** True when a hull-down unit must leave hull-down before this option. */
  readonly hullDownExitRequired?: boolean;
  /** MP reserved for leaving hull-down before entering this option's path. */
  readonly hullDownExitCost?: number;
  /** Player-facing reason this movement option is blocked or illegal. */
  readonly blockedReason?: string;
  /** Engine-aligned rejection reason for illegal destinations. */
  readonly movementInvalidReason?: IMovementInvalidPayload['reason'];
  /** Engine-style detail string paired with movementInvalidReason. */
  readonly movementInvalidDetails?: string;
}

export interface IMovementRangeHex {
  /** Hex position */
  readonly hex: IHexCoordinate;
  /** MP cost to reach */
  readonly mpCost: number;
  /** Terrain modifier paid on the final step into this hex. */
  readonly terrainCost?: number;
  /** Elevation delta from the previous path hex into this hex. */
  readonly elevationDelta?: number;
  /** Elevation MP paid on the final step into this hex. */
  readonly elevationCost?: number;
  /** Canonical path used to reach this hex, when pathfinding produced one. */
  readonly path?: readonly IHexCoordinate[];
  /** Player-facing reason this hex is blocked or illegal. */
  readonly blockedReason?: string;
  /** Engine-aligned movement rejection reason for illegal destinations. */
  readonly movementInvalidReason?: IMovementInvalidPayload['reason'];
  /** Engine-style detail string paired with movementInvalidReason. */
  readonly movementInvalidDetails?: string;
  /** Heat generated if the unit commits movement to this hex. */
  readonly heatGenerated?: number;
  /** Represented conversion steps reserved before this movement projection. */
  readonly conversionStepCount?: number;
  /** MP reserved by represented conversion steps before this movement projection. */
  readonly conversionMpCost?: number;
  /** Represented altitude-control steps reserved before this movement projection. */
  readonly altitudeControlStepCount?: number;
  /** MP reserved by represented altitude-control steps before this movement projection. */
  readonly altitudeControlMpCost?: number;
  /** True when altitude controls, not ground movement, own this projection. */
  readonly altitudeControlRequired?: boolean;
  /** Altitude-control motive that owns this projection, when represented. */
  readonly altitudeControlMode?: 'vtol' | 'wige';
  /** Represented altitude that triggered altitude-control ownership. */
  readonly altitudeControlAltitude?: number;
  /** True when source-backed WiGE rules will force a landing after this move. */
  readonly automaticLandingRequired?: boolean;
  /** Player-facing reason for the automatic landing consequence. */
  readonly automaticLandingReason?: string;
  /** Motive mode whose automatic landing rule owns this consequence. */
  readonly automaticLandingMode?: 'wige';
  /** Hexes moved for the automatic landing minimum-distance check. */
  readonly automaticLandingDistance?: number;
  /** Minimum hex distance needed to remain airborne for this unit. */
  readonly automaticLandingMinimumDistance?: number;
  /** True when a hull-down unit must leave hull-down before this movement can resolve. */
  readonly hullDownExitRequired?: boolean;
  /** MP reserved for leaving hull-down before entering the projected path. */
  readonly hullDownExitCost?: number;
  /** True when a prone unit must stand before this movement can resolve. */
  readonly standUpRequired?: boolean;
  /** Normal stand-up or TacOps careful stand. */
  readonly standUpMode?: 'normal' | 'careful';
  /** MP reserved for standing from prone before entering the projected path. */
  readonly standUpCost?: number;
  /** True when the stand-up step requires a piloting skill roll. */
  readonly standUpPsrRequired?: boolean;
  /** Player-facing PSR reason for the stand-up step. */
  readonly standUpPsrReason?: string;
  /** Projected stand-up target number when pilot state is available. */
  readonly standUpPsrTargetNumber?: number;
  /** Non-piloting modifier included in standUpPsrTargetNumber. */
  readonly standUpPsrModifier?: number;
  /** Human-readable modifier rows included in the stand-up PSR target. */
  readonly standUpPsrModifierDetails?: readonly string[];
  /** Reason the stand-up attempt cannot succeed, when known. */
  readonly standUpPsrImpossibleReason?: string;
  /** Reason stand-up succeeds without a PSR, when projected. */
  readonly standUpPsrAutomaticSuccessReason?: string;
  readonly movementMode?: string;
  /** Same-hex movement options when walk/run/jump projections overlap. */
  readonly movementModeOptions?: readonly IMovementRangeModeOption[];
  /** Is this hex reachable with current MP? */
  readonly reachable: boolean;
  /** Movement type to reach (walk/run/jump) */
  readonly movementType: MovementType;
}

// =============================================================================
// Attack Preview Types
// =============================================================================

/**
 * Preview data for a potential attack.
 */
export interface IAttackPreview {
  /** Attacking unit */
  readonly attackerId: string;
  /** Target unit */
  readonly targetId: string;
  /** Weapons selected for attack */
  readonly weapons: readonly IWeaponAttackPreview[];
  /** Total heat generated */
  readonly totalHeat: number;
  /** Current heat */
  readonly currentHeat: number;
  /** Projected heat after attacks */
  readonly projectedHeat: number;
  /** Heat warnings */
  readonly heatWarnings: readonly string[];
}

/**
 * Preview for a single weapon attack.
 */
export interface IWeaponAttackPreview {
  /** Weapon ID */
  readonly weaponId: string;
  /** Weapon name */
  readonly weaponName: string;
  /** Is weapon available (not destroyed, has ammo)? */
  readonly available: boolean;
  /** Is target in range? */
  readonly inRange: boolean;
  /** Is target in arc? */
  readonly inArc: boolean;
  /** Range to target in hexes */
  readonly range: number;
  /** Range bracket */
  readonly rangeBracket: 'short' | 'medium' | 'long' | 'out';
  /** Base to-hit (gunnery) */
  readonly baseToHit: number;
  /** All modifiers */
  readonly modifiers: readonly IToHitModifier[];
  /** Final to-hit number */
  readonly finalToHit: number;
  /** Hit probability percentage */
  readonly hitProbability: number;
  /** Damage on hit */
  readonly damage: number;
  /** Heat generated */
  readonly heat: number;
  /** Reason weapon unavailable (if any) */
  readonly unavailableReason?: string;
}

// =============================================================================
// Record Sheet Display Types
// =============================================================================

/**
 * Location status for record sheet display.
 */
export interface ILocationStatus {
  /** Location name */
  readonly location: string;
  /** Display name */
  readonly displayName: string;
  /** Current armor */
  readonly armor: number;
  /** Maximum armor */
  readonly maxArmor: number;
  /** Current structure */
  readonly structure: number;
  /** Maximum structure */
  readonly maxStructure: number;
  /** Is location destroyed? */
  readonly destroyed: boolean;
  /** Rear armor (for torsos) */
  readonly rearArmor?: number;
  /** Maximum rear armor */
  readonly maxRearArmor?: number;
}

/**
 * Weapon status for record sheet display.
 */
export interface IWeaponStatus {
  /** Weapon ID */
  readonly id: string;
  /** Weapon name */
  readonly name: string;
  /** Current per-weapon combat fire mode. Defaults to Direct when absent. */
  readonly mode?: WeaponFireMode;
  /** Location mounted */
  readonly location: string;
  /** Mounted firing arc, when known. Missing means legacy omnidirectional. */
  readonly mountingArc?: FiringArc;
  /**
   * Mounted firing arcs when the represented mount covers multiple chassis
   * arcs. Missing means legacy omnidirectional/unknown coverage.
   */
  readonly mountingArcs?: readonly FiringArc[];
  /** Vehicle mount location, when this weapon belongs to a vehicle. */
  readonly vehicleMountLocation?: VehicleLocation | VTOLLocation;
  /** True when the weapon is mounted in the vehicle primary turret. */
  readonly vehicleIsTurretMounted?: boolean;
  /** Is weapon destroyed? */
  readonly destroyed: boolean;
  /** Was weapon fired this turn? */
  readonly firedThisTurn: boolean;
  /** Ammo remaining (if ammo-using) */
  readonly ammoRemaining?: number;
  /**
   * Maximum ammo capacity per the unit's construction. Optional so pre-
   * existing callers that only fill `ammoRemaining` keep compiling; the
   * record-sheet inline ammo counter falls back to `ammoRemaining` as
   * the max when this is absent (renders a flat "N rds" line).
   */
  readonly ammoMax?: number;
  /**
   * Per `add-interactive-combat-core-ui` § 7.3: weapons may be jammed
   * (UAC / RAC jam, or future weapon-specific jam mechanics). Jammed
   * weapons render disabled with a "JAMMED" badge and never resolve
   * hits this turn. Separate from `destroyed` so a later clear-jam
   * action can transition back.
   */
  readonly jammed?: boolean;
  /** Heat generated */
  readonly heat: number;
  /** Damage */
  readonly damage: number | string;
  /** Range brackets */
  readonly ranges: {
    readonly short: number;
    readonly medium: number;
    readonly long: number;
    readonly extreme?: number;
    readonly minimum?: number;
  };
  /** True for represented torpedo weapons that must remain in water. */
  readonly isTorpedo?: boolean;
  /**
   * Called-shot election carried into committed-attack to-hit projections so
   * the projection hydrates the same attacker state as the engine commit path
   * (audit 2026-06-09 B-1). Optional: UI previews that have no election yet
   * leave both unset.
   */
  readonly calledShot?: boolean;
  /** Teammate-assisted called-shot election; see `calledShot`. */
  readonly teammateCalledShot?: boolean;
}

/**
 * Per `add-interactive-combat-core-ui` § 8: compact Special Pilot
 * Ability projection used by the action panel. Full-fat `ISPADesignation`
 * metadata lives on the pilot record; this shape is the minimum the UI
 * needs to list the ability and surface a description tooltip. Projection
 * happens in the gameplay store so render code stays dumb.
 */
export interface IPilotSpaSummary {
  /** Canonical ability id (catalog slug). */
  readonly id: string;
  /** Display label including designation when applicable. */
  readonly displayLabel: string;
  /** Short human description rendered as a hover tooltip. */
  readonly description: string;
}

// =============================================================================
// Event Log Types
// =============================================================================

/**
 * Filter options for event log.
 */
export interface IEventLogFilter {
  /** Filter by event types */
  readonly eventTypes?: readonly string[];
  /** Filter by unit ID */
  readonly unitId?: string;
  /** Filter by turn */
  readonly turn?: number;
  /** Filter by side */
  readonly side?: GameSide;
}

/**
 * Formatted event for display.
 */
export interface IFormattedEvent {
  /** Event ID */
  readonly id: string;
  /** Turn number */
  readonly turn: number;
  /** Phase */
  readonly phase: GamePhase;
  /** Formatted text */
  readonly text: string;
  /** Icon/type indicator */
  readonly icon:
    | 'movement'
    | 'attack'
    | 'damage'
    | 'heat'
    | 'critical'
    | 'status'
    | 'phase';
  /** Side that triggered event */
  readonly side?: GameSide;
  /** Related unit ID */
  readonly unitId?: string;
  /** Timestamp */
  readonly timestamp: string;
}

// =============================================================================
// Phase Controls Types
// =============================================================================

/**
 * Action available in the current phase.
 */
export interface IPhaseAction {
  /** Action ID */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Icon name */
  readonly icon?: string;
  /** Is action available? */
  readonly enabled: boolean;
  /** Is this the primary action? */
  readonly primary: boolean;
  /** Keyboard shortcut */
  readonly shortcut?: string;
  /** Tooltip text */
  readonly tooltip?: string;
}

/**
 * Get available actions for a phase.
 */
export function getPhaseActions(
  phase: GamePhase,
  canUndo: boolean,
): IPhaseAction[] {
  switch (phase) {
    case GamePhase.Movement:
      return [
        {
          id: 'lock',
          label: 'Lock Movement',
          primary: true,
          enabled: true,
          shortcut: 'Enter',
        },
        {
          id: 'undo',
          label: 'Undo',
          primary: false,
          enabled: canUndo,
          shortcut: 'Ctrl+Z',
        },
        { id: 'skip', label: 'Skip', primary: false, enabled: true },
      ];
    case GamePhase.WeaponAttack:
      return [
        {
          id: 'lock',
          label: 'Lock Attacks',
          primary: true,
          enabled: true,
          shortcut: 'Enter',
        },
        { id: 'clear', label: 'Clear All', primary: false, enabled: true },
        { id: 'skip', label: 'Skip Attacks', primary: false, enabled: true },
      ];
    case GamePhase.Heat:
      return [
        {
          id: 'continue',
          label: 'Continue',
          primary: true,
          enabled: true,
          shortcut: 'Enter',
        },
      ];
    case GamePhase.End:
      return [
        {
          id: 'next-turn',
          label: 'Next Turn',
          primary: true,
          enabled: true,
          shortcut: 'Enter',
        },
        { id: 'concede', label: 'Concede', primary: false, enabled: true },
      ];
    default:
      return [];
  }
}

// =============================================================================
// Replay Types
// =============================================================================

/**
 * Replay mode state.
 */
export interface IReplayState {
  /** Is replay mode active? */
  readonly active: boolean;
  /** Is replay playing? */
  readonly playing: boolean;
  /** Playback speed multiplier */
  readonly speed: number;
  /** Current event index */
  readonly currentEventIndex: number;
  /** Total events */
  readonly totalEvents: number;
  /** Current turn being displayed */
  readonly displayTurn: number;
  /** Current phase being displayed */
  readonly displayPhase: GamePhase;
}

// =============================================================================
// Gameplay Store Types
// =============================================================================

/**
 * UI state for the gameplay view.
 */
export interface IGameplayUIState {
  /** Layout configuration */
  readonly layout: ILayoutConfig;
  /** Selected unit ID */
  readonly selectedUnitId: string | null;
  /** Targeted unit ID (for attacks) */
  readonly targetUnitId: string | null;
  /** Movement preview (if planning movement) */
  readonly movementPreview: IMovementPreview | null;
  /** Attack preview (if planning attack) */
  readonly attackPreview: IAttackPreview | null;
  /** Queued weapon IDs for attack */
  readonly queuedWeaponIds: readonly string[];
  /** Event log filter */
  readonly eventLogFilter: IEventLogFilter;
  /** Replay state */
  readonly replay: IReplayState;
  /** Is waiting for opponent? */
  readonly waitingForOpponent: boolean;
  /** Error message to display */
  readonly errorMessage: string | null;
}

/**
 * Default UI state.
 */
export const DEFAULT_UI_STATE: IGameplayUIState = {
  layout: DEFAULT_LAYOUT_CONFIG,
  selectedUnitId: null,
  targetUnitId: null,
  movementPreview: null,
  attackPreview: null,
  queuedWeaponIds: [],
  eventLogFilter: {},
  replay: {
    active: false,
    playing: false,
    speed: 1,
    currentEventIndex: 0,
    totalEvents: 0,
    displayTurn: 1,
    displayPhase: GamePhase.Initiative,
  },
  waitingForOpponent: false,
  errorMessage: null,
};
