/**
 * Tactical Command type contract — UI adapter layer over engine actions.
 *
 * Wave 7.2 PR-D introduces the action menu system. A `ITacticalCommand`
 * is a single, dispatchable unit of UI intent that:
 *
 *   1. Names a category (movement, facing, weapon attack, physical
 *      attack, heat/end, utility, GM/referee). The action dock groups
 *      commands by category; context menus filter by it.
 *   2. Declares which phases it applies to (Movement, WeaponAttack,
 *      PhysicalAttack, Heat, End). Phase mismatches make the command
 *      ABSENT from the registry — phase guards are NOT a `disabledReason`.
 *   3. Exposes an `availability(state)` predicate that returns either
 *      `{ available: true }` or `{ available: false, reason: string }`.
 *      Disabled-with-reason commands stay visible so players learn
 *      why they cannot act (per the spec's "Disabled is informative"
 *      Decision).
 *   4. Optionally builds a `preview` object — path, facing, to-hit,
 *      heat, ammo, damage envelope, etc. — that the map / inspector
 *      surface can render BEFORE the player commits.
 *   5. Commits via `commit(state)`. Confirmation gating (`requiresConfirmation`)
 *      and undo flagging (`undoable`) live on the command itself so the
 *      dock and the context menu share the same lifecycle rules.
 *
 * All command surfaces (action dock, token context menu, hex context
 * menu) dispatch through the SAME registry. Per the spec's "Context
 * Menus Mirror Command Registry" requirement, no parallel dispatch
 * paths exist.
 *
 * Three-unit-reference decoupling rule (Wave 7.0 gate 4):
 *   - `activeUnit`     — whose turn it is → drives command availability
 *   - `selectedUnit`   — map highlight cursor (NOT a command driver)
 *   - `inspectedUnit`  — right-tray record sheet (NOT a command driver)
 *
 * The MegaMek PR #5540 / #5573 firing-arc regression happened because
 * the upstream merged these three into one reference. Commands here
 * bind to `activeUnit` only.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.1, §1.2
 */

