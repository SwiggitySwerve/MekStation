/**
 * Campaign Roster Store
 *
 * MVP store for campaign roster management, mission tracking,
 * and damage carry-forward between missions.
 *
 * Sits alongside the main campaign store and manages the gameplay loop:
 * - Unit roster with readiness status
 * - Mission history with outcomes
 * - Damage carry-forward between missions
 * - OpFor generation via ScenarioGenerator
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import {
  CampaignUnitStatus,
  type ICampaignUnitState,
  type ICampaignPilotState,
} from '@/types/campaign/CampaignInterfaces';

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

/** Serializable damage state per unit for carry-forward */
export interface IUnitDamageState {
  readonly unitId: string;
  /** Per-location armor damage (points lost) */
  readonly armorDamage: Record<string, number>;
  /** Per-location structure damage (points lost) */
  readonly structureDamage: Record<string, number>;
  /** Destroyed component names */
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

  /** Unit roster for the campaign */
  units: ICampaignUnitState[];

  /** Pilot roster for the campaign */
  pilots: ICampaignPilotState[];

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
  addUnit: (unit: ICampaignUnitState) => void;

  /** Remove a unit from the roster */
  removeUnit: (unitId: string) => void;

  /** Add a pilot to the roster */
  addPilot: (pilot: ICampaignPilotState) => void;

  /** Remove a pilot from the roster */
  removePilot: (pilotId: string) => void;

  /** Assign a pilot to a unit */
  assignPilot: (unitId: string, pilotId: string) => void;

  /** Get unit readiness status */
  getUnitReadiness: (unitId: string) => UnitReadiness;

  /** Get all units with their readiness */
  getUnitsWithReadiness: () => Array<
    ICampaignUnitState & { readiness: UnitReadiness }
  >;

  /** Get deployable units (Ready or Damaged) */
  getDeployableUnits: () => ICampaignUnitState[];

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

  /** Apply damage carry-forward from battle results */
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

function unitReadiness(unit: ICampaignUnitState): UnitReadiness {
  if (unit.status === CampaignUnitStatus.Destroyed) return 'Destroyed';
  if (unit.status === CampaignUnitStatus.Damaged) return 'Damaged';
  return 'Ready';
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
        return unitReadiness(unit);
      },

      getUnitsWithReadiness: () => {
        return get().units.map((unit) => ({
          ...unit,
          readiness: unitReadiness(unit),
        }));
      },

      getDeployableUnits: () => {
        return get().units.filter(
          (u) =>
            u.status === CampaignUnitStatus.Operational ||
            u.status === CampaignUnitStatus.Damaged,
        );
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

        // Apply damage carry-forward
        get().applyDamageCarryForward(damageStates);
      },

      applyDamageCarryForward: (damageStates) => {
        set((state) => {
          const updatedUnits = state.units.map((unit) => {
            const damage = damageStates.find((d) => d.unitId === unit.unitId);
            if (!damage) return unit;

            // Destroyed units are removed from active roster
            if (damage.destroyed) {
              return {
                ...unit,
                status: CampaignUnitStatus.Destroyed,
                armorDamage: damage.armorDamage,
                structureDamage: damage.structureDamage,
                destroyedComponents: [...damage.destroyedComponents],
              };
            }

            // Check if unit took any damage
            const totalArmorDmg = Object.values(damage.armorDamage).reduce(
              (sum, v) => sum + v,
              0,
            );
            const totalStructDmg = Object.values(damage.structureDamage).reduce(
              (sum, v) => sum + v,
              0,
            );
            const hasDamage = totalArmorDmg > 0 || totalStructDmg > 0;

            return {
              ...unit,
              status: hasDamage
                ? CampaignUnitStatus.Damaged
                : CampaignUnitStatus.Operational,
              armorDamage: damage.armorDamage,
              structureDamage: damage.structureDamage,
              destroyedComponents: [...damage.destroyedComponents],
            };
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
