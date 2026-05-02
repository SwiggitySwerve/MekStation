/**
 * Campaign Roster Store
 *
 * Per `canonicalize-unit-combat-state` PR-B: this store now holds only
 * the thin display projection (`IRosterUnitProjection`) for each unit.
 * Damage state, destroyed components, ammo, and end-of-battle heat live
 * on the canonical `ICampaign.unitCombatStates[unitId]` map owned by
 * `useCampaignStore`. UI consumers needing damage values SHALL read
 * canonical state via a `useShallow` selector — see
 * `RosterStateCards.tsx` and `CampaignDashboardPage.sections.tsx` for
 * the reference pattern.
 *
 * Sits alongside the main campaign store and manages the gameplay loop:
 * - Unit roster identity + display readiness (this store)
 * - Combat state (canonical, on `useCampaignStore.campaign.unitCombatStates`)
 * - Mission history with outcomes (this store)
 * - Damage carry-forward write-through (this store proxies into
 *   canonical state via `useCampaignStore.updateCampaign`)
 *
 * @see openspec/specs/campaign-unit-combat-state/spec.md
 * @see src/types/campaign/RosterUnitProjection.ts
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type {
  IDestroyedComponent,
  IUnitCombatState,
} from '@/types/campaign/UnitCombatState';

import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import {
  deriveRosterReadiness,
  type IRosterUnitProjection,
} from '@/types/campaign/RosterUnitProjection';

// =============================================================================
// Types
// =============================================================================

/** Readiness status for dashboard display */
export type UnitReadiness = 'Ready' | 'Damaged' | 'Destroyed';

/** Mission outcome record */
export interface ICampaignMissionRecord {
  readonly id: string;
  readonly missionNumber: number;
  readonly name: string;
  readonly result: 'victory' | 'defeat' | 'draw' | 'pending';
  readonly encounterId?: string;
  readonly gameSessionId?: string;
  readonly campaignId: string;
  readonly deployedUnitIds: readonly string[];
  readonly completedAt?: string;
  readonly turnsPlayed?: number;
}

/**
 * Serializable damage carry-forward payload from the game-session layer.
 *
 * Produced by `GameSessionPage.states.tsx` from `IUnitGameState` after
 * a battle completes. Consumed here to (a) refresh the roster
 * projection's `readiness` field and (b) write deltas into the canonical
 * `ICampaign.unitCombatStates` via `useCampaignStore.updateCampaign`.
 *
 * NOTE: The name retains the legacy `IUnitDamageState` label because two
 * other shapes share the name elsewhere
 * (`src/utils/gameplay/damage/types.ts`, `src/lib/combat/acar.ts`) and
 * this carry-forward shape has been the roster-store-local one all
 * along. The rename to a unique label is left to PR-C cleanup.
 */
export interface IUnitDamageState {
  readonly unitId: string;
  /** Per-location armor damage (points lost). */
  readonly armorDamage: Record<string, number>;
  /** Per-location structure damage (points lost). */
  readonly structureDamage: Record<string, number>;
  /** Destroyed component names (synthesized to IDestroyedComponent on write). */
  readonly destroyedComponents: string[];
  /** Is unit completely destroyed? */
  readonly destroyed: boolean;
}

// =============================================================================
// Store State
// =============================================================================

interface CampaignRosterState {
  /** Campaign ID this roster belongs to */
  campaignId: string | null;

  /**
   * Roster projection list — display identity + cached readiness.
   * Damage data lives on `ICampaign.unitCombatStates[unitId]`, NOT here.
   */
  units: IRosterUnitProjection[];

  /** Pilot roster for the campaign */
  pilots: ICampaignRosterEntry[];

  /** Mission history */
  missions: ICampaignMissionRecord[];

  /** Current active mission (if any) */
  activeMissionId: string | null;

  /** Mission counter */
  missionCount: number;
}

interface CampaignRosterActions {
  /** Initialize roster for a campaign */
  initRoster: (campaignId: string) => void;

  /** Add a unit to the roster */
  addUnit: (unit: IRosterUnitProjection) => void;

  /** Remove a unit from the roster */
  removeUnit: (unitId: string) => void;

  /** Add a pilot to the roster */
  addPilot: (pilot: ICampaignRosterEntry) => void;

  /** Remove a pilot from the roster */
  removePilot: (pilotId: string) => void;

  /** Assign a pilot to a unit */
  assignPilot: (unitId: string, pilotId: string) => void;

  /** Get unit readiness status */
  getUnitReadiness: (unitId: string) => UnitReadiness;