import type {
  IPhysicalAttackOption,
  PhysicalAttackInvalidReason,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import type { GroundMotionType } from '../unit/BaseUnitInterfaces';
import type { ICombatRangeHex } from './CombatProjectionInterfaces';
import type { IMovementRangeHex } from './GameplayUIInterfaces';
import type { IAttackInvalidPayload } from './GameSessionAttackEvents';
import type { GamePhase, LockState } from './GameSessionCoreTypes';
import type { IComponentDamageState } from './GameSessionStateTypes';
import type {
  IHexCoordinate,
  IMovementCapability,
  MovementConversionMode,
} from './HexGridInterfaces';

/**
 * Top-level command categories. Determines dock grouping and which
 * context surfaces a command appears in:
 *
 *   - `movement`   — walk/run/jump/stand/stabilize/etc. Shown in dock
 *                    during Movement; in token menu (own unit) +
 *                    hex menu (move-to-hex).
 *   - `facing`     — change facing without changing hex (e.g. torso
 *                    twist / chassis turn). Movement phase.
 *   - `weapon`     — fire a specific weapon or auto-volley. WeaponAttack
 *                    phase. Enemy token menu surfaces target-aware
 *                    weapon commands.
 *   - `physical`   — punch/kick/charge/DFA/club. PhysicalAttack phase.
 *                    Enemy token menu surfaces target-aware physical
 *                    commands.
 *   - `heat-end`   — phase advancement, end-of-turn cleanup, end-phase
 *                    commits. Phase end / Heat.
 *   - `utility`    — non-phase-specific abilities (search-and-rescue,
 *                    eject, declare retreat, request-spot). Always
 *                    visible when valid.
 *   - `gm`         — GM/referee-only commands (advance phase by force,
 *                    grant resource, set damage). Gated by GM mode in
 *                    a later wave; the registry already filters them
 *                    out for non-GM shellModes today.
 */
export type TacticalCommandCategory =
  | 'movement'
  | 'facing'
  | 'weapon'
  | 'physical'
  | 'heat-end'
  | 'utility'
  | 'gm';

/**
 * Result returned by `command.availability(state)`. When `available`
 * is false, `reason` MUST be a player-facing string (no internal
 * codes) — surfaced in tooltips and the detail pane per the spec's
 * `Disabled command explains invalidity` scenario.
 */
export type CommandAvailability =
  | { readonly available: true }
  | { readonly available: false; readonly reason: string };

/**
 * Selection context passed into command availability/preview/commit.
 *
 * This is intentionally a NARROW projection of `ITacticalShellState`
 * plus engine-derived facts the registry needs. The command adapter
 * functions do NOT pull from the store directly — that would defeat
 * unit-testability and make availability predicates non-pure.
 */
export interface ITacticalCommandContext {
  /**
   * Unit id whose turn it is. Commands bind here, NOT to selectedUnit.
   * `null` when no active unit (between turns, post-game).
   */
  readonly activeUnitId: string | null;
  /** Map cursor selection — used only by preview, never by availability. */
  readonly selectedUnitId: string | null;
  /** Target the player is aiming at (attack commands). */
  readonly targetUnitId: string | null;
  /**
   * Shared combat projection for targetUnitId, when the map has already
   * derived one. Weapon commands use this to reject blocked volleys before
   * commit with the same rules-backed reason shown on the map.
   */
  readonly targetCombatProjection?: ICombatRangeHex | null;
  /**
   * Target-id keyed combat projections. Context menus can override
   * targetUnitId and pick the matching projection without recalculating
   * range, arc, LOS, visibility, or weapon availability in the menu layer.
   */
  readonly combatProjectionByTargetId?: Readonly<
    Record<string, ICombatRangeHex>
  >;
  /**
   * Shared movement projection for hoveredHex, when the map has already
   * derived one. Movement commands use this to reject blocked destinations
   * before commit with the same rules-backed reason shown on the map.
   */
  readonly targetMovementProjection?: IMovementRangeHex | null;
  /**
   * Hex-keyed movement projections. Hex context menus can override
   * hoveredHex and pick the matching projection without recalculating
   * terrain, elevation, MP, heat, or illegal-destination reasons.
   */
  readonly movementProjectionByHex?: Readonly<
    Record<string, IMovementRangeHex>
  >;
  /**
   * Shared physical-attack projection for the currently planned target row.
   * Physical commands use this to reject blocked punch/kick/charge/DFA/club
   * commits before dispatch with the same rules-backed reason shown in the
   * physical preview surface.
   */
  readonly targetPhysicalAttackOption?: IPhysicalAttackOption | null;
  /**
   * Physical attack options for the current target. Token context menus use
   * this to gate each physical command against the right-clicked target without
   * recalculating physical restrictions in the menu layer.
   */
  readonly targetPhysicalAttackOptions?:
    | readonly IPhysicalAttackOption[]
    | null;
  /**
   * Target-id keyed physical attack options. Enemy token context menus can
   * override targetUnitId and pick the matching projection rows from this map.
   */
  readonly physicalAttackOptionsByTargetId?: Readonly<
    Record<string, readonly IPhysicalAttackOption[]>
  >;
  /** Hex the cursor is hovering, if any. */
  readonly hoveredHex: IHexCoordinate | null;
  /** Current game phase. Drives phase-filter at the registry level. */
  readonly phase: GamePhase;
  /** True if the local viewer can act (their turn + connected, etc). */
  readonly canAct: boolean;
  /** True when the active unit is currently prone and can attempt to stand. */
  readonly activeUnitProne?: boolean;
  /** True when the active unit is currently hull-down and can exit that posture. */
  readonly activeUnitHullDown?: boolean;
  /** Current movement declaration lock state for the active unit. */
  readonly activeUnitLockState?: LockState;
  /** Current heat on the active unit, used for heat-reduced movement MP gates. */
  readonly activeUnitHeat?: number;
  /** True when the active unit already has a movement preview/plan queued. */
  readonly activeUnitHasPlannedMovement?: boolean;
  /** Runtime conversion mode for LAM / QuadVee style movement controls. */
  readonly activeUnitConversionMode?: MovementConversionMode | number;
  /** Represented vehicle motive used by VTOL/WiGE altitude controls. */
  readonly activeUnitVehicleMotionType?: GroundMotionType;
  /** Represented VTOL/WiGE vehicle altitude, where 0 means landed/hovering. */
  readonly activeUnitVehicleAltitude?: number;
  /** True when the active ProtoMek combat state is a represented Glider chassis. */
  readonly activeUnitProtoGlider?: boolean;
  /** Represented ProtoMek Glider altitude, where 0 means grounded. */
  readonly activeUnitProtoAltitude?: number;
  /** Represented LAM AirMek WiGE elevation selected through altitude controls. */
  readonly activeUnitLamAirMekAltitude?: number;
  /** Active unit terrain tag at its current hex, used by source-backed action gates. */
  readonly activeUnitTerrain?: string;
  /** Active unit elevation at its current hex, when represented by the map. */
  readonly activeUnitElevation?: number;
  /** Runtime mounted state for represented conventional infantry controls. */
  readonly activeUnitInfantryMounted?: boolean;
  /** Runtime or imported mount height for represented conventional infantry. */
  readonly activeUnitInfantryMountHeight?: number;
  /** Source-backed reason the active unit cannot complete a stand-up attempt. */
  readonly activeUnitStandUpImpossibleReason?: string;
  /** Active unit component damage used by posture commands with damage-scaled costs. */
  readonly activeUnitComponentDamage?: IComponentDamageState;
  /** Active unit gyro type used by damage-sensitive runtime movement gates. */
  readonly activeUnitGyroType?: string;
  /** Active unit destroyed locations used by posture commands with limb gates. */
  readonly activeUnitDestroyedLocations?: readonly string[];
  /** Active session optional-rule keys used by source-backed command gates. */
  readonly optionalRules?: readonly string[];
  /**
   * Engine-derived movement envelope for activeUnitId, when available.
   * Command availability uses this to explain unavailable movement modes
   * before a player selects a map destination.
   */
  readonly movementCapability?: IMovementCapability | null;
}

/**
 * Movement preview payload — emitted by movement command adapters.
 * Used by `useCommandPreview` to drive path/facing overlays already
 * wired into HexMapDisplay.
 */
export interface IMovementCommandPreview {
  readonly kind: 'movement';
  /** Path hexes from origin to destination (inclusive of both ends). */
  readonly path: readonly IHexCoordinate[];
  /** Movement-point cost of the previewed path. */
  readonly mpCost: number;
  /** Proposed final facing after movement (0..5). */
  readonly finalFacing: number;
  /** Walk vs run vs jump (drives heat preview + indicator color). */
  readonly mode: 'walk' | 'run' | 'jump';
  /** Rules-level movement mode used for terrain/elevation pathing. */
  readonly movementMode?: string;
  /** Terrain modifier paid on the final step into the destination hex. */
  readonly terrainCost?: number;
  /** MP charged for facing changes along the previewed path. */
  readonly turningCost?: number;
  /** Elevation delta from the previous path hex into the destination hex. */
  readonly elevationDelta?: number;
  /** Elevation MP paid on the final step into the destination hex. */
  readonly elevationCost?: number;
  /** Heat generated if the previewed movement is committed. */
  readonly heatGenerated?: number;
  /** Player-facing reason the previewed destination is blocked. */
  readonly blockedReason?: string;
  /** True if the previewed destination is unreachable (over MP). */
  readonly unreachable: boolean;
}

/**
 * Weapon attack preview payload — populated when an enemy is selected
 * during WeaponAttack phase.
 */
export interface IWeaponAttackCommandPreview {
  readonly kind: 'weapon-attack';
  readonly targetUnitId: string;
  /** True when the rules projection says this attack can be committed. */
  readonly attackable: boolean;
  /** To-hit number after all modifiers (2..12). */
  readonly toHit: number | null;
  /** Range band the target falls into. */
  readonly rangeBand: 'short' | 'medium' | 'long' | 'extreme' | 'out';
  /** Engine-aligned attack rejection reason for blocked previews. */
  readonly attackInvalidReason?: IAttackInvalidPayload['reason'];
  /** Engine-style detail string paired with attackInvalidReason. */
  readonly attackInvalidDetails?: string;
  /** Player-facing reason the attack cannot be committed. */
  readonly blockedReason?: string;
  /** Total heat the attack will generate. */
  readonly heatCost: number;
  /** Weapon ids included in the projected attack volley. */
  readonly weaponIds: readonly string[];
  /** Player-facing weapon names included in the projected attack volley. */
  readonly weaponNames: readonly string[];
  /** Ammo type -> number of shots consumed. */
  readonly ammoUsage: Readonly<Record<string, number>>;
  /** Per-weapon expected damage (sum across selected weapons). */
  readonly expectedDamage: number;
}

/**
 * Physical attack preview payload — populated when an enemy is selected
 * during PhysicalAttack phase.
 */
export interface IPhysicalAttackCommandPreview {
  readonly kind: 'physical-attack';
  readonly targetUnitId: string;
  readonly attackType: PhysicalAttackType;
  /** Selected limb for punch/kick rows and limb-specific restrictions. */
  readonly limb?: PhysicalAttackLimb | null;
  /** True when the physical-attack projection says this row can commit. */
  readonly attackable: boolean;
  readonly toHit: number | null;
  readonly damage: number;
  /** Self-damage from the attack (e.g. DFA, charge). */
  readonly selfDamage: number;
  /** Whether a piloting skill roll is required. */
  readonly requiresPSR: boolean;
  /** Per-leg self damage for DFA-style attacks. */
  readonly attackerLegDamagePerLeg?: number;
  /** Miss consequence surfaced before commit. */
  readonly onMiss?: 'AttackerFalls' | 'None' | null;
  /** Engine-side physical restriction codes blocking this attack. */
  readonly restrictionReasonCodes?: readonly PhysicalAttackInvalidReason[];
  /** Player-facing restriction text derived from the physical projection. */
  readonly blockedReasons?: readonly string[];
}

/** Discriminated union of all preview kinds. */
export type ICommandPreview =
  | IMovementCommandPreview
  | IWeaponAttackCommandPreview
  | IPhysicalAttackCommandPreview;

/**
 * Side-effect contract returned by `command.commit(state)`. Command
 * surfaces dispatch the underlying `actionId` through the existing
 * `onAction(actionId, payload?)` channel; the `engineMutation` is
 * reserved for the future direct-dispatch refactor.
 */
export interface ICommandCommitResult {
  /** Action id forwarded to `onAction` for the existing engine plumbing. */
  readonly actionId: string;
  /** Optional structured payload for downstream engine handlers. */
  readonly payload?: Readonly<Record<string, unknown>>;
}

/** Structured command payload forwarded alongside legacy action ids. */
export type TacticalActionPayload = ICommandCommitResult['payload'];

/** Dispatch callback shared by the dock, context menus, and host layout. */
export type TacticalActionHandler = (
  actionId: string,
  payload?: TacticalActionPayload,
) => void;

/**
 * The core command shape — the UI adapter over an engine action.
 *
 * Adapter authors should keep `availability` PURE: same input ->
 * same output, no store reads, no engine mutation. The registry calls
 * it on every relevant render to keep dock tooltips fresh.
 */
export interface ITacticalCommand {
  /** Stable id (e.g. "movement.walk", "weapon.fire-volley"). */
  readonly id: string;
  /** Category for dock grouping + context-menu filtering. */
  readonly category: TacticalCommandCategory;
  /** Player-facing label ("Walk", "Fire Volley", "End Phase"). */
  readonly label: string;
  /** Optional icon identifier (matches icon registry; today: opaque string). */
  readonly icon?: string;
  /** Optional hotkey hint shown in tooltip ("Space", "Ctrl+M"). */
  readonly hotkey?: string;
  /**
   * Phases in which the command MAY appear. Outside these phases the
   * registry filters it out entirely (no disabled-with-reason).
   */
  readonly phaseConstraints: readonly GamePhase[];
  /**
   * Pure availability check. Returns either available:true or
   * available:false + reason string for disabled-with-reason rendering.
   */
  availability(ctx: ITacticalCommandContext): CommandAvailability;
  /**
   * Optional preview builder. Returns the preview payload for the
   * given context, or `null` when no preview applies (e.g. End Phase
   * has no preview). Pure with respect to context.
   */
  preview?(ctx: ITacticalCommandContext): ICommandPreview | null;
  /**
   * Compute the engine-dispatch payload at commit time. Pure — does
   * NOT touch the store directly. The dock takes the returned
   * `actionId` and optional `payload` and routes them through `onAction`.
   */
  commit(ctx: ITacticalCommandContext): ICommandCommitResult;
  /**
   * True if the command must show an explicit confirm step before
   * `commit` fires. Used for irreversible actions (charge, DFA,
   * end phase with unresolved attacks).
   */
  readonly requiresConfirmation: boolean;
  /** True if the command can be undone after commit. */
  readonly undoable: boolean;
  /**
   * True if the command targets an enemy unit. Drives token context
   * menu inclusion when the player right-clicks an enemy token.
   */
  readonly targetsEnemy?: boolean;
  /**
   * True if the command targets a hex (not a unit). Drives hex
   * context menu inclusion.
   */
  readonly targetsHex?: boolean;
}

/**
 * Tooltip / detail-pane content derived from a command's availability
 * + hotkey + label. Pure helper for `CommandTooltip` so the same
 * formatting rules apply to dock and menu surfaces.
 */
export interface ICommandTooltip {
  readonly label: string;
  readonly hotkey?: string;
  readonly disabledReason?: string;
}

/**
 * Pure tooltip builder — combines label, hotkey, and (if any)
 * availability reason. Centralised so the dock, the token menu, and
 * the hex menu render identical tooltip surfaces for the same command.
 */
export function buildCommandTooltip(
  command: ITacticalCommand,
  availability: CommandAvailability,
): ICommandTooltip {
  return {
    label: command.label,
    hotkey: command.hotkey,
    disabledReason: availability.available ? undefined : availability.reason,
  };
}

/**
 * Filter a list of commands by current phase. Used at registry
 * construction time so the dock and context menus see the same
 * pre-filtered set.
 */
export function filterCommandsByPhase(
  commands: readonly ITacticalCommand[],
  phase: GamePhase,
): readonly ITacticalCommand[] {
  return commands.filter((c) => c.phaseConstraints.includes(phase));
}
