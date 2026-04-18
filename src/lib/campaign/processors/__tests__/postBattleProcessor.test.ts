/**
 * Tests for postBattleProcessor — Phase 3 Wave 2.
 *
 * @spec openspec/changes/add-post-battle-processor/specs/post-battle-processor/spec.md
 */
import { describe, it, expect } from "@jest/globals";

import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from "@/types/combat/CombatOutcome";
import type { IPerson } from "@/types/campaign/Person";
import type { IPostBattleReport } from "@/utils/gameplay/postBattleReport";

import { createDefaultCampaignOptions } from "@/types/campaign/Campaign";
import { CampaignType } from "@/types/campaign/CampaignType";
import { CampaignPersonnelRole } from "@/types/campaign/enums/CampaignPersonnelRole";
import { MissionStatus } from "@/types/campaign/enums/MissionStatus";
import { PersonnelStatus } from "@/types/campaign/enums/PersonnelStatus";
import { Money } from "@/types/campaign/Money";
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
} from "@/types/combat/CombatOutcome";
import { GameSide } from "@/types/gameplay/GameSessionInterfaces";
import { createContract } from "@/types/campaign/Mission";

import {
  applyPostBattle,
  postBattleProcessor,
  type ICampaignWithBattleState,
} from "../postBattleProcessor";

// ----------------------------------------------------------------------------
// Test Fixtures
// ----------------------------------------------------------------------------

function createTestPerson(overrides: Partial<IPerson> = {}): IPerson {
  return {
    id: "pilot-1",
    name: "Test Pilot",
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: "MechWarrior",
    recruitmentDate: new Date("3024-01-01"),
    missionsCompleted: 0,
    totalKills: 0,
    xp: 0,
    totalXpEarned: 0,
    xpSpent: 0,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: {
      STR: 5,
      BOD: 5,
      REF: 5,
      DEX: 5,
      INT: 5,
      WIL: 5,
      CHA: 5,
      Edge: 0,
    },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: "3024-01-01T00:00:00Z",
    updatedAt: "3025-01-01T00:00:00Z",
    awards: [],
    ...overrides,
  };
}

function createTestCampaign(
  overrides: Partial<ICampaignWithBattleState> = {},
): ICampaignWithBattleState {
  return {
    id: "camp-1",
    name: "Test Campaign",
    currentDate: new Date("3025-06-15T00:00:00Z"),
    factionId: "mercenary",
    personnel: new Map(),
    forces: new Map(),
    rootForceId: "root",
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: "3024-12-01T00:00:00Z",
    updatedAt: "3025-06-14T00:00:00Z",
    ...overrides,
  };
}

function createTestReport(
  matchId: string,
  winner: GameSide | "draw" = GameSide.Player,
): IPostBattleReport {
  return {
    version: 1,
    matchId,
    winner,
    reason: "destruction",
    turnCount: 5,
    units: [],
    mvpUnitId: null,
    log: [],
  };
}

function createDelta(
  unitId: string,
  overrides: Partial<IUnitCombatDelta> = {},
): IUnitCombatDelta {
  return {
    unitId,
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 20, LT: 15, RT: 15 },
    internalsRemaining: { CT: 10, LT: 8, RT: 8 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 4,
    ammoRemaining: { "srm6-1": 12 },
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
    ...overrides,
  };
}

