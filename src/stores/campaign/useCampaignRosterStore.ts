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
 * Decomposition note: the type surface lives in
 * `campaignRosterStore.types.ts` and the pure helper functions in
 * `campaignRosterStore.helpers.ts` — this module keeps only the Zustand
 * store definition. Public names (`useCampaignRosterStore`,
 * `UnitReadiness`, `ICampaignMissionRecord`, `IUnitDamageState`,
 * `CampaignRosterStore`) are re-exported here so importers are unaffected.
 *
 * @see openspec/specs/campaign-unit-combat-state/spec.md
 * @see src/types/campaign/RosterUnitProjection.ts
 * @see ./campaignRosterStore.types.ts
 * @see ./campaignRosterStore.helpers.ts
 */

import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type StorageValue,
} from 'zustand/middleware';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { backfillLegacyRosterUnitRefs } from '@/lib/campaign/wizard/legacyRosterUnitBackfill';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

import type {
  CampaignRosterState,
  CampaignRosterStore,
  ICampaignMissionRecord,
} from './campaignRosterStore.types';

import {
  buildNextCombatStateMap,
  generateId,
  refreshUnitsReadiness,
} from './campaignRosterStore.helpers';
import { getCampaignStoreForRoster } from './campaignStoreAccessor';

const CAMPAIGN_ROSTER_STORE_VERSION = 3;

// Re-export the public type surface so existing importers
// (`GameSessionPage.states.tsx`, `CampaignDashboardPage.utils.ts`, etc.)
// keep resolving `UnitReadiness` / `ICampaignMissionRecord` /
// `IUnitDamageState` / `CampaignRosterStore` from this module unchanged.
export type {
  CampaignRosterActions,
  CampaignRosterState,
  CampaignRosterStore,
  ICampaignMissionRecord,
  IUnitDamageState,
  UnitReadiness,
} from './campaignRosterStore.types';

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

      applyPilotPatches: (patches) => {
        if (patches.size === 0) return;
        set((state) => ({
          pilots: state.pilots.map((p) => {
            const patch = patches.get(p.pilotId);
            return patch ? { ...p, ...patch } : p;
          }),
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
        // store. The campaign-store accessor (`useCampaignStore`) is a
        // singleton getter — calling it here returns the StoreApi, not
        // a React hook value, despite the misleading `use*` prefix.
        //
        // The active mission id is the closest analog to a `matchId`
        // for the legacy bridge — it's what `createMission` minted when
        // the encounter started. Falls back to a synthesized id when
        // the bridge is invoked outside a mission flow (defensive only;
        // production callers always have an active mission).
        const matchId =
          get().activeMissionId ?? `legacy-bridge-${generateId()}`;

        const campaignStore = getCampaignStoreForRoster();
        const campaign = campaignStore?.getState().campaign ?? null;

        // Compute next canonical map from prior map + per-unit deltas.
        // Skip the canonical write entirely when no campaign is loaded —
        // tests / orphan flows still get the readiness refresh.
        if (campaign) {
          const nextMap = buildNextCombatStateMap(
            campaign.unitCombatStates,
            damageStates,
            matchId,
          );
          campaignStore?.getState().updateCampaign({
            unitCombatStates: nextMap,
          });
        }

        // Step 1 (continued): refresh projection readiness based on the
        // damage payload. We compute this from the carry-forward delta
        // directly so the projection update doesn't depend on the
        // canonical write completing — keeps the two paths cleanly
        // independent.
        set((state) => ({
          units: refreshUnitsReadiness(state.units, damageStates, matchId),
        }));
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
      // Version 3 backfills legacy placeholder roster units with canonical
      // representative refs. Version 2 added required `primaryRole` and
      // `rankIndex` fields. Existing v0/v1 entries get defaulted on load:
      // primaryRole=PILOT (the historical implicit default) and rankIndex=0
      // (matches the old hardcoded bridge value, so behavior is preserved
      // until the user sets a real rank).
      version: CAMPAIGN_ROSTER_STORE_VERSION,
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState;
        const state = persistedState as Partial<CampaignRosterState>;
        const upgradedPilots =
          version >= 2
            ? state.pilots
            : ((state.pilots ?? []).map((entry) => ({
                ...entry,
                primaryRole: entry.primaryRole ?? CampaignPersonnelRole.PILOT,
                rankIndex: entry.rankIndex ?? 0,
              })) as ICampaignRosterEntry[]);
        return {
          ...state,
          pilots: upgradedPilots ?? [],
          units: backfillLegacyRosterUnitRefs(state.units ?? [], {
            campaignId: state.campaignId ?? undefined,
            source: `campaign-roster-store-v${version}-migration`,
          }),
        } as StorageValue<CampaignRosterStore>['state'];
      },
    },
  ),
);