  /**
   * Get all units with their readiness already cached on the projection.
   * Returned shape matches `IRosterUnitProjection` (which itself carries
   * `readiness`) — preserved as a separate accessor for legacy callers
   * that explicitly typed the field as `Array<... & { readiness }>`.
   */
  getUnitsWithReadiness: () => IRosterUnitProjection[];

  /** Get deployable units (Ready or Damaged) */
  getDeployableUnits: () => IRosterUnitProjection[];

  /** Create a new mission record */
  createMission: (
    name: string,
    deployedUnitIds: string[],
    encounterId?: string,
  ) => string;

  /** Record mission outcome and apply damage */
  completeMission: (
    missionId: string,
    result: 'victory' | 'defeat' | 'draw',
    damageStates: IUnitDamageState[],
    gameSessionId?: string,
    turnsPlayed?: number,
  ) => void;

  /**
   * Apply damage carry-forward from battle results.
   *
   * Per PR-B: writes canonical combat-state deltas into
   * `useCampaignStore.campaign.unitCombatStates` and refreshes the
   * roster projection's `readiness` field. Does NOT store armor /
   * structure / destroyed-component lists on the projection itself
   * (that conflated shape was deleted with `ICampaignUnitState`).
   */
  applyDamageCarryForward: (damageStates: IUnitDamageState[]) => void;

  /** Get mission history */
  getMissionHistory: () => ICampaignMissionRecord[];

  /** Get the active mission */
  getActiveMission: () => ICampaignMissionRecord | null;

  /** Set active mission ID (when navigating to battle) */
  setActiveMission: (missionId: string | null) => void;

  /** Reset roster state */
  reset: () => void;
}

export type CampaignRosterStore = CampaignRosterState & CampaignRosterActions;

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build a fresh canonical combat state from a carry-forward payload.
 *
 * The carry-forward shape only carries deltas (damage points lost) and
 * a destroyed-flag, so we construct the canonical state by:
 * - Starting from any pre-existing canonical state (preserves accumulated
 *   destruction history across multiple battles).
 * - Subtracting reported damage from current armor / structure (clamped at
 *   zero to avoid negative values).
 * - Appending newly destroyed component names as `IDestroyedComponent`
 *   entries with synthesized `slot=-1` / `componentType='unknown'` —
 *   the carry-forward shape doesn't carry crit-slot detail, so the
 *   placeholder marks "destroyed at this matchId" for audit purposes.
 *   The canonical post-battle processor (the new path) writes proper
 *   `IDestroyedComponent` entries with full crit-slot data; this
 *   roster-store path is the legacy game-session bridge.
 * - Flipping `combatReady` to false when the payload reports the unit
 *   as destroyed.
 *
 * @param prior Existing canonical state for this unit, if any.
 * @param damage Carry-forward payload from the game session layer.
 * @param matchId Mission id used as `lastCombatOutcomeId` and on
 *   destroyed-component `destroyedAt`.
 * @returns A fresh `IUnitCombatState` ready to overwrite the entry on
 *   `ICampaign.unitCombatStates`.
 */
