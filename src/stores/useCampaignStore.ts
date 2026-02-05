/**
 * Campaign Store
 *
 * Zustand store for managing campaign state in the UI.
 * Uses localStorage for persistence initially (API routes can be added later).
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */

import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import {
  ICampaign,
  ICampaignMission,
  ICampaignRoster,
  ICampaignUnitState,
  ICampaignPilotState,
  ICampaignResources,
  ICampaignValidationResult,
  ICreateCampaignInput,
  IAddMissionInput,
  IRecordMissionOutcomeInput,
  IMissionOutcome,
  CampaignStatus,
  CampaignMissionStatus,
  CampaignUnitStatus,
  CampaignPilotStatus,
  DEFAULT_CAMPAIGN_RESOURCES,
  CAMPAIGN_TEMPLATES,
  validateCampaign,
  calculateMissionXp,
} from '@/types/campaign';
import {
  IGameSession,
  IGameUnit,
  GameSide,
  IHexTerrain,
  IGameConfig,
} from '@/types/gameplay';
import { createGameSession } from '@/utils/gameplay/gameSession';
import { generateTerrain, BiomeType } from '@/utils/gameplay/terrainGenerator';

// =============================================================================
// Campaign View Mode and Mission Context Types
// =============================================================================

/** View mode for campaign UI - either viewing the starmap or in tactical combat */
export type CampaignViewMode = 'starmap' | 'tactical';

/**
 * Context for an active tactical mission.
 * Contains all the data needed to run the tactical game.
 */
export interface IMissionContext {
  /** The mission being played */
  readonly missionId: string;
  /** Generated or loaded terrain */
  readonly terrain: IHexTerrain[];
  /** Unit IDs from campaign roster participating in this mission */
  readonly playerUnits: string[];
  /** Generated opponent units for this mission */
  readonly opponentUnits: IGameUnit[];
}

// =============================================================================
// Store State
// =============================================================================

interface CampaignStoreState {
  campaigns: ICampaign[];
  selectedCampaignId: string | null;
  isLoading: boolean;
  error: string | null;
  statusFilter: CampaignStatus | 'all';
  searchQuery: string;
  validations: Map<string, ICampaignValidationResult>;
  viewMode: CampaignViewMode;
  activeGameSession: IGameSession | null;
  activeMissionContext: IMissionContext | null;
}

interface CampaignStoreActions {
  createCampaign: (input: ICreateCampaignInput) => string;
  createCampaignFromTemplate: (
    templateId: string,
    input: Omit<ICreateCampaignInput, 'templateId'>,
  ) => string | null;
  getCampaign: (id: string) => ICampaign | undefined;
  updateCampaign: (id: string, updates: Partial<ICampaign>) => boolean;
  deleteCampaign: (id: string) => boolean;
  selectCampaign: (id: string | null) => void;
  getSelectedCampaign: () => ICampaign | null;

  addMission: (campaignId: string, input: IAddMissionInput) => string | null;
  updateMission: (
    campaignId: string,
    missionId: string,
    updates: Partial<ICampaignMission>,
  ) => boolean;
  removeMission: (campaignId: string, missionId: string) => boolean;
  startMission: (campaignId: string, missionId: string) => boolean;
  recordMissionOutcome: (
    campaignId: string,
    input: IRecordMissionOutcomeInput,
  ) => boolean;

  launchMission: (missionId: string) => boolean;
  endMission: (result: 'victory' | 'defeat' | 'withdraw') => boolean;
  getCurrentMapComponent: () => 'StarmapDisplay' | 'HexMapDisplay';

  /** Add unit to campaign roster */
  addUnitToRoster: (campaignId: string, unit: ICampaignUnitState) => boolean;
  /** Remove unit from roster */
  removeUnitFromRoster: (campaignId: string, unitId: string) => boolean;
  /** Update unit state in roster */
  updateUnitState: (
    campaignId: string,
    unitId: string,
    updates: Partial<ICampaignUnitState>,
  ) => boolean;

