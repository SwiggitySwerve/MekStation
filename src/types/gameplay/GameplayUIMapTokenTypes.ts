/**
 * Gameplay layout, tactical-map layer, and unit-token UI types.
 */

import { WeightClass } from '@/types/enums/WeightClass';

import type { ArmorPipState, ChassisArchetype } from './UnitSpriteTypes';

import { GamePhase, GameSide } from './GameSessionInterfaces';
import { IHexCoordinate, Facing } from './HexGridInterfaces';

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
