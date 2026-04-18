/**
 * Tests for repairQueueBuilder pure helpers.
 */

import type { IRepairTicket } from "@/types/campaign/RepairTicket";
import type {
  IUnitCombatState,
  IUnitMaxState,
} from "@/types/campaign/UnitCombatState";

import {
  buildTicketsFromUnitState,
  estimateRepairHours,
  matchPartsAgainstSalvage,
  type ISalvagePool,
} from "../repairQueueBuilder";

const FIXED_TIMESTAMP = "2026-04-17T00:00:00.000Z";
const TEST_MATCH_ID = "match-1";

function makeMaxState(unitId: string): IUnitMaxState {
  return {
    unitId,
    maxArmorPerLocation: {
      LA: 12,
      LT: 18,
      CT: 25,
      RT: 18,
      RA: 12,
      LL: 16,
      RL: 16,
      H: 9,
    },
    maxStructurePerLocation: {
      LA: 6,
      LT: 12,
      CT: 18,
      RT: 12,
      RA: 6,
      LL: 12,
      RL: 12,
      H: 3,
    },
    maxAmmoPerBin: {
      "ac20-rt": 5,
      "srm6-lt": 15,
    },
  };
}

function makeIntactState(
  unitId: string,
  maxState: IUnitMaxState,
): IUnitCombatState {
  return {
    unitId,
    currentArmorPerLocation: { ...maxState.maxArmorPerLocation },
    currentStructurePerLocation: { ...maxState.maxStructurePerLocation },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: { ...maxState.maxAmmoPerBin },
    combatReady: true,
    lastCombatOutcomeId: TEST_MATCH_ID,
    lastUpdated: FIXED_TIMESTAMP,
  };
}

describe("estimateRepairHours", () => {
  it("returns 0.1 hours per armor point", () => {
    expect(estimateRepairHours("armor", 5)).toBeCloseTo(0.5, 5);
    expect(estimateRepairHours("armor", 10)).toBeCloseTo(1.0, 5);
  });

  it("returns 0.5 hours per structure point", () => {
    expect(estimateRepairHours("structure", 4)).toBeCloseTo(2.0, 5);
  });

  it("returns 4 hours per component swap regardless of points", () => {
    expect(estimateRepairHours("component", 1)).toBe(4);
    // Even if caller passes 0, treat as 1 component → 4h.
    expect(estimateRepairHours("component", 0)).toBe(4);
  });

  it("returns 0.5 hours flat for ammo restock", () => {
    expect(estimateRepairHours("ammo", 12)).toBe(0.5);
  });

  it("returns 0 hours for heat-recovery", () => {
    expect(estimateRepairHours("heat-recovery", 0)).toBe(0);
  });

  it("clamps negative armor points to 0", () => {
    expect(estimateRepairHours("armor", -5)).toBe(0);
  });
});