  /** Add pilot to campaign roster */
  addPilotToRoster: (campaignId: string, pilot: ICampaignPilotState) => boolean;
  /** Remove pilot from roster */
  removePilotFromRoster: (campaignId: string, pilotId: string) => boolean;
  /** Update pilot state in roster */
  updatePilotState: (
    campaignId: string,
    pilotId: string,
    updates: Partial<ICampaignPilotState>,
  ) => boolean;
  /** Award XP to a pilot */
  awardXp: (campaignId: string, pilotId: string, xp: number) => boolean;

  /** Update campaign resources */
  updateResources: (
    campaignId: string,
    updates: Partial<ICampaignResources>,
  ) => boolean;

  /** Validate a campaign */
  validateCampaign: (id: string) => ICampaignValidationResult;
  /** Set campaign status */
  setCampaignStatus: (id: string, status: CampaignStatus) => boolean;

  /** Set status filter */
  setStatusFilter: (status: CampaignStatus | 'all') => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Get filtered campaigns */
  getFilteredCampaigns: () => ICampaign[];
  /** Clear error */
  clearError: () => void;
}

type CampaignStore = CampaignStoreState & CampaignStoreActions;

// =============================================================================
// Helper Functions
// =============================================================================

function createInitialProgress(): ICampaign['progress'] {
  return {
    currentMissionId: null,
    missionsCompleted: 0,
    missionsTotal: 0,
    victories: 0,
    defeats: 0,
    startedAt: new Date().toISOString(),
    daysElapsed: 0,
  };
}

