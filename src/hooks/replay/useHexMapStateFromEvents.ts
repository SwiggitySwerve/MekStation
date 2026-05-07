/**
 * useHexMapStateFromEvents — pure projection from typed `IGameEvent` log
 * to `<HexMapDisplay>` state.
 *
 * Per `add-replay-viewer-from-ndjson` (combat-analytics delta —
 * "Replay State-From-Events Reducer Contract"): walks `events` in
 * monotonic `sequence` order up to and including the highest event with
 * `event.sequence <= currentSequence`, applying the eight covered
 * on-map event families (`GameCreated`, `MovementDeclared`,
 * `DamageApplied`, `LocationDestroyed`, `TransferDamage`,
 * `UnitDestroyed`, `UnitFell` / `UnitStood`, `HeatGenerated` /
 * `HeatDissipated`, `PilotHit`). All other event types pass through
 * silently.
 *
 * The reducer is a pure function — no I/O, no side effects, no React
 * refs. Memoized on `[events, currentSequence]` so re-renders that do
 * not change the cursor reuse the prior projection.
 *
 * Token construction reads `IGameUnit.unitType` and dispatches to the
 * matching `IUnitToken` variant constructor. Defaults are chosen so a
 * pre-`MovementDeclared` token still renders cleanly (origin position,
 * `Facing.North`, no sprite props → fallback medium-humanoid silhouette
 * for mechs).
 *
 * @spec openspec/changes/add-replay-viewer-from-ndjson/specs/combat-analytics/spec.md
 */

import { useMemo } from 'react';

import type {
  IAerospaceToken,
  IBattleArmorToken,
  IComponentDestroyedPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameCreatedPayload,
  IGameEvent,
  IGameUnit,
  IHeatPayload,
  IHexCoordinate,
  IHexTerrain,
  IInfantryToken,
  ILocationDestroyedPayload,
  IMechToken,
  IMovementDeclaredPayload,
  IPilotHitPayload,
  IProtoMechToken,
  ITransferDamagePayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IUnitStoodPayload,
  IUnitToken,
  IVehicleToken,
} from '@/types/gameplay';
import type {
  ArmorPipState,
  BipedPipLocation,
  PipLocationState,
  QuadPipLocation,
} from '@/types/gameplay/UnitSpriteTypes';