describe("buildTicketsFromUnitState", () => {
  it("returns empty array for an intact unit", () => {
    const maxState = makeMaxState("u1");
    const state = makeIntactState("u1", maxState);
    const tickets = buildTicketsFromUnitState({
      state,
      maxState,
      matchId: TEST_MATCH_ID,
      createdAt: FIXED_TIMESTAMP,
    });
    expect(tickets).toEqual([]);
  });

  it("emits one armor ticket per damaged location", () => {
    const maxState = makeMaxState("u1");
    const state: IUnitCombatState = {
      ...makeIntactState("u1", maxState),
      // 5 armor lost on LT
      currentArmorPerLocation: {
        ...maxState.maxArmorPerLocation,
        LT: 13,
      },
    };
    const tickets = buildTicketsFromUnitState({
      state,
      maxState,
      matchId: TEST_MATCH_ID,
      createdAt: FIXED_TIMESTAMP,
    });
    expect(tickets).toHaveLength(1);
    const t = tickets[0];
    expect(t.kind).toBe("armor");
    expect(t.location).toBe("LT");
    expect(t.pointsToRestore).toBe(5);
    expect(t.expectedHours).toBeCloseTo(0.5, 5);
    expect(t.partsRequired).toHaveLength(1);
    expect(t.partsRequired[0].partId).toBe("standard-armor-pt");
    expect(t.partsRequired[0].quantity).toBe(5);
    expect(t.partsRequired[0].matched).toBe(false);
    expect(t.source).toBe("combat");
    expect(t.matchId).toBe(TEST_MATCH_ID);
    expect(t.status).toBe("queued");
  });

  it("emits one structure ticket per damaged location", () => {
    const maxState = makeMaxState("u1");
    const state: IUnitCombatState = {
      ...makeIntactState("u1", maxState),
      currentStructurePerLocation: {
        ...maxState.maxStructurePerLocation,
        // CT lost 4 internal structure
        CT: 14,
      },
    };
    const tickets = buildTicketsFromUnitState({
      state,
      maxState,
      matchId: TEST_MATCH_ID,
      createdAt: FIXED_TIMESTAMP,
    });
    expect(tickets).toHaveLength(1);
    const t = tickets[0];
    expect(t.kind).toBe("structure");
    expect(t.location).toBe("CT");
    expect(t.pointsToRestore).toBe(4);
    expect(t.expectedHours).toBeCloseTo(2.0, 5);
  });

  it("emits a structure ticket covering a fully destroyed location", () => {
    const maxState = makeMaxState("u1");
    const state: IUnitCombatState = {
      ...makeIntactState("u1", maxState),
      currentArmorPerLocation: {
        ...maxState.maxArmorPerLocation,
        // LT armor stripped
        LT: 0,
      },
      currentStructurePerLocation: {
        ...maxState.maxStructurePerLocation,
        // LT structure also gone
        LT: 0,
      },
      destroyedLocations: ["LT"],
    };
    const tickets = buildTicketsFromUnitState({
      state,
      maxState,
      matchId: TEST_MATCH_ID,
      createdAt: FIXED_TIMESTAMP,
    });
    // Expect 2 tickets: 1 armor + 1 structure for LT.
    const armorTickets = tickets.filter((t) => t.kind === "armor");
    const structureTickets = tickets.filter((t) => t.kind === "structure");
    expect(armorTickets).toHaveLength(1);
    expect(structureTickets).toHaveLength(1);
    expect(armorTickets[0].pointsToRestore).toBe(18);
    expect(structureTickets[0].pointsToRestore).toBe(12);
  });

  it("emits one component ticket per destroyed component with parts-needed status", () => {
    const maxState = makeMaxState("u1");
    const state: IUnitCombatState = {
      ...makeIntactState("u1", maxState),
      destroyedComponents: [
        {
          location: "RT",
          name: "AC/20",
          slot: 1,
          componentType: "weapon",
          destroyedAt: TEST_MATCH_ID,
        },
      ],
    };
    const tickets = buildTicketsFromUnitState({
      state,
      maxState,
      matchId: TEST_MATCH_ID,
      createdAt: FIXED_TIMESTAMP,
    });
    expect(tickets).toHaveLength(1);
    const t = tickets[0];
    expect(t.kind).toBe("component");
    expect(t.location).toBe("RT");
    expect(t.componentName).toBe("AC/20");
    expect(t.expectedHours).toBe(4);
    expect(t.status).toBe("parts-needed");
    expect(t.partsRequired[0].partId).toBe("AC/20");
  });

  it("emits one ammo ticket per depleted bin", () => {
    const maxState = makeMaxState("u1");
    const state: IUnitCombatState = {
      ...makeIntactState("u1", maxState),
      ammoRemaining: {
        "ac20-rt": 0,
        "srm6-lt": 15, // full
      },
    };
    const tickets = buildTicketsFromUnitState({
      state,
      maxState,
      matchId: TEST_MATCH_ID,
      createdAt: FIXED_TIMESTAMP,
    });
    expect(tickets).toHaveLength(1);
    const t = tickets[0];
    expect(t.kind).toBe("ammo");
    expect(t.ammoBinId).toBe("ac20-rt");
    expect(t.pointsToRestore).toBe(5);
    expect(t.expectedHours).toBe(0.5);
  });

  it("ticket IDs are deterministic on (matchId, unitId, kind)", () => {
    const maxState = makeMaxState("u1");
    const state: IUnitCombatState = {
      ...makeIntactState("u1", maxState),
      currentArmorPerLocation: {
        ...maxState.maxArmorPerLocation,
        LT: 13,
      },
    };
    const first = buildTicketsFromUnitState({
      state,
      maxState,
      matchId: TEST_MATCH_ID,
      createdAt: FIXED_TIMESTAMP,
    });
    const second = buildTicketsFromUnitState({
      state,
      maxState,
      matchId: TEST_MATCH_ID,
      createdAt: FIXED_TIMESTAMP,
    });
    expect(first[0].ticketId).toBe(second[0].ticketId);
  });

  it("emits combined tickets across all kinds when unit is heavily damaged", () => {
    const maxState = makeMaxState("u1");
    const state: IUnitCombatState = {
      ...makeIntactState("u1", maxState),
      currentArmorPerLocation: {
        ...maxState.maxArmorPerLocation,
        LT: 8,
        RT: 4,
      },
      currentStructurePerLocation: {
        ...maxState.maxStructurePerLocation,
        CT: 14,
      },
      destroyedComponents: [
        {
          location: "LA",
          name: "Medium Laser",
          slot: 0,
          componentType: "weapon",
          destroyedAt: TEST_MATCH_ID,
        },
      ],
      ammoRemaining: { "ac20-rt": 0, "srm6-lt": 10 },
    };
    const tickets = buildTicketsFromUnitState({
      state,
      maxState,
      matchId: TEST_MATCH_ID,
      createdAt: FIXED_TIMESTAMP,
    });
    const counts = tickets.reduce<Record<string, number>>((acc, t) => {
      acc[t.kind] = (acc[t.kind] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts.armor).toBe(2);
    expect(counts.structure).toBe(1);
    expect(counts.component).toBe(1);
    expect(counts.ammo).toBe(2);
  });
});

describe("matchPartsAgainstSalvage", () => {
  function ticketNeedingMediumLaser(): IRepairTicket {
    return {
      ticketId: "ticket-1",
      unitId: "u1",
      kind: "component",
      location: "LA",
      componentName: "Medium Laser",
      expectedHours: 4,
      partsRequired: [
        {
          partId: "Medium Laser",
          quantity: 1,
          matched: false,
        },
      ],
      source: "combat",
      matchId: TEST_MATCH_ID,
      createdAt: FIXED_TIMESTAMP,
      status: "parts-needed",
    };
  }

  it("returns the ticket unchanged when no salvage pool is provided", () => {
    const t = ticketNeedingMediumLaser();
    const out = matchPartsAgainstSalvage(t, undefined);
    expect(out).toEqual(t);
  });

  it("returns the ticket unchanged when the salvage pool is empty", () => {
    const t = ticketNeedingMediumLaser();
    const pool: ISalvagePool = { availableParts: [] };
    const out = matchPartsAgainstSalvage(t, pool);
    expect(out).toEqual(t);
  });

  it("marks parts as matched when salvage has enough quantity", () => {
    const t = ticketNeedingMediumLaser();
    const pool: ISalvagePool = {
      availableParts: [
        { partId: "Medium Laser", quantity: 2, inventoryId: "salv-1" },
      ],
    };
    const out = matchPartsAgainstSalvage(t, pool);
    expect(out.partsRequired[0].matched).toBe(true);
    expect(out.partsRequired[0].matchedFromInventoryId).toBe("salv-1");
    // Status flips parts-needed → queued when all parts matched.
    expect(out.status).toBe("queued");
  });

  it("leaves parts unmatched when salvage quantity is insufficient", () => {
    const t: IRepairTicket = {
      ...ticketNeedingMediumLaser(),
      partsRequired: [{ partId: "Medium Laser", quantity: 3, matched: false }],
    };
    const pool: ISalvagePool = {
      availableParts: [
        { partId: "Medium Laser", quantity: 1, inventoryId: "salv-1" },
      ],
    };
    const out = matchPartsAgainstSalvage(t, pool);
    expect(out.partsRequired[0].matched).toBe(false);
    expect(out.status).toBe("parts-needed");
  });

  it("does not mutate the input ticket", () => {
    const t = ticketNeedingMediumLaser();
    const snapshot = JSON.stringify(t);
    const pool: ISalvagePool = {
      availableParts: [
        { partId: "Medium Laser", quantity: 1, inventoryId: "salv-1" },
      ],
    };
    matchPartsAgainstSalvage(t, pool);
    expect(JSON.stringify(t)).toBe(snapshot);
  });
});
