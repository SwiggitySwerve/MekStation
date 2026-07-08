/**
 * Session lifecycle helpers for `useGameplayStore`.
 *
 * Pulled out of the main store file so the per-file LOC budget stays
 * under the lint warning threshold. Each function takes Zustand's
 * `set` / `get` directly (typed against a minimal slice of the
 * gameplay state) so the store can compose them as thin pass-throughs.
 *
 * Behavior is byte-for-byte identical to the original inline
 * implementation.
 */

import type { InteractiveSession } from '@/engine/GameEngine';
import type { IWeapon } from '@/simulation/ai/types';

import {
  createDemoHeatSinks,
  createDemoMaxArmor,
  createDemoMaxStructure,
  createDemoPilotNames,
  createDemoSession,
  createDemoUnitSpas,
  createDemoWeapons,
} from '@/__fixtures__/gameplay';
import { recoverInteractiveSession } from '@/engine/InteractiveSession';
import {
  INTERACTIVE_SESSION_STORAGE_UNAVAILABLE_MESSAGE,
  InteractiveSessionRecoveryCorruptError,
  InteractiveSessionRecoveryNotFoundError,
} from '@/engine/InteractiveSession.persistence';
import { MatchLogStorageUnavailableError } from '@/lib/p2p/matchLogStorage';
import {
  GamePhase,
  IGameSession,
  IGameplayUIState,
  IPilotSpaSummary,
  IWeaponStatus,
} from '@/types/gameplay';

import { InteractivePhase } from './useGameplayStore.helpers';

/**
 * Per-session UI flag — when set, the page renders the spectator
 * playback bar instead of the action panel. Lives next to the session
 * fields so all "what view should I render?" inputs are co-located.
 */
export interface SpectatorMode {
  enabled: boolean;
  playing: boolean;
  speed: 1 | 2 | 4;
}

/**
 * Minimal slice of the gameplay store the session-lifecycle helpers
 * need. Listing the fields explicitly here lets us tighten the
 * `set` / `get` signatures so a caller can't accidentally widen the
 * surface area we touch.
 */
interface SessionSlice {
  session: IGameSession | null;
  interactiveSession: InteractiveSession | null;
  interactivePhase: InteractivePhase;
  spectatorMode: SpectatorMode | null;
  isLoading: boolean;
  error: string | null;
  unitWeapons: Record<string, readonly IWeaponStatus[]>;
  maxArmor: Record<string, Record<string, number>>;
  maxStructure: Record<string, Record<string, number>>;
  pilotNames: Record<string, string>;
  heatSinks: Record<string, number>;
  unitSpas: Record<string, readonly IPilotSpaSummary[]>;
  ui: IGameplayUIState;
  validMovementHexes: readonly { q: number; r: number }[];
  validTargetIds: readonly string[];
  hitChance: number | null;
}

type SetFn = {
  (partial: Partial<SessionSlice>): void;
  (fn: (state: SessionSlice) => Partial<SessionSlice>): void;
};
type GetFn = () => SessionSlice;
type RecoverInteractiveSessionFn = (
  sessionId: string,
) => Promise<InteractiveSession>;

/**
 * Wire up a freshly minted demo session in the store. Replaces
 * weapons / armor / pilot / heat / SPA fixtures atomically so consumers
 * never see a half-populated state.
 */
export function createDemoSessionLogic(set: SetFn): void {
  const session = createDemoSession();
  set({
    session,
    unitWeapons: createDemoWeapons(),
    maxArmor: createDemoMaxArmor(),
    maxStructure: createDemoMaxStructure(),
    pilotNames: createDemoPilotNames(),
    heatSinks: createDemoHeatSinks(),
    unitSpas: createDemoUnitSpas(),
    isLoading: false,
    error: null,
  });
}

/**
 * Async session loader. Currently only the `'demo'` id is recognised;
 * unknown ids surface as an error in `state.error`. Skips the load when
 * the requested session is already in memory (idempotent).
 */
export async function loadSessionLogic(
  sessionId: string,
  get: GetFn,
  set: SetFn,
  loadDemo: () => void,
  recoverSession: RecoverInteractiveSessionFn = recoverInteractiveSession,
): Promise<void> {
  // If session is already loaded (e.g. from setSession via auto-resolve), skip
  const existing = get().session;
  if (existing && existing.id === sessionId) {
    set({ isLoading: false, error: null });
    return;
  }

  set({ isLoading: true, error: null });
  try {
    if (sessionId === 'demo') {
      loadDemo();
    } else {
      const recovered = await recoverSession(sessionId);
      setInteractiveSessionLogic(recovered, set);
    }
  } catch (err) {
    set({
      error: getLoadSessionErrorMessage(err),
      isLoading: false,
    });
  }
}

function getLoadSessionErrorMessage(error: unknown): string {
  if (error instanceof InteractiveSessionRecoveryNotFoundError) {
    return error.message;
  }
  if (error instanceof InteractiveSessionRecoveryCorruptError) {
    return error.message;
  }
  if (error instanceof MatchLogStorageUnavailableError) {
    return INTERACTIVE_SESSION_STORAGE_UNAVAILABLE_MESSAGE;
  }
  return error instanceof Error ? error.message : 'Failed to load session';
}

/**
 * Derive the record-sheet supplemental display maps (max armor /
 * structure, pilot names, heat-sink capacity) from a live session.
 *
 * Before this seam existed only the demo path populated these maps
 * (from `@/__fixtures__/gameplay`), so every REAL interactive session
 * rendered the unit card with 0/0 armor+structure, 'Unknown Pilot', and
 * the 10-sink default (re-audit UXF-06/DC-01). The GameCreated payload
 * units now carry `armorByLocation` / `structureByLocation` / `heatSinks`
 * (spliced from the adapted catalog units by
 * `gameUnitsWithAdaptedCombatSeeds`), which double as the display maxima —
 * construction values are the per-location caps regardless of current
 * damage, so this also holds for sessions recovered mid-battle.
 */