import {
  Facing,
  GameEventType,
  GameSide,
  TokenUnitType,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

// =============================================================================
// Public types
// =============================================================================

/**
 * Output shape of the reducer — matches the props `<HexMapDisplay>`
 * consumes directly. Page wiring forwards the three fields onto the
 * map without further projection.
 */
export interface ReplayHexMapState {
  readonly tokens: readonly IUnitToken[];
  readonly hexTerrain: readonly IHexTerrain[];
  readonly mapRadius: number;
}

// =============================================================================
// Internal accumulator shape
// =============================================================================

/**
 * Internal per-unit accumulator carried during the walk. Stays purely
 * local — only the public `IUnitToken` projection escapes the reducer.
 *
 * `damagedLocations` is informational bookkeeping for follow-on
 * record-sheet rendering (out of scope for this PR — only `isDestroyed`
 * flips in this PR per the spec scope).
 */
interface UnitAccumulator {
  readonly unitId: string;
  readonly name: string;
  readonly side: IGameUnit['side'];
  readonly unitType: TokenUnitType;
  position: IHexCoordinate;
  facing: Facing;
  isDestroyed: boolean;
  prone: boolean;
  currentHeat: number;
  pilotWounds: number;
  damagedLocations: ReadonlySet<string>;
  /**
   * Per-location armor-pip state. Populated lazily on the first
   * `ComponentDestroyed` / `CriticalHitResolved` event for the unit, and
   * only on Mech archetype tokens. Other unit types ignore the field.
   *
   * Per `add-replay-timeline-markers` (combat-analytics delta — Replay
   * State-From-Events Reducer Contract).
   */
  armorPipState?: ArmorPipState;
  // Optional per-type passthrough fields — populated only for variants
  // that need them. Stored as a loosely-typed bag because the reducer
  // doesn't mutate them after seeding from `GameCreated`.
  perType?: {
    altitude?: number;
    trooperCount?: number;
    infantryCount?: number;
    platoonCount?: number;
    protoCount?: number;
    isGlider?: boolean;
    hasMainGun?: boolean;
  };
}

// =============================================================================
// Token construction from IGameUnit
// =============================================================================

/**
 * Pick the matching `TokenUnitType` for a construction-side `UnitType`.
 * Mirrors the `unitStateToToken` switch but reads from the construction
 * `unitType` rather than from a `combatState` envelope (which the
 * NDJSON-replay flow does not carry).
 */
function tokenTypeFor(unitType: UnitType | undefined): TokenUnitType {
  switch (unitType) {
    case UnitType.AEROSPACE:
    case UnitType.CONVENTIONAL_FIGHTER:
    case UnitType.SMALL_CRAFT:
    case UnitType.DROPSHIP:
    case UnitType.JUMPSHIP:
    case UnitType.WARSHIP:
    case UnitType.SPACE_STATION:
      return TokenUnitType.Aerospace;
    case UnitType.PROTOMECH:
      return TokenUnitType.ProtoMech;
    case UnitType.BATTLE_ARMOR:
      return TokenUnitType.BattleArmor;
    case UnitType.INFANTRY:
      return TokenUnitType.Infantry;
    case UnitType.VEHICLE:
    case UnitType.VTOL:
      return TokenUnitType.Vehicle;
    case UnitType.BATTLEMECH:
    case UnitType.OMNIMECH:
    case UnitType.INDUSTRIALMECH:
    default:
      // Default to Mech for legacy callers that omit `unitType`. Matches
      // `unitStateToToken`'s safe-default branch.
      return TokenUnitType.Mech;
  }
}

/**
 * Generate a short token designation from the unit name. Mirrors
 * `unitStateToToken.designation` so token captions stay visually
 * identical across the live tactical map and the replay view.
 */
function designationFor(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((word) => (word.length > 0 ? word[0] : ''))
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

/**
 * Seed the per-unit accumulator from a `GameCreated` payload entry.
 * Position defaults to origin; the first `MovementDeclared` corrects
 * it. Facing defaults to North; same correction path.
 */
function seedAccumulator(unit: IGameUnit): UnitAccumulator {
  const tokenType = tokenTypeFor(unit.unitType);
  const acc: UnitAccumulator = {
    unitId: unit.id,
    name: unit.name,
    side: unit.side,
    unitType: tokenType,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isDestroyed: false,
    prone: false,
    currentHeat: 0,
    pilotWounds: 0,
    damagedLocations: new Set<string>(),
  };

  // Per-type passthroughs seeded from construction blocks when present.
  // Defaults below match `unitStateToToken` — destroyed === 0 alive on
  // protomechs, infantry / BA fall back to 1, aerospace altitude 0.
  switch (tokenType) {
    case TokenUnitType.Aerospace:
      acc.perType = {
        altitude: unit.aerospaceInit?.altitude ?? 0,
      };
      break;
    case TokenUnitType.BattleArmor:
      acc.perType = {
        trooperCount: unit.battleArmorInit?.squadSize ?? 1,
      };
      break;
    case TokenUnitType.Infantry:
      acc.perType = {
        infantryCount: unit.infantryInit?.platoonStrength ?? 1,
        platoonCount: 1,
      };
      break;
    case TokenUnitType.ProtoMech:
      acc.perType = {
        protoCount: 1,
        isGlider: unit.protoMechInit?.chassisType === ProtoChassis.GLIDER,
        hasMainGun: unit.protoMechInit?.hasMainGun ?? false,
      };
      break;
    default:
      break;
  }

  return acc;
}

/**
 * Project the accumulator into the appropriate `IUnitToken` variant.
 * Mirrors the variant switch in `unitStateToToken` so the live
 * tactical-map renderer and the replay viewer paint the same token
 * shape.
 */
function accumulatorToToken(acc: UnitAccumulator): IUnitToken {
  const designation = designationFor(acc.name);
  const base = {
    unitId: acc.unitId,
    name: acc.name,
    side: acc.side,
    position: acc.position,
    facing: acc.facing,
    isSelected: false,
    isValidTarget: false,
    isActiveTarget: false,
    isDestroyed: acc.isDestroyed,
    designation,
  } as const;

  switch (acc.unitType) {
    case TokenUnitType.Aerospace: {
      const token: IAerospaceToken = {
        ...base,
        unitType: TokenUnitType.Aerospace,
        altitude: acc.perType?.altitude ?? 0,
      };
      return token;
    }
    case TokenUnitType.Vehicle: {
      const token: IVehicleToken = {
        ...base,
        unitType: TokenUnitType.Vehicle,
      };
      return token;
    }
    case TokenUnitType.BattleArmor: {
      const token: IBattleArmorToken = {
        ...base,
        unitType: TokenUnitType.BattleArmor,
        trooperCount: acc.perType?.trooperCount ?? 1,
      };
      return token;
    }
    case TokenUnitType.Infantry: {
      const token: IInfantryToken = {
        ...base,
        unitType: TokenUnitType.Infantry,
        infantryCount: acc.perType?.infantryCount ?? 1,
        platoonCount: acc.perType?.platoonCount ?? 1,
      };
      return token;
    }
    case TokenUnitType.ProtoMech: {
      const token: IProtoMechToken = {
        ...base,
        unitType: TokenUnitType.ProtoMech,
        protoCount: acc.isDestroyed ? 0 : (acc.perType?.protoCount ?? 1),
        isGlider: acc.perType?.isGlider ?? false,
        hasMainGun: acc.perType?.hasMainGun ?? false,
      };
      return token;
    }
    case TokenUnitType.Mech:
    default: {
      // `armorPipState` is the only optional field forwarded from the
      // accumulator; populated by the `ComponentDestroyed` /
      // `CriticalHitResolved` reducer arms. Absent → `<HexMapDisplay>`
      // renders the fresh-off-the-lot pip ring.
      const token: IMechToken = {
        ...base,
        unitType: TokenUnitType.Mech,
        ...(acc.armorPipState !== undefined && {
          armorPipState: acc.armorPipState,
        }),
      };
      return token;
    }
  }
}

// =============================================================================
// Armor-pip state projection (per add-replay-timeline-markers)
// =============================================================================

/**
 * Components considered "internal" for armor-pip transitions. When a
 * `ComponentDestroyed` / `CriticalHitResolved` carries one of these
 * `componentType` values, the affected location's pip state advances
 * past `'partial'` straight into `'structure'` (or `'destroyed'` if
 * `LocationDestroyed` already fired). Mirrors MegaMek's hit-location
 * crit table.
 */
const INTERNAL_COMPONENT_TYPES: ReadonlySet<string> = new Set([
  'engine',
  'gyro',
  'weapon',
  'actuator',
  'heat_sink',
  'cockpit',
  'sensor',
  'life_support',
  'jump_jet',
  'ammo',
]);

/**
 * Map the runner's 2-letter MegaMek location codes to the camelCase
 * `BipedPipLocation` keys used by `ArmorPipState`. Returns `null` for
 * unrecognized codes so the caller can no-op without throwing.
 */
function bipedLocationFromCode(code: string): BipedPipLocation | null {
  switch (code) {
    case 'HD':
      return 'head';
    case 'CT':
      return 'centerTorso';
    case 'LT':
      return 'leftTorso';
    case 'RT':
      return 'rightTorso';
    case 'LA':
      return 'leftArm';
    case 'RA':
      return 'rightArm';
    case 'LL':
      return 'leftLeg';
    case 'RL':
      return 'rightLeg';
    default:
      return null;
  }
}

/**
 * Same translation for quad mechs. Quad legs split front/rear so the
 * runner emits `FLL` / `FRL` / `RLL` / `RRL` plus the shared `HD` and
 * `CT` codes. Returns `null` for unrecognized codes.
 */
function quadLocationFromCode(code: string): QuadPipLocation | null {
  switch (code) {
    case 'HD':
      return 'head';
    case 'CT':
      return 'centerTorso';
    case 'FLL':
      return 'frontLeftLeg';
    case 'FRL':
      return 'frontRightLeg';
    case 'RLL':
      return 'rearLeftLeg';
    case 'RRL':
      return 'rearRightLeg';
    default:
      return null;
  }
}

/**
 * Build a fresh `ArmorPipState` for the given Mech accumulator with
 * every location set to `'full'`. Picks the archetype based on the
 * unit's chassis flags — quads use the 6-key quad layout, LAMs use the
 * humanoid 8-key layout under the `'lam'` archetype, and everything
 * else defaults to `'humanoid'`.
 *
 * Note: the reducer doesn't have unit-record-level access to `isQuad`
 * or `isLAM` from the construction layer (the `IGameUnit` shape is
 * intentionally light), so we default to `'humanoid'` here. Quad and
 * LAM archetypes can be unlocked later if `IGameUnit` gains the flag.
 * For now, the runner emits 2-letter biped codes for all Mech types
 * including quads — `quadLocationFromCode` is wired but unreachable
 * via the runner today.
 */
function emptyArmorPipState(): ArmorPipState {
  const fullLocations: Record<BipedPipLocation, PipLocationState> = {
    head: 'full',
    centerTorso: 'full',
    leftTorso: 'full',
    rightTorso: 'full',
    leftArm: 'full',
    rightArm: 'full',
    leftLeg: 'full',
    rightLeg: 'full',
  };
  return {
    archetype: 'humanoid',
    locations: fullLocations,
  };
}

/**
 * Apply a `ComponentDestroyed` or `CriticalHitResolved` event to the
 * accumulator's `armorPipState`. Pure — returns the next state without
 * mutating the input. The caller assigns the result back to the
 * accumulator.
 *
 * Transition rules (per `add-replay-timeline-markers` spec delta):
 *   1. If `LocationDestroyed` already fired on this location (via
 *      `damagedLocations`), the pip transitions to `'destroyed'`.
 *   2. Else if `componentType` is internal, the pip transitions to
 *      `'structure'`.
 *   3. Else (external component, e.g. armor), the pip transitions to
 *      `'partial'` only if it was `'full'` (downgrades stick — never
 *      regress from `'structure'` to `'partial'`).
 */
function applyComponentDestroyedToPips(
  prev: ArmorPipState | undefined,
  locationCode: string,
  componentType: string,
  locationAlreadyDestroyed: boolean,
): ArmorPipState | undefined {
  // Lazily allocate the pip state on first damage. If we can't resolve
  // the location code, return `prev` unchanged — unrecognized codes
  // pass through silently per the spec contract.
  const base = prev ?? emptyArmorPipState();
  if (base.archetype === 'quad') {
    const key = quadLocationFromCode(locationCode);
    if (key === null) return prev;
    const current = base.locations[key];
    const next = nextPipState(current, componentType, locationAlreadyDestroyed);
    if (next === current) return prev;
    return {
      archetype: 'quad',
      locations: { ...base.locations, [key]: next },
    };
  }
  // Humanoid + LAM share the 8-key biped layout.
  const key = bipedLocationFromCode(locationCode);
  if (key === null) return prev;
  const current = base.locations[key];
  const next = nextPipState(current, componentType, locationAlreadyDestroyed);
  if (next === current) return prev;
  return {
    archetype: base.archetype,
    locations: { ...base.locations, [key]: next },
  };
}

/**
 * Compute the next pip state for one location given the current state,
 * the component type, and whether `LocationDestroyed` already fired.
 * Returns the unchanged input if no transition applies (e.g. already
 * destroyed and a follow-on event arrives).
 */
function nextPipState(
  current: PipLocationState,
  componentType: string,
  locationAlreadyDestroyed: boolean,
): PipLocationState {
  if (current === 'destroyed' || current === 'missing') return current;
  if (locationAlreadyDestroyed) return 'destroyed';
  if (INTERNAL_COMPONENT_TYPES.has(componentType)) return 'structure';
  // External component damage — only downgrade `'full' → 'partial'`.
  // Do not regress from `'structure'` to `'partial'`.
  if (current === 'full') return 'partial';
  return current;
}

// =============================================================================
// Reducer walk
// =============================================================================

/**
 * Walk events in sequence order up to `currentSequence` and project
 * the result into `ReplayHexMapState`. Pure function — see
 * `useHexMapStateFromEvents` for the React-memoized wrapper.
 *
 * Exported separately from the hook for direct use in unit tests so
 * test runs can assert on the projection without rendering a React
 * tree.
 */
export function deriveHexMapStateFromEvents(
  events: readonly IGameEvent[],
  currentSequence: number,
): ReplayHexMapState {
  // Per-unit accumulator keyed on `unitId`. Map preserves insertion
  // order so the projected `tokens` array order matches the unit list
  // ordering from `GameCreated.payload.units`.
  const accumulators = new Map<string, UnitAccumulator>();
  let mapRadius = 0;

  // ---------------------------------------------------------------------------
  // Lossy fallback for legacy NDJSON files predating
  // `emit-game-created-from-runner` (PR #542). Per the OMO Council
  // synthesis: the headless `SimulationRunner` did not historically emit
  // `GameCreated`, so existing `simulation-reports/games/<ts>/*.jsonl`
  // archives have no seed event for the reducer to consume. Without
  // this fallback, the reducer's `tokens` array stays empty and the
  // hex map renders nothing for those legacy files.
  //
  // Strategy: if no `GameCreated` event is present in the input, walk
  // the visible-up-to-cursor slice and synthesize Mech-default
  // accumulators for every unique `actorId` / `payload.unitId` we
  // encounter. Names default to the id; side is derived from the id
  // prefix (`player-` / `opponent-`); position defaults to origin and
  // gets corrected by the first `MovementDeclared` for that unit. This
  // is intentionally lossy — full visual fidelity comes from re-running
  // the swarm post-#542. The fallback exists so the smoke-test fixture
  // and any pre-fix archive remain usable.
  // ---------------------------------------------------------------------------
  const hasGameCreated = events.some(
    (e) => e.type === GameEventType.GameCreated,
  );
  if (!hasGameCreated && events.length > 0) {
    const discoveredUnits = new Map<string, IGameUnit>();
    // Walk only the events at or before the cursor so backward seek
    // doesn't manufacture units that haven't appeared yet.
    for (const event of events) {
      if (event.sequence > currentSequence) break;
      const ids: string[] = [];
      if (event.actorId !== undefined) ids.push(event.actorId);
      const payloadUnitId = (event.payload as { unitId?: string }).unitId;
      if (payloadUnitId !== undefined) ids.push(payloadUnitId);
      for (const id of ids) {
        if (discoveredUnits.has(id)) continue;
        // Derive side from the runner's slot-id convention. Unknown
        // prefixes (test fixtures with synthetic ids) default to
        // Player to keep rendering deterministic.
        const side = id.startsWith('opponent-')
          ? GameSide.Opponent
          : GameSide.Player;
        discoveredUnits.set(id, {
          id,
          name: id,
          side,
          unitRef: id,
          pilotRef: `synthetic-${id}`,
          gunnery: 4,
          piloting: 5,
        });
      }
    }
    // Iterate via forEach to dodge `MapIterator` downlevelIteration
    // requirement on the project's ES5 target.
    discoveredUnits.forEach((unit) => {
      accumulators.set(unit.id, seedAccumulator(unit));
    });
    // Map radius is unrecoverable from events alone — fall back to a
    // generous default so the map still renders. The page can override
    // via prop if it knows the radius from another source.
    mapRadius = 17;
    if (typeof console !== 'undefined' && discoveredUnits.size > 0) {
      // Single console.warn signals that this code path activated, so
      // future regressions where #542 stops emitting GameCreated don't
      // get masked by the fallback.
      console.warn(
        `[useHexMapStateFromEvents] No GameCreated event found; ` +
          `synthesized ${discoveredUnits.size} Mech-default tokens from ` +
          `actorIds. Re-run the swarm post-#542 for full token fidelity.`,
      );
    }
  }

  for (const event of events) {
    if (event.sequence > currentSequence) {
      break;
    }

    switch (event.type) {
      case GameEventType.GameCreated: {
        const payload = event.payload as IGameCreatedPayload;
        mapRadius = payload.config.mapRadius;
        accumulators.clear();
        for (const unit of payload.units) {
          accumulators.set(unit.id, seedAccumulator(unit));
        }
        break;
      }
      case GameEventType.MovementDeclared: {
        const payload = event.payload as IMovementDeclaredPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.position = payload.to;
          acc.facing = payload.facing;
        }
        break;
      }
      case GameEventType.DamageApplied: {
        const payload = event.payload as IDamageAppliedPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          if (payload.locationDestroyed === true) {
            const next = new Set(acc.damagedLocations);
            next.add(payload.location);
            acc.damagedLocations = next;
            if (payload.location === 'CT') {
              acc.isDestroyed = true;
            }
          }
        }
        break;
      }
      case GameEventType.LocationDestroyed: {
        const payload = event.payload as ILocationDestroyedPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          const next = new Set(acc.damagedLocations);
          next.add(payload.location);
          acc.damagedLocations = next;
          if (payload.location === 'CT') {
            acc.isDestroyed = true;
          }
        }
        break;
      }
      case GameEventType.TransferDamage: {
        const payload = event.payload as ITransferDamagePayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          const next = new Set(acc.damagedLocations);
          next.add(payload.fromLocation);
          acc.damagedLocations = next;
        }
        break;
      }
      case GameEventType.UnitDestroyed: {
        const payload = event.payload as IUnitDestroyedPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.isDestroyed = true;
        }
        break;
      }
      case GameEventType.UnitFell: {
        const payload = event.payload as IUnitFellPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.prone = true;
        }
        break;
      }
      case GameEventType.UnitStood: {
        const payload = event.payload as IUnitStoodPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.prone = false;
        }
        break;
      }
      case GameEventType.HeatGenerated:
      case GameEventType.HeatDissipated: {
        const payload = event.payload as IHeatPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.currentHeat = payload.newTotal;
        }
        break;
      }
      case GameEventType.PilotHit: {
        const payload = event.payload as IPilotHitPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined) {
          acc.pilotWounds = payload.totalWounds;
        }
        break;
      }
      case GameEventType.ComponentDestroyed: {
        const payload = event.payload as IComponentDestroyedPayload;
        const acc = accumulators.get(payload.unitId);
        // armorPipState is Mech-only — non-Mech units pass through
        // silently per the spec contract.
        if (acc !== undefined && acc.unitType === TokenUnitType.Mech) {
          const locationAlreadyDestroyed = acc.damagedLocations.has(
            payload.location,
          );
          acc.armorPipState = applyComponentDestroyedToPips(
            acc.armorPipState,
            payload.location,
            payload.componentType,
            locationAlreadyDestroyed,
          );
        }
        break;
      }
      case GameEventType.CriticalHitResolved: {
        const payload = event.payload as ICriticalHitResolvedPayload;
        const acc = accumulators.get(payload.unitId);
        if (acc !== undefined && acc.unitType === TokenUnitType.Mech) {
          const locationAlreadyDestroyed = acc.damagedLocations.has(
            payload.location,
          );
          acc.armorPipState = applyComponentDestroyedToPips(
            acc.armorPipState,
            payload.location,
            payload.componentType,
            locationAlreadyDestroyed,
          );
        }
        break;
      }
      default:
        // Out-of-band event types pass through silently. The timeline
        // scrubber still sees them; the reducer simply does not mutate
        // the map state on them. Per the spec scope, only the covered
        // families above can change `tokens` / `hexTerrain` /
        // `mapRadius`.
        break;
    }
  }

  // Project accumulators to the public `IUnitToken` shape. The map's
  // insertion order is preserved by `Array.from(map.values())`, which
  // matches the `GameCreated.payload.units` ordering.
  const tokens: IUnitToken[] = Array.from(accumulators.values()).map(
    accumulatorToToken,
  );

  return {
    tokens,
    // Terrain reconstruction from events is out of scope for this PR
    // (engine emits no terrain-mutation events today). HexMapDisplay's
    // Clear-default rendering applies when `hexTerrain` is empty.
    hexTerrain: [],
    mapRadius,
  };
}

// =============================================================================
// React hook wrapper
// =============================================================================

/**
 * React hook wrapper around `deriveHexMapStateFromEvents`. Memoizes on
 * `[events, currentSequence]` so re-renders that do not change the
 * cursor reuse the prior projection.
 *
 * @example
 * ```tsx
 * const { tokens, hexTerrain, mapRadius } = useHexMapStateFromEvents(
 *   events,
 *   replay.currentSequence,
 * );
 * return (
 *   <HexMapDisplay
 *     tokens={tokens}
 *     hexTerrain={hexTerrain}
 *     radius={mapRadius}
 *     selectedHex={null}
 *     events={events}
 *   />
 * );
 * ```
 */
export function useHexMapStateFromEvents(
  events: readonly IGameEvent[],
  currentSequence: number,
): ReplayHexMapState {
  return useMemo(
    () => deriveHexMapStateFromEvents(events, currentSequence),
    [events, currentSequence],
  );
}