function updateMissionStatuses(
  missions: readonly ICampaignMission[],
): ICampaignMission[] {
  const completedIds = new Set(
    missions
      .filter(
        (m) =>
          m.status === CampaignMissionStatus.Victory ||
          m.status === CampaignMissionStatus.Defeat,
      )
      .map((m) => m.id),
  );

  return missions.map((mission) => {
    if (mission.status !== CampaignMissionStatus.Locked) {
      return mission;
    }

    // Check if all prerequisites are met
    const prereqsMet = mission.prerequisites.every((prereq) =>
      completedIds.has(prereq),
    );
    if (prereqsMet) {
      return { ...mission, status: CampaignMissionStatus.Available };
    }

    return mission;
  });
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set, get) => ({
      // State
      campaigns: [],
      selectedCampaignId: null,
      isLoading: false,
      error: null,
      statusFilter: 'all',
      searchQuery: '',
      validations: new Map(),
      viewMode: 'starmap' as CampaignViewMode,
      activeGameSession: null,
      activeMissionContext: null,

      // Create a new campaign
      createCampaign: (input: ICreateCampaignInput) => {
        const now = new Date().toISOString();
        const id = uuidv4();

        const roster: ICampaignRoster = {
          units: input.unitIds.map((unitId) => ({
            unitId,
            unitName: `Unit ${unitId.slice(0, 8)}`, // Placeholder, should be resolved from vault
            status: CampaignUnitStatus.Operational,
            armorDamage: {},
            structureDamage: {},
            destroyedComponents: [],
            ammoExpended: {},
            currentHeat: 0,
            repairCost: 0,
            repairTime: 0,
          })),
          pilots: input.pilotIds.map((pilotId) => ({
            pilotId,
            pilotName: `Pilot ${pilotId.slice(0, 8)}`, // Placeholder, should be resolved from vault
            status: CampaignPilotStatus.Active,
            wounds: 0,
            xp: 0,
            campaignXpEarned: 0,
            campaignKills: 0,
            campaignMissions: 0,
            recoveryTime: 0,
          })),
        };

        const campaign: ICampaign = {
          id,
          name: input.name,
          description: input.description,
          status: CampaignStatus.Setup,
          missions: [],
          roster,
          resources: { ...DEFAULT_CAMPAIGN_RESOURCES, ...input.resources },
          progress: createInitialProgress(),
          difficultyModifier: input.difficultyModifier ?? 1.0,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          campaigns: [...state.campaigns, campaign],
        }));

        return id;
      },

      // Create campaign from template
      createCampaignFromTemplate: (
        templateId: string,
        input: Omit<ICreateCampaignInput, 'templateId'>,
      ) => {
        const template = CAMPAIGN_TEMPLATES.find((t) => t.id === templateId);
        if (!template) {
          set({ error: `Template not found: ${templateId}` });
          return null;
        }

        const campaignId = get().createCampaign({
          ...input,
          resources: { ...template.startingResources, ...input.resources },
          difficultyModifier:
            input.difficultyModifier ?? template.recommendedDifficulty,
        });

        // Add missions from template
        for (const missionDef of template.missions) {
          get().addMission(campaignId, {
            name: missionDef.name,
            description: missionDef.description,
            order: missionDef.order,
            prerequisites: [...missionDef.prerequisites],
            isFinal: missionDef.isFinal,
            optionalObjectives: missionDef.optionalObjectives
              ? [...missionDef.optionalObjectives]
              : undefined,
          });
        }

        // Update mission branches (needs second pass after all missions exist)
        const campaign = get().getCampaign(campaignId);
        if (campaign) {
          const updatedMissions = campaign.missions.map((mission) => {
            const templateMission = template.missions.find(
              (tm) => tm.id === mission.id.split('-').pop(),
            );
            if (templateMission && templateMission.branches.length > 0) {
              // Map template mission IDs to campaign mission IDs
              const campaignMissionMap = new Map<string, string>();
              campaign.missions.forEach((m, idx) => {
                const tmId = template.missions[idx]?.id;
                if (tmId) campaignMissionMap.set(tmId, m.id);
              });

              return {
                ...mission,
                branches: templateMission.branches.map((b) => ({
                  ...b,
                  targetMissionId:
                    campaignMissionMap.get(b.targetMissionId) ??
                    b.targetMissionId,
                })),
              };
            }
            return mission;
          });

          get().updateCampaign(campaignId, { missions: updatedMissions });
        }

        return campaignId;
      },

      // Get a campaign by ID
      getCampaign: (id: string) => {
        return get().campaigns.find((c) => c.id === id);
      },

      // Update a campaign
      updateCampaign: (id: string, updates: Partial<ICampaign>) => {
        const campaign = get().getCampaign(id);
        if (!campaign) {
          set({ error: `Campaign not found: ${id}` });
          return false;
        }

        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c,
          ),
        }));

        return true;
      },

      // Delete a campaign
      deleteCampaign: (id: string) => {
        const campaign = get().getCampaign(id);
        if (!campaign) {
          set({ error: `Campaign not found: ${id}` });
          return false;
        }

        set((state) => ({
          campaigns: state.campaigns.filter((c) => c.id !== id),
          selectedCampaignId:
            state.selectedCampaignId === id ? null : state.selectedCampaignId,
        }));

        return true;
      },

      // Select a campaign
      selectCampaign: (id: string | null) => {
        set({ selectedCampaignId: id });
      },

      // Get selected campaign
      getSelectedCampaign: () => {
        const { selectedCampaignId, campaigns } = get();
        if (!selectedCampaignId) return null;
        return campaigns.find((c) => c.id === selectedCampaignId) ?? null;
      },

      // Add a mission
      addMission: (campaignId: string, input: IAddMissionInput) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return null;
        }

        const missionId = uuidv4();
        const isFirstMission = campaign.missions.length === 0;

        const mission: ICampaignMission = {
          id: missionId,
          name: input.name,
          description: input.description,
          status:
            isFirstMission || (input.prerequisites?.length ?? 0) === 0
              ? CampaignMissionStatus.Available
              : CampaignMissionStatus.Locked,
          encounterId: input.encounterId,
          order: input.order,
          prerequisites: input.prerequisites ?? [],
          branches: [],
          isFinal: input.isFinal ?? false,
          optionalObjectives: input.optionalObjectives,
        };

        const updatedMissions = updateMissionStatuses([
          ...campaign.missions,
          mission,
        ]);

        get().updateCampaign(campaignId, {
          missions: updatedMissions,
          progress: {
            ...campaign.progress,
            missionsTotal: updatedMissions.length,
          },
        });

        return missionId;
      },

      // Update a mission
      updateMission: (
        campaignId: string,
        missionId: string,
        updates: Partial<ICampaignMission>,
      ) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        const missionIndex = campaign.missions.findIndex(
          (m) => m.id === missionId,
        );
        if (missionIndex === -1) {
          set({ error: `Mission not found: ${missionId}` });
          return false;
        }

        const updatedMissions = campaign.missions.map((m) =>
          m.id === missionId ? { ...m, ...updates } : m,
        );

        return get().updateCampaign(campaignId, {
          missions: updateMissionStatuses(updatedMissions),
        });
      },

      // Remove a mission
      removeMission: (campaignId: string, missionId: string) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        const updatedMissions = campaign.missions.filter(
          (m) => m.id !== missionId,
        );

        return get().updateCampaign(campaignId, {
          missions: updateMissionStatuses(updatedMissions),
          progress: {
            ...campaign.progress,
            missionsTotal: updatedMissions.length,
            currentMissionId:
              campaign.progress.currentMissionId === missionId
                ? null
                : campaign.progress.currentMissionId,
          },
        });
      },

      // Start a mission
      startMission: (campaignId: string, missionId: string) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        const mission = campaign.missions.find((m) => m.id === missionId);
        if (!mission) {
          set({ error: `Mission not found: ${missionId}` });
          return false;
        }

        if (mission.status !== CampaignMissionStatus.Available) {
          set({ error: `Mission is not available: ${mission.status}` });
          return false;
        }

        // Take roster snapshot
        const rosterSnapshot: ICampaignRoster = {
          units: campaign.roster.units.map((u) => ({ ...u })),
          pilots: campaign.roster.pilots.map((p) => ({ ...p })),
        };

        const updatedMissions = campaign.missions.map((m) =>
          m.id === missionId
            ? { ...m, status: CampaignMissionStatus.InProgress, rosterSnapshot }
            : m,
        );

        return get().updateCampaign(campaignId, {
          missions: updatedMissions,
          status:
            campaign.status === CampaignStatus.Setup
              ? CampaignStatus.Active
              : campaign.status,
          progress: {
            ...campaign.progress,
            currentMissionId: missionId,
          },
        });
      },

      // Record mission outcome
      recordMissionOutcome: (
        campaignId: string,
        input: IRecordMissionOutcomeInput,
      ) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        const mission = campaign.missions.find((m) => m.id === input.missionId);
        if (!mission) {
          set({ error: `Mission not found: ${input.missionId}` });
          return false;
        }

        // Calculate XP awards for each pilot
        const xpAwarded: Record<string, number> = {};
        for (const pilot of campaign.roster.pilots) {
          if (
            pilot.status === CampaignPilotStatus.Active ||
            pilot.status === CampaignPilotStatus.Wounded
          ) {
            const pilotUpdate = input.pilotUpdates.find(
              (u) => u.pilotId === pilot.pilotId,
            );
            const kills = pilotUpdate?.campaignKills ?? 0;
            const survivedCritical =
              pilotUpdate?.wounds !== undefined && pilotUpdate.wounds > 0;
            const xp = calculateMissionXp(
              kills,
              input.outcome.result === 'victory',
              survivedCritical,
              0,
            );
            xpAwarded[pilot.pilotId] = xp;
          }
        }

        const outcome: IMissionOutcome = {
          ...input.outcome,
          xpAwarded,
        };

        // Update mission status based on outcome
        const newMissionStatus =
          outcome.result === 'victory'
            ? CampaignMissionStatus.Victory
            : CampaignMissionStatus.Defeat;

        // Update roster with provided updates
        const updatedUnits = campaign.roster.units.map((unit) => {
          const update = input.unitUpdates.find(
            (u) => u.unitId === unit.unitId,
          );
          return update ? { ...unit, ...update } : unit;
        });

        const updatedPilots = campaign.roster.pilots.map((pilot) => {
          const update = input.pilotUpdates.find(
            (u) => u.pilotId === pilot.pilotId,
          );
          const xp = xpAwarded[pilot.pilotId] ?? 0;
          return update
            ? {
                ...pilot,
                ...update,
                xp: pilot.xp + xp,
                campaignXpEarned: pilot.campaignXpEarned + xp,
                campaignMissions: pilot.campaignMissions + 1,
              }
            : {
                ...pilot,
                xp: pilot.xp + xp,
                campaignXpEarned: pilot.campaignXpEarned + xp,
                campaignMissions: pilot.campaignMissions + 1,
              };
        });

        const updatedMissions = updateMissionStatuses(
          campaign.missions.map((m) =>
            m.id === input.missionId
              ? {
                  ...m,
                  status: newMissionStatus,
                  outcome,
                  completedAt: new Date().toISOString(),
                }
              : m,
          ),
        );

        // Check for campaign end conditions
        let newCampaignStatus = campaign.status;
        if (mission.isFinal && outcome.result === 'victory') {
          newCampaignStatus = CampaignStatus.Victory;
        } else if (mission.isFinal && outcome.result === 'defeat') {
          // Check if there's a defeat branch
          const defeatBranch = mission.branches.find(
            (b) => b.condition === 'defeat',
          );
          if (!defeatBranch) {
            newCampaignStatus = CampaignStatus.Defeat;
          }
        }

        // Update resources based on outcome
        const updatedResources: ICampaignResources = {
          ...campaign.resources,
          cBills: campaign.resources.cBills + outcome.cBillsReward,
          salvageParts:
            campaign.resources.salvageParts + outcome.salvage.length,
          morale: Math.max(
            0,
            Math.min(
              100,
              campaign.resources.morale +
                (outcome.result === 'victory' ? 5 : -10),
            ),
          ),
        };

        return get().updateCampaign(campaignId, {
          missions: updatedMissions,
          roster: { units: updatedUnits, pilots: updatedPilots },
          resources: updatedResources,
          status: newCampaignStatus,
          progress: {
            ...campaign.progress,
            currentMissionId: null,
            missionsCompleted: campaign.progress.missionsCompleted + 1,
            victories:
              campaign.progress.victories +
              (outcome.result === 'victory' ? 1 : 0),
            defeats:
              campaign.progress.defeats + (outcome.result === 'defeat' ? 1 : 0),
            lastMissionAt: new Date().toISOString(),
          },
        });
      },

      // Add unit to roster
      addUnitToRoster: (campaignId: string, unit: ICampaignUnitState) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        if (campaign.roster.units.some((u) => u.unitId === unit.unitId)) {
          set({ error: `Unit already in roster: ${unit.unitId}` });
          return false;
        }

        return get().updateCampaign(campaignId, {
          roster: {
            ...campaign.roster,
            units: [...campaign.roster.units, unit],
          },
        });
      },

      // Remove unit from roster
      removeUnitFromRoster: (campaignId: string, unitId: string) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        return get().updateCampaign(campaignId, {
          roster: {
            ...campaign.roster,
            units: campaign.roster.units.filter((u) => u.unitId !== unitId),
          },
        });
      },

      // Update unit state
      updateUnitState: (
        campaignId: string,
        unitId: string,
        updates: Partial<ICampaignUnitState>,
      ) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        const unitIndex = campaign.roster.units.findIndex(
          (u) => u.unitId === unitId,
        );
        if (unitIndex === -1) {
          set({ error: `Unit not found in roster: ${unitId}` });
          return false;
        }

        const updatedUnits = campaign.roster.units.map((u) =>
          u.unitId === unitId ? { ...u, ...updates } : u,
        );

        return get().updateCampaign(campaignId, {
          roster: { ...campaign.roster, units: updatedUnits },
        });
      },

      // Add pilot to roster
      addPilotToRoster: (campaignId: string, pilot: ICampaignPilotState) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        if (campaign.roster.pilots.some((p) => p.pilotId === pilot.pilotId)) {
          set({ error: `Pilot already in roster: ${pilot.pilotId}` });
          return false;
        }

        return get().updateCampaign(campaignId, {
          roster: {
            ...campaign.roster,
            pilots: [...campaign.roster.pilots, pilot],
          },
        });
      },

      // Remove pilot from roster
      removePilotFromRoster: (campaignId: string, pilotId: string) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        return get().updateCampaign(campaignId, {
          roster: {
            ...campaign.roster,
            pilots: campaign.roster.pilots.filter((p) => p.pilotId !== pilotId),
          },
        });
      },

      // Update pilot state
      updatePilotState: (
        campaignId: string,
        pilotId: string,
        updates: Partial<ICampaignPilotState>,
      ) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        const pilotIndex = campaign.roster.pilots.findIndex(
          (p) => p.pilotId === pilotId,
        );
        if (pilotIndex === -1) {
          set({ error: `Pilot not found in roster: ${pilotId}` });
          return false;
        }

        const updatedPilots = campaign.roster.pilots.map((p) =>
          p.pilotId === pilotId ? { ...p, ...updates } : p,
        );

        return get().updateCampaign(campaignId, {
          roster: { ...campaign.roster, pilots: updatedPilots },
        });
      },

      // Award XP to a pilot
      awardXp: (campaignId: string, pilotId: string, xp: number) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        const pilot = campaign.roster.pilots.find((p) => p.pilotId === pilotId);
        if (!pilot) {
          set({ error: `Pilot not found in roster: ${pilotId}` });
          return false;
        }

        return get().updatePilotState(campaignId, pilotId, {
          xp: pilot.xp + xp,
          campaignXpEarned: pilot.campaignXpEarned + xp,
        });
      },

      // Update resources
      updateResources: (
        campaignId: string,
        updates: Partial<ICampaignResources>,
      ) => {
        const campaign = get().getCampaign(campaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${campaignId}` });
          return false;
        }

        return get().updateCampaign(campaignId, {
          resources: { ...campaign.resources, ...updates },
        });
      },

      // Validate a campaign
      validateCampaign: (id: string) => {
        const campaign = get().getCampaign(id);
        if (!campaign) {
          return {
            valid: false,
            errors: [`Campaign not found: ${id}`],
            warnings: [],
          };
        }

        const result = validateCampaign(campaign);
        const validations = new Map(get().validations);
        validations.set(id, result);
        set({ validations });

        return result;
      },

      // Set campaign status
      setCampaignStatus: (id: string, status: CampaignStatus) => {
        return get().updateCampaign(id, { status });
      },

      // Set status filter
      setStatusFilter: (status: CampaignStatus | 'all') => {
        set({ statusFilter: status });
      },

      // Set search query
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      // Get filtered campaigns
      getFilteredCampaigns: () => {
        const { campaigns, statusFilter, searchQuery } = get();
        let filtered = campaigns;

        if (statusFilter !== 'all') {
          filtered = filtered.filter((c) => c.status === statusFilter);
        }

        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c.name.toLowerCase().includes(lowerQuery) ||
              c.description?.toLowerCase().includes(lowerQuery),
          );
        }

        return filtered;
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      launchMission: (missionId: string) => {
        const { selectedCampaignId } = get();
        if (!selectedCampaignId) {
          set({ error: 'No campaign selected' });
          return false;
        }

        const campaign = get().getCampaign(selectedCampaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${selectedCampaignId}` });
          return false;
        }

        const mission = campaign.missions.find((m) => m.id === missionId);
        if (!mission) {
          set({ error: `Mission not found: ${missionId}` });
          return false;
        }

        if (mission.status !== CampaignMissionStatus.Available) {
          set({ error: `Mission is not available: ${mission.status}` });
          return false;
        }

        const missionStarted = get().startMission(
          selectedCampaignId,
          missionId,
        );
        if (!missionStarted) {
          return false;
        }

        const terrain = generateTerrain({
          width: 15,
          height: 15,
          biome: 'temperate' as BiomeType,
          seed: Date.now(),
        });

        const operationalUnits = campaign.roster.units.filter(
          (u) =>
            u.status === CampaignUnitStatus.Operational ||
            u.status === CampaignUnitStatus.Damaged,
        );

        const playerGameUnits: IGameUnit[] = operationalUnits.map((unit) => {
          const pilot = campaign.roster.pilots.find(
            (p) => p.pilotId === unit.pilotId,
          );
          return {
            id: `player-${unit.unitId}`,
            name: unit.unitName,
            side: GameSide.Player,
            unitRef: unit.unitId,
            pilotRef: pilot?.pilotId ?? 'default',
            gunnery: 4,
            piloting: 5,
          };
        });

        const opponentUnits: IGameUnit[] = [
          {
            id: 'opponent-1',
            name: 'Enemy Mech 1',
            side: GameSide.Opponent,
            unitRef: 'enemy-1',
            pilotRef: 'enemy-pilot-1',
            gunnery: 4,
            piloting: 5,
          },
          {
            id: 'opponent-2',
            name: 'Enemy Mech 2',
            side: GameSide.Opponent,
            unitRef: 'enemy-2',
            pilotRef: 'enemy-pilot-2',
            gunnery: 4,
            piloting: 5,
          },
        ];

        const config: IGameConfig = {
          mapRadius: 7,
          turnLimit: 0,
          victoryConditions: ['destruction'],
          optionalRules: [],
        };

        const gameSession = createGameSession(config, [
          ...playerGameUnits,
          ...opponentUnits,
        ]);

        const missionContext: IMissionContext = {
          missionId,
          terrain,
          playerUnits: operationalUnits.map((u) => u.unitId),
          opponentUnits,
        };

        set({
          viewMode: 'tactical',
          activeGameSession: gameSession,
          activeMissionContext: missionContext,
        });

        return true;
      },

      endMission: (result: 'victory' | 'defeat' | 'withdraw') => {
        const { selectedCampaignId, activeGameSession, activeMissionContext } =
          get();

        if (
          !selectedCampaignId ||
          !activeGameSession ||
          !activeMissionContext
        ) {
          set({ error: 'No active mission to end' });
          return false;
        }

        const campaign = get().getCampaign(selectedCampaignId);
        if (!campaign) {
          set({ error: `Campaign not found: ${selectedCampaignId}` });
          return false;
        }

        const outcomeResult = result === 'withdraw' ? 'defeat' : result;
        const cBillsReward =
          result === 'victory'
            ? 50000
            : result === 'withdraw'
              ? -10000
              : -25000;

        get().recordMissionOutcome(selectedCampaignId, {
          missionId: activeMissionContext.missionId,
          outcome: {
            result: outcomeResult as 'victory' | 'defeat',
            enemyUnitsDestroyed: result === 'victory' ? 2 : 0,
            enemyBVDestroyed: result === 'victory' ? 3000 : 0,
            playerUnitsDestroyed: result === 'defeat' ? 1 : 0,
            playerBVLost: result === 'defeat' ? 1500 : 0,
            salvage: result === 'victory' ? ['Salvaged Parts'] : [],
            cBillsReward,
            turnsPlayed: activeGameSession.currentState.turn,
            gameSessionId: activeGameSession.id,
          },
          unitUpdates: [],
          pilotUpdates: [],
        });

        const newCBills = Math.max(0, campaign.resources.cBills + cBillsReward);
        get().updateResources(selectedCampaignId, { cBills: newCBills });

        set({
          viewMode: 'starmap',
          activeGameSession: null,
          activeMissionContext: null,
        });

        return true;
      },

      getCurrentMapComponent: () => {
        const { viewMode } = get();
        return viewMode === 'tactical' ? 'HexMapDisplay' : 'StarmapDisplay';
      },
    }),
    {
      name: 'mekstation-campaigns',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        campaigns: state.campaigns,
        selectedCampaignId: state.selectedCampaignId,
      }),
    },
  ),
);