function createOutcome(
  overrides: Partial<ICombatOutcome> = {},
): ICombatOutcome {
  const matchId = overrides.matchId ?? "match-1";
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    report: createTestReport(matchId, GameSide.Player),
    unitDeltas: [],
    capturedAt: "3025-06-15T12:00:00Z",
    ...overrides,
  };
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("postBattleProcessor", () => {
  describe("metadata", () => {
    it("has correct id and displayName", () => {
      expect(postBattleProcessor.id).toBe("post-battle");
      expect(postBattleProcessor.displayName).toBe("Post-Battle Processing");
    });
  });

  describe("empty queue", () => {
    it("returns no events when no pending outcomes", () => {
      const campaign = createTestCampaign();
      const result = postBattleProcessor.process(
        campaign,
        campaign.currentDate,
      );
      expect(result.events).toHaveLength(0);
      expect(result.campaign).toBe(campaign);
    });
  });

  describe("unit damage persistence", () => {
    it("writes IUnitCombatState reflecting destroyed locations", () => {
      const campaign = createTestCampaign();
      const outcome = createOutcome({
        unitDeltas: [
          createDelta("unit-A", {
            destroyed: true,
            finalStatus: UnitFinalStatus.Destroyed,
            destroyedLocations: ["CT"],
            internalsRemaining: { CT: 0, LT: 8, RT: 8 },
          }),
        ],
      });

      const { campaign: next } = applyPostBattle(outcome, campaign);
      const state = next.unitCombatStates?.["unit-A"];
      expect(state).toBeDefined();
      expect(state?.destroyedLocations).toContain("CT");
      expect(state?.currentStructurePerLocation["CT"]).toBe(0);
      expect(state?.combatReady).toBe(false);
    });

    it("clamps ammo at zero", () => {
      const campaign = createTestCampaign();
      const outcome = createOutcome({
        unitDeltas: [createDelta("unit-A", { ammoRemaining: { "lrm-1": 0 } })],
      });
      const { campaign: next } = applyPostBattle(outcome, campaign);
      expect(next.unitCombatStates?.["unit-A"]?.ammoRemaining["lrm-1"]).toBe(0);
    });

    it("marks combatReady false when finalStatus = Destroyed", () => {
      const campaign = createTestCampaign();
      const outcome = createOutcome({
        unitDeltas: [
          createDelta("unit-A", {
            destroyed: true,
            finalStatus: UnitFinalStatus.Destroyed,
          }),
        ],
      });
      const { campaign: next } = applyPostBattle(outcome, campaign);
      expect(next.unitCombatStates?.["unit-A"]?.combatReady).toBe(false);
    });
  });

  describe("pilot status mapping", () => {
    it("marks KIA pilot KIA + records deathDate", () => {
      const pilot = createTestPerson({ id: "pilot-1" });
      const personnel = new Map<string, IPerson>([["pilot-1", pilot]]);
      const campaign = createTestCampaign({ personnel });

      const outcome = createOutcome({
        unitDeltas: [
          createDelta("pilot-1", {
            destroyed: true,
            finalStatus: UnitFinalStatus.Destroyed,
            pilotState: {
              conscious: false,
              wounds: 6,
              killed: true,
              finalStatus: PilotFinalStatus.KIA,
            },
          }),
        ],
      });

      const { campaign: next } = applyPostBattle(outcome, campaign);
      const updated = next.personnel.get("pilot-1");
      expect(updated?.status).toBe(PersonnelStatus.KIA);
      expect(updated?.deathDate).toBe(campaign.currentDate);
    });

    it("marks Wounded pilot WOUNDED + sets healing days", () => {
      const pilot = createTestPerson({ id: "pilot-1" });
      const personnel = new Map<string, IPerson>([["pilot-1", pilot]]);
      const campaign = createTestCampaign({ personnel });

      const outcome = createOutcome({
        unitDeltas: [
          createDelta("pilot-1", {
            pilotState: {
              conscious: true,
              wounds: 2,
              killed: false,
              finalStatus: PilotFinalStatus.Wounded,
            },
          }),
        ],
      });

      const { campaign: next } = applyPostBattle(outcome, campaign);
      const updated = next.personnel.get("pilot-1");
      expect(updated?.status).toBe(PersonnelStatus.WOUNDED);
      expect(updated?.hits).toBe(2);
      expect(updated?.daysToWaitForHealing).toBeGreaterThanOrEqual(14);
    });

    it("maps Captured pilot to POW", () => {
      const pilot = createTestPerson({ id: "pilot-1" });
      const personnel = new Map<string, IPerson>([["pilot-1", pilot]]);
      const campaign = createTestCampaign({ personnel });

      const outcome = createOutcome({
        unitDeltas: [
          createDelta("pilot-1", {
            pilotState: {
              conscious: true,
              wounds: 1,
              killed: false,
              finalStatus: PilotFinalStatus.Captured,
            },
          }),
        ],
      });

      const { campaign: next } = applyPostBattle(outcome, campaign);
      expect(next.personnel.get("pilot-1")?.status).toBe(PersonnelStatus.POW);
    });
  });

  describe("XP application", () => {
    it("awards scenario XP per pilot", () => {
      const pilot = createTestPerson({
        id: "pilot-1",
        xp: 0,
        totalXpEarned: 0,
      });
      const personnel = new Map<string, IPerson>([["pilot-1", pilot]]);
      const campaign = createTestCampaign({ personnel });

      const outcome = createOutcome({
        unitDeltas: [createDelta("pilot-1")],
      });

      const { campaign: next } = applyPostBattle(outcome, campaign);
      const updated = next.personnel.get("pilot-1");
      expect(updated?.xp).toBeGreaterThanOrEqual(1);
      expect(updated?.totalXpEarned).toBeGreaterThanOrEqual(1);
    });

    it("awards bonus kill XP to player-side survivors when they win", () => {
      const pilot = createTestPerson({
        id: "pilot-1",
        xp: 0,
        totalXpEarned: 0,
      });
      const personnel = new Map<string, IPerson>([["pilot-1", pilot]]);
      const campaign = createTestCampaign({
        personnel,
        options: {
          ...createDefaultCampaignOptions(),
          scenarioXP: 1,
          killsForXP: 1,
          killXPAward: 2,
        },
      });

      const outcome = createOutcome({
        report: createTestReport("match-1", GameSide.Player),
        unitDeltas: [createDelta("pilot-1", { side: GameSide.Player })],
      });

      const { campaign: next } = applyPostBattle(outcome, campaign);
      const updated = next.personnel.get("pilot-1");
      // 1 scenario + 2 kill = 3
      expect(updated?.xp).toBe(3);
    });
  });

  describe("contract progression", () => {
    it("flips contract to SUCCESS when player wins on objective", () => {
      const contract = createContract({
        id: "contract-1",
        name: "Test Contract",
        employerId: "davion",
        targetId: "liao",
        status: MissionStatus.ACTIVE,
      });
      const missions = new Map([[contract.id, contract]]);
      const campaign = createTestCampaign({ missions });

      const outcome = createOutcome({
        contractId: "contract-1",
        endReason: CombatEndReason.ObjectiveMet,
        report: createTestReport("match-1", GameSide.Player),
        unitDeltas: [createDelta("unit-A")],
      });

      const { campaign: next, summary } = applyPostBattle(outcome, campaign);
      expect(next.missions.get("contract-1")?.status).toBe(
        MissionStatus.SUCCESS,
      );
      expect(summary.contractUpdated).toBe("contract-1");
    });

    it("flips contract to FAILED when player loses on objective", () => {
      const contract = createContract({
        id: "contract-1",
        name: "Test Contract",
        employerId: "davion",
        targetId: "liao",
        status: MissionStatus.ACTIVE,
      });
      const missions = new Map([[contract.id, contract]]);
      const campaign = createTestCampaign({ missions });

      const outcome = createOutcome({
        contractId: "contract-1",
        endReason: CombatEndReason.ObjectiveMet,
        report: createTestReport("match-1", GameSide.Opponent),
        unitDeltas: [createDelta("unit-A")],
      });

      const { campaign: next } = applyPostBattle(outcome, campaign);
      expect(next.missions.get("contract-1")?.status).toBe(
        MissionStatus.FAILED,
      );
    });
  });

  describe("idempotency", () => {
    it("skips outcomes already applied (matchId in processedBattleIds)", () => {
      const pilot = createTestPerson({
        id: "pilot-1",
        xp: 0,
        totalXpEarned: 0,
      });
      const personnel = new Map<string, IPerson>([["pilot-1", pilot]]);
      const campaign = createTestCampaign({ personnel });

      const outcome = createOutcome({
        unitDeltas: [createDelta("pilot-1")],
      });

      // First apply increments XP.
      const { campaign: c1 } = applyPostBattle(outcome, campaign);
      const xpAfterFirst = c1.personnel.get("pilot-1")?.xp ?? 0;
      expect(xpAfterFirst).toBeGreaterThan(0);
      expect(c1.processedBattleIds).toContain("match-1");

      // Second apply with same matchId is a no-op.
      const { campaign: c2, summary } = applyPostBattle(outcome, c1);
      expect(summary.skippedDuplicate).toBe(true);
      expect(c2.personnel.get("pilot-1")?.xp).toBe(xpAfterFirst);
    });
  });

  describe("unknown ids", () => {
    it("skips unknown pilot id gracefully but still updates unit state", () => {
      const campaign = createTestCampaign();
      const outcome = createOutcome({
        unitDeltas: [createDelta("ghost-pilot")],
      });

      const { campaign: next, summary } = applyPostBattle(outcome, campaign);
      expect(summary.pilotsUpdated).toHaveLength(0);
      expect(summary.unitsUpdated).toContain("ghost-pilot");
      expect(next.unitCombatStates?.["ghost-pilot"]).toBeDefined();
    });

    it("skips unknown contract id gracefully", () => {
      const campaign = createTestCampaign();
      const outcome = createOutcome({
        contractId: "phantom-contract",
        endReason: CombatEndReason.ObjectiveMet,
        unitDeltas: [createDelta("unit-A")],
      });

      const { summary } = applyPostBattle(outcome, campaign);
      expect(summary.contractUpdated).toBeNull();
    });
  });

  describe("day pipeline integration", () => {
    it("processes the entire pendingBattleOutcomes queue in one call", () => {
      const pilot = createTestPerson({
        id: "pilot-1",
        xp: 0,
        totalXpEarned: 0,
      });
      const personnel = new Map<string, IPerson>([["pilot-1", pilot]]);
      const campaign = createTestCampaign({
        personnel,
        pendingBattleOutcomes: [
          createOutcome({
            matchId: "match-1",
            unitDeltas: [createDelta("pilot-1")],
          }),
          createOutcome({
            matchId: "match-2",
            unitDeltas: [createDelta("pilot-1")],
          }),
        ],
      });

      const result = postBattleProcessor.process(
        campaign,
        campaign.currentDate,
      );
      const updated = result.campaign as ICampaignWithBattleState;
      expect(updated.pendingBattleOutcomes).toHaveLength(0);
      expect(updated.processedBattleIds).toEqual(
        expect.arrayContaining(["match-1", "match-2"]),
      );
      expect(result.events).toHaveLength(2);
    });
  });
});
