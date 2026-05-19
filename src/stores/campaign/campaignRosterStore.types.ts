/**
 * Campaign Roster Store — Type Definitions
 *
 * Extracted from `useCampaignRosterStore.ts` as part of a behavior-preserving
 * decomposition: the store module was over the 600-LOC critical threshold, so
 * the type surface (store state shape, action contract, and the public
 * payload/record interfaces) lives here as a co-located sibling. The store
 * module re-exports the public names (`UnitReadiness`, `ICampaignMissionRecord`,
 * `IUnitDamageState`, `CampaignRosterStore`) so all existing importers keep
 * working unchanged.
 *
 * @see ./useCampaignRosterStore.ts
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

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
 * a battle completes. Consumed by the roster store to (a) refresh the roster
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

/** Reactive state slice held by the campaign roster store. */
export interface CampaignRosterState {
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

/** Action contract exposed by the campaign roster store. */
export interface CampaignRosterActions {
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

  /**
   * Apply per-pilot patches in a single setState. Each entry in `patches`
   * maps `pilotId` to a partial `ICampaignRosterEntry` that gets shallow-
   * merged into the existing entry. Unknown ids are ignored.
   *
   * Day-pipeline processors call this once per phase to commit their
   * accumulated mutations (wound progression, status transitions, XP
   * awards, departure flags) without requiring direct setState access.
   */
  applyPilotPatches: (
    patches: ReadonlyMap<string, Partial<ICampaignRosterEntry>>,
  ) => void;

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
   * (that conflated legacy roster-unit shape was deleted in PR-C).
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

/** Full campaign roster store type — reactive state plus actions. */
export type CampaignRosterStore = CampaignRosterState & CampaignRosterActions;