function deriveSupplementalDisplayData(
  interactiveSession: InteractiveSession,
): Pick<
  SessionSlice,
  'maxArmor' | 'maxStructure' | 'pilotNames' | 'heatSinks' | 'unitWeapons'
> {
  const session = interactiveSession.getSession();
  const maxArmor: Record<string, Record<string, number>> = {};
  const maxStructure: Record<string, Record<string, number>> = {};
  const pilotNames: Record<string, string> = {};
  const heatSinks: Record<string, number> = {};
  const unitWeapons: Record<string, readonly IWeaponStatus[]> = {};

  for (const unit of session.units) {
    if (unit.armorByLocation) {
      maxArmor[unit.id] = { ...unit.armorByLocation };
    }
    if (unit.structureByLocation) {
      maxStructure[unit.id] = { ...unit.structureByLocation };
    }
    // The quick-game builder stamps 'Unknown' when no pilot exists; skip it
    // so the record sheet's own 'Unknown Pilot' fallback stays the one voice.
    if (unit.pilotRef && unit.pilotRef !== 'Unknown') {
      pilotNames[unit.id] = unit.name;
    }
    const unitHeatSinks =
      session.currentState.units[unit.id]?.heatSinks ?? unit.heatSinks;
    if (unitHeatSinks !== undefined) {
      heatSinks[unit.id] = unitHeatSinks;
    }
    // Weapons come from the engine's cached per-unit catalog data — the same
    // arrays the resolvers use — so the record sheet's weapons table and the
    // valid-target derivation stop depending on demo fixtures (task #14).
    // Older mocks without the accessor keep the empty-map behavior.
    if (typeof interactiveSession.getUnitWeapons === 'function') {
      const engineWeapons = interactiveSession.getUnitWeapons(unit.id);
      if (engineWeapons.length > 0) {
        unitWeapons[unit.id] = engineWeapons.map(weaponStatusFromEngineWeapon);
      }
    }
  }

  return { maxArmor, maxStructure, pilotNames, heatSinks, unitWeapons };
}

// Known source location labels -> the snake_case keys the record sheet's
// location tables use (same normalization rule as the armor adapter).
function normalizeWeaponLocation(location: string | undefined): string {
  if (!location) return 'unknown';
  return location.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

/**
 * Project an engine `IWeapon` (simulation/AI shape) into the display
 * `IWeaponStatus` the record sheet renders. `firedThisTurn` starts false at
 * adoption; ammo counters are omitted (optional fields — the inline ammo
 * display falls back gracefully) because bin-level ammo lives on the unit
 * state, not the weapon.
 */
function weaponStatusFromEngineWeapon(weapon: IWeapon): IWeaponStatus {
  return {
    id: weapon.id,
    name: weapon.name,
    location: normalizeWeaponLocation(weapon.location),
    ...(weapon.mountingArc !== undefined
      ? { mountingArc: weapon.mountingArc }
      : {}),
    ...(weapon.mountingArcs !== undefined
      ? { mountingArcs: weapon.mountingArcs }
      : {}),
    ...(weapon.vehicleMountLocation !== undefined
      ? { vehicleMountLocation: weapon.vehicleMountLocation }
      : {}),
    ...(weapon.vehicleIsTurretMounted !== undefined
      ? { vehicleIsTurretMounted: weapon.vehicleIsTurretMounted }
      : {}),
    destroyed: weapon.destroyed ?? false,
    firedThisTurn: false,
    heat: weapon.heat,
    damage: weapon.damage,
    ranges: {
      short: weapon.shortRange,
      medium: weapon.mediumRange,
      long: weapon.longRange,
      ...(weapon.extremeRange !== undefined
        ? { extreme: weapon.extremeRange }
        : {}),
      ...(weapon.minRange > 0 ? { minimum: weapon.minRange } : {}),
    },
  };
}

/**
 * Adopt an interactive session into the store. Picks a sensible
 * starting `interactivePhase` based on the session's current phase
 * (Initiative -> AwaitPhaseStart; everything else defaults to SelectUnit
 * but lets the caller override later).
 */
export function setInteractiveSessionLogic(
  interactiveSession: InteractiveSession,
  set: SetFn,
): void {
  const session = interactiveSession.getSession();
  const phase = session.currentState.phase;

  let interactivePhase = InteractivePhase.SelectUnit;
  if (phase === GamePhase.Initiative) {
    interactivePhase = InteractivePhase.AwaitPhaseStart;
  }

  set({
    session,
    interactiveSession,
    interactivePhase,
    spectatorMode: null,
    isLoading: false,
    error: null,
    validMovementHexes: [],
    validTargetIds: [],
    hitChance: null,
    ...deriveSupplementalDisplayData(interactiveSession),
  });
}

/**
 * Adopt an interactive session into the store in spectator mode —
 * forces `interactivePhase` to AITurn so the UI renders the playback
 * bar instead of the action panel.
 */
export function setSpectatorModeLogic(
  interactiveSession: InteractiveSession,
  spectatorMode: SpectatorMode,
  set: SetFn,
): void {
  const session = interactiveSession.getSession();

  set({
    session,
    interactiveSession,
    interactivePhase: InteractivePhase.AITurn,
    spectatorMode,
    isLoading: false,
    error: null,
    ...deriveSupplementalDisplayData(interactiveSession),
  });
}