function applyDamageToCanonicalState(
  prior: IUnitCombatState | undefined,
  damage: IUnitDamageState,
  matchId: string,
): IUnitCombatState {
  // Start from prior canonical state (preserves multi-battle accumulation)
  // or seed an empty baseline for units with no prior state. The legacy
  // game-session bridge does not have construction max values handy, so
  // empty maps are the only safe baseline.
  const priorArmor = prior?.currentArmorPerLocation ?? {};
  const priorStructure = prior?.currentStructurePerLocation ?? {};
  const priorDestroyedComponents = prior?.destroyedComponents ?? [];
  const priorDestroyedLocations = prior?.destroyedLocations ?? [];

  // Apply armor deltas (clamp at zero — carry-forward damage values are
  // points-lost, not absolute remaining values).
  const nextArmor: Record<string, number> = { ...priorArmor };
  for (const [loc, dmg] of Object.entries(damage.armorDamage)) {
    const current = nextArmor[loc] ?? 0;
    nextArmor[loc] = Math.max(0, current - dmg);
  }

  // Same treatment for structure.
  const nextStructure: Record<string, number> = { ...priorStructure };
  for (const [loc, dmg] of Object.entries(damage.structureDamage)) {
    const current = nextStructure[loc] ?? 0;
    nextStructure[loc] = Math.max(0, current - dmg);
  }

  // Append newly destroyed components. Dedupe by name+matchId so the same
  // outcome applied twice won't double-grow the array — full slot+location
  // dedupe would require crit-slot info the carry-forward shape doesn't
  // carry.
  const seen = new Set(
    priorDestroyedComponents.map((c) => `${c.name}|${c.destroyedAt}`),
  );
  const nextDestroyedComponents: IDestroyedComponent[] = [
    ...priorDestroyedComponents,
  ];
  for (const name of damage.destroyedComponents) {
    const key = `${name}|${matchId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    nextDestroyedComponents.push({
      // Synthesized placeholder fields — the legacy bridge can't recover
      // crit-slot detail. Audit consumers reading `destroyedAt` get the
      // matchId; consumers needing slot-level detail should switch to the
      // canonical postBattleProcessor path.
      location: 'UNKNOWN',
      slot: -1,
      componentType: 'unknown',
      name,
      destroyedAt: matchId,
    });
  }

  return {
    unitId: damage.unitId,
    currentArmorPerLocation: nextArmor,
    currentStructurePerLocation: nextStructure,
    destroyedLocations: priorDestroyedLocations,
    destroyedComponents: nextDestroyedComponents,
    heatEnd: prior?.heatEnd ?? 0,
    ammoRemaining: prior?.ammoRemaining ?? {},
    combatReady: damage.destroyed ? false : (prior?.combatReady ?? true),
    lastCombatOutcomeId: matchId,
    lastUpdated: new Date().toISOString(),
  };
}

// =============================================================================
// Store
// =============================================================================

export const useCampaignRosterStore = create<CampaignRosterStore>()(
  persist(
    (set, get) => ({
      // Initial state
      campaignId: null,
      units: [],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,

      // ===================================================================
      // Roster Management
      // ===================================================================

      initRoster: (campaignId) => {
        set({
          campaignId,
          units: [],
          pilots: [],
          missions: [],
          activeMissionId: null,
          missionCount: 0,
        });
      },

      addUnit: (unit) => {
        set((state) => ({
          units: [...state.units, unit],
        }));
      },

      removeUnit: (unitId) => {
        set((state) => ({
          units: state.units.filter((u) => u.unitId !== unitId),
        }));
      },

      addPilot: (pilot) => {
        set((state) => ({
          pilots: [...state.pilots, pilot],
        }));
      },

      removePilot: (pilotId) => {
        set((state) => ({
          pilots: state.pilots.filter((p) => p.pilotId !== pilotId),
        }));
      },

      assignPilot: (unitId, pilotId) => {
        set((state) => ({
          units: state.units.map((u) =>
            u.unitId === unitId ? { ...u, pilotId } : u,
          ),
          pilots: state.pilots.map((p) =>
            p.pilotId === pilotId ? { ...p, assignedUnitId: unitId } : p,
          ),
        }));
      },

      // ===================================================================
      // Readiness
      // ===================================================================

      getUnitReadiness: (unitId) => {
        const unit = get().units.find((u) => u.unitId === unitId);
        if (!unit) return 'Destroyed';
        return unit.readiness;
      },

      getUnitsWithReadiness: () => {
        // The projection already carries `readiness`; surface as-is so
        // legacy callers that destructured `{ readiness, ...unit }` keep
        // working unchanged.
        return get().units;
      },

      getDeployableUnits: () => {
        return get().units.filter((u) => u.readiness !== 'Destroyed');
      },

      // ===================================================================
      // Mission Management
      // ===================================================================

      createMission: (name, deployedUnitIds, encounterId) => {
        const missionId = `mission-${generateId()}`;
        const { campaignId, missionCount } = get();

        const mission: ICampaignMissionRecord = {
          id: missionId,
          missionNumber: missionCount + 1,
          name,
          result: 'pending',
          encounterId,
          campaignId: campaignId ?? '',
          deployedUnitIds,
        };

        set((state) => ({
          missions: [...state.missions, mission],
          activeMissionId: missionId,
          missionCount: state.missionCount + 1,
        }));

        return missionId;
      },

      completeMission: (
        missionId,
        result,
        damageStates,
        gameSessionId,
        turnsPlayed,
      ) => {
        // Update mission record
        set((state) => ({
          missions: state.missions.map((m) =>
            m.id === missionId
              ? {
                  ...m,
                  result,
                  gameSessionId,
                  turnsPlayed,
                  completedAt: new Date().toISOString(),
                }
              : m,
          ),
          activeMissionId: null,
        }));

        // Apply damage carry-forward — proxies into canonical state
        // (`useCampaignStore.campaign.unitCombatStates`) AND refreshes
        // the projection's readiness field. See `applyDamageCarryForward`.
        get().applyDamageCarryForward(damageStates);
      },

      applyDamageCarryForward: (damageStates) => {
        // Step 1: refresh projection readiness in this store. Cached
        // readiness is what selectors render — source-of-truth derivation
        // happens via `deriveRosterReadiness` against canonical state
        // computed below.
        //
        // Step 2: write canonical combat-state deltas into the campaign
        // store. Imported lazily inside the body to avoid a top-level
        // circular import (the campaign store imports back from this
        // store for the personnel-derive path).
        //
        // The active mission id is the closest analog to a `matchId`
        // for the legacy bridge — it's what `createMission` minted when
        // the encounter started. Falls back to a synthesized id when
        // the bridge is invoked outside a mission flow (defensive only;
        // production callers always have an active mission).
        const matchId =
          get().activeMissionId ?? `legacy-bridge-${generateId()}`;

        // Lazy import to break circular dependency chain at module-init
        // time (useCampaignStore imports useCampaignRosterStore for the
        // personnel-derive path).
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useCampaignStore } = require('./useCampaignStore') as {
          useCampaignStore: () => {
            getState: () => {
              campaign: {
                unitCombatStates: Record<string, IUnitCombatState>;
              } | null;
              updateCampaign: (updates: {
                unitCombatStates: Record<string, IUnitCombatState>;
              }) => void;
            };
          };
        };
        const campaignStore = useCampaignStore();
        const campaign = campaignStore.getState().campaign;

        // Compute next canonical map from prior map + per-unit deltas.
        // Skip the canonical write entirely when no campaign is loaded —
        // tests / orphan flows still get the readiness refresh.
        if (campaign) {
          const priorMap = campaign.unitCombatStates;
          const nextMap: Record<string, IUnitCombatState> = { ...priorMap };
          for (const damage of damageStates) {
            nextMap[damage.unitId] = applyDamageToCanonicalState(
              priorMap[damage.unitId],
              damage,
              matchId,
            );
          }
          campaignStore.getState().updateCampaign({
            unitCombatStates: nextMap,
          });
        }

        // Step 1 (continued): refresh projection readiness based on the
        // damage payload. We compute this from the carry-forward delta
        // directly so the projection update doesn't depend on the
        // canonical write completing — keeps the two paths cleanly
        // independent.
        set((state) => {
          const updatedUnits = state.units.map((unit) => {
            const damage = damageStates.find((d) => d.unitId === unit.unitId);
            if (!damage) return unit;

            // Build a synthetic combat state shell to feed
            // `deriveRosterReadiness` — we don't need the canonical
            // state's full detail for the readiness derivation, just
            // `combatReady` + destroyed component count.
            const synthState: IUnitCombatState = {
              unitId: unit.unitId,
              currentArmorPerLocation: {},
              currentStructurePerLocation: {},
              destroyedLocations: [],
              destroyedComponents: damage.destroyedComponents.map((name) => ({
                location: 'UNKNOWN',
                slot: -1,
                componentType: 'unknown',
                name,
                destroyedAt: matchId,
              })),
              heatEnd: 0,
              ammoRemaining: {},
              combatReady: !damage.destroyed,
              lastCombatOutcomeId: matchId,
              lastUpdated: null,
            };

            const totalArmorDmg = Object.values(damage.armorDamage).reduce(
              (sum, v) => sum + v,
              0,
            );
            const totalStructDmg = Object.values(damage.structureDamage).reduce(
              (sum, v) => sum + v,
              0,
            );
            const tookDamage = totalArmorDmg > 0 || totalStructDmg > 0;

            // Derive readiness — when the unit is destroyed,
            // `deriveRosterReadiness` returns 'Destroyed' from
            // `combatReady=false`. When alive but with destroyed
            // components, it returns 'Damaged'. When alive without
            // destroyed components but with armor/structure damage, the
            // helper would return 'Ready' (since it can't see armor
            // deltas without a max-state companion) — bridge that gap
            // by checking damage totals here.
            let readiness = deriveRosterReadiness(synthState);
            if (readiness === 'Ready' && tookDamage) {
              readiness = 'Damaged';
            }

            return { ...unit, readiness };
          });

          return { units: updatedUnits };
        });
      },

      getMissionHistory: () => {
        return get().missions;
      },

      getActiveMission: () => {
        const { missions, activeMissionId } = get();
        if (!activeMissionId) return null;
        return missions.find((m) => m.id === activeMissionId) ?? null;
      },

      setActiveMission: (missionId) => {
        set({ activeMissionId: missionId });
      },

      reset: () => {
        set({
          campaignId: null,
          units: [],
          pilots: [],
          missions: [],
          activeMissionId: null,
          missionCount: 0,
        });
      },
    }),
    {
      name: 'campaign-roster-store',
      storage: createJSONStorage(() => clientSafeStorage),
    },
  ),
);
