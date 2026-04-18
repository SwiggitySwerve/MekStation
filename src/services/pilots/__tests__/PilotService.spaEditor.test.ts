/**
 * PilotService — SPA editor (Phase 5 Wave 2a) unit tests.
 *
 * Covers `purchaseSPA` + `removeSPA` per `add-pilot-spa-editor-integration`
 * task list section 10. The repository is mocked in-memory so the tests
 * run without SQLite and validate the service logic + error codes
 * end-to-end.
 *
 * Scenarios pinned here:
 *   - Standard purchase deducts XP from the pool.
 *   - Insufficient XP rejects with the right error code.
 *   - Flaw purchase credits XP without inflating totalXpEarned.
 *   - Origin-only purchase outside creation flow is rejected.
 *   - Removal outside creation flow is rejected.
 *   - Removal inside creation flow refunds the recorded XP.
 *
 * @spec openspec/changes/add-pilot-spa-editor-integration/tasks.md
 */

import {
  IPilot,
  IPilotAbilityDesignation,
  IPilotIdentity,
  PilotStatus,
  PilotType,
} from '@/types/pilot';

import { IPilotOperationResult, PilotErrorCode } from '../PilotRepository';

// =============================================================================
// In-memory repository mock
// =============================================================================
//
// Hoisted alongside the existing PilotService.test mock so we don't have
// to duplicate the SQLiteService bootstrap. Implements only the methods
// `purchaseSPA` / `removeSPA` reach for.

const mockPilots = new Map<string, IPilot>();
let idCounter = 0;

const mockRepo = {
  create: jest.fn(
    (options: {
      identity: IPilotIdentity;
      type: PilotType;
      skills: { gunnery: number; piloting: number };
      startingXp?: number;
      abilityIds?: readonly string[];
    }): IPilotOperationResult => {
      const id = `pilot-${++idCounter}`;
      const now = new Date().toISOString();
      const pilot: IPilot = {
        id,
        name: options.identity.name,
        type: options.type,
        status: PilotStatus.Active,
        skills: options.skills,
        wounds: 0,
        abilities: (options.abilityIds || []).map((abilityId) => ({
          abilityId,
          acquiredDate: now,
        })),
        career: {
          missionsCompleted: 0,
          victories: 0,
          defeats: 0,
          draws: 0,
          totalKills: 0,
          killRecords: [],
          missionHistory: [],
          xp: options.startingXp ?? 0,
          totalXpEarned: options.startingXp ?? 0,
          rank: 'MechWarrior',
        },
        createdAt: now,
        updatedAt: now,
      };
      mockPilots.set(id, pilot);
      return { success: true, id };
    },
  ),

  getById: jest.fn((id: string): IPilot | null => mockPilots.get(id) ?? null),

  exists: jest.fn((id: string): boolean => mockPilots.has(id)),

  update: jest.fn(
    (id: string, updates: Partial<IPilot>): IPilotOperationResult => {
      const pilot = mockPilots.get(id);
      if (!pilot)
        return {
          success: false,
          error: 'not found',
          errorCode: PilotErrorCode.NotFound,
        };
      mockPilots.set(id, {
        ...pilot,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return { success: true, id };
    },
  ),

  spendXp: jest.fn((pilotId: string, amount: number): IPilotOperationResult => {
    const pilot = mockPilots.get(pilotId);
    if (!pilot || !pilot.career)
      return {
        success: false,
        error: 'no career',
        errorCode: PilotErrorCode.NotFound,
      };
    if (pilot.career.xp < amount)
      return {
        success: false,
        error: `Insufficient XP. Have ${pilot.career.xp}, need ${amount}`,
        errorCode: PilotErrorCode.InsufficientXp,
      };
    mockPilots.set(pilotId, {
      ...pilot,
      career: { ...pilot.career, xp: pilot.career.xp - amount },
    });
    return { success: true, id: pilotId };
  }),

  // refundXp credits the spendable pool without touching totalXpEarned.
  refundXp: jest.fn(
    (pilotId: string, amount: number): IPilotOperationResult => {
      const pilot = mockPilots.get(pilotId);
      if (!pilot || !pilot.career)
        return {
          success: false,
          error: 'no career',
          errorCode: PilotErrorCode.NotFound,
        };
      mockPilots.set(pilotId, {
        ...pilot,
        career: { ...pilot.career, xp: pilot.career.xp + amount },
      });
      return { success: true, id: pilotId };
    },
  ),

  addAbility: jest.fn(
    (
      pilotId: string,
      abilityId: string,
      _gameId?: string,
      designation?: IPilotAbilityDesignation,
      xpSpent?: number,
    ): IPilotOperationResult => {
      const pilot = mockPilots.get(pilotId);
      if (!pilot)
        return {
          success: false,
          error: 'not found',
          errorCode: PilotErrorCode.NotFound,
        };
      mockPilots.set(pilotId, {
        ...pilot,
        abilities: [
          ...pilot.abilities,
          {
            abilityId,
            acquiredDate: new Date().toISOString(),
            designation,
            xpSpent,
          },
        ],
      });
      return { success: true, id: pilotId };
    },
  ),

  removeAbility: jest.fn(
    (pilotId: string, abilityId: string): IPilotOperationResult => {
      const pilot = mockPilots.get(pilotId);
      if (!pilot)
        return {
          success: false,
          error: 'not found',
          errorCode: PilotErrorCode.NotFound,
        };
      mockPilots.set(pilotId, {
        ...pilot,
        abilities: pilot.abilities.filter((a) => a.abilityId !== abilityId),
      });
      return { success: true, id: pilotId };
    },
  ),
};

jest.mock('../PilotRepository', () => ({
  getPilotRepository: () => mockRepo,
  PilotErrorCode: {
    NotFound: 'NOT_FOUND',
    DuplicateName: 'DUPLICATE_NAME',
    ValidationError: 'VALIDATION_ERROR',
    DatabaseError: 'DATABASE_ERROR',
    InsufficientXp: 'INSUFFICIENT_XP',
  },
}));

import { getAllSPAs, getPurchasableSPAs } from '@/lib/spa';

// Import AFTER mock so PilotService binds to it.
import { PilotService, resetPilotService } from '../PilotService';

// =============================================================================
// Helpers
// =============================================================================

function makePilot(startingXp: number): IPilot {
  resetPilotService();
  const result = mockRepo.create({
    identity: { name: 'Test Pilot' },
    type: PilotType.Persistent,
    skills: { gunnery: 4, piloting: 5 },
    startingXp,
  });
  return mockPilots.get(result.id!)!;
}

// Pull the cheapest purchasable SPA so XP arithmetic stays predictable.
function getCheapPurchasable() {
  return getPurchasableSPAs()
    .filter((s) => s.xpCost !== null && s.xpCost > 0 && !s.isOriginOnly)
    .sort((a, b) => (a.xpCost ?? 0) - (b.xpCost ?? 0))[0];
}

function getOriginOnly() {
  return getAllSPAs().find((s) => s.isOriginOnly);
}

function getFlaw() {
  return getAllSPAs().find(
    (s) => s.isFlaw && s.xpCost !== null && s.xpCost < 0,
  );
}

beforeEach(() => {
  mockPilots.clear();
  idCounter = 0;
  jest.clearAllMocks();
});

// =============================================================================
// purchaseSPA
// =============================================================================

describe('PilotService.purchaseSPA', () => {
  it('debits XP from the pilot pool on a standard purchase', () => {
    const spa = getCheapPurchasable();
    expect(spa).toBeDefined();
    const cost = spa.xpCost!;
    const pilot = makePilot(cost + 50);
    const service = new PilotService();

    const result = service.purchaseSPA(pilot.id, spa.id);

    expect(result.success).toBe(true);
    const updated = mockPilots.get(pilot.id)!;
    expect(updated.career!.xp).toBe(50);
    expect(updated.abilities.some((a) => a.abilityId === spa.id)).toBe(true);
  });

  it('rejects when the pilot lacks the required XP', () => {
    const spa = getCheapPurchasable();
    const cost = spa.xpCost!;
    // One XP short of affordable.
    const pilot = makePilot(cost - 1);
    const service = new PilotService();

    const result = service.purchaseSPA(pilot.id, spa.id);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(PilotErrorCode.InsufficientXp);
    expect(mockPilots.get(pilot.id)!.abilities).toHaveLength(0);
  });

  it('credits XP when purchasing a flaw inside the creation flow', () => {
    const flaw = getFlaw();
    expect(flaw).toBeDefined();
    const grant = Math.abs(flaw!.xpCost!);
    const pilot = makePilot(0);
    const service = new PilotService();

    const result = service.purchaseSPA(pilot.id, flaw!.id, {
      isCreationFlow: true,
    });

    expect(result.success).toBe(true);
    const updated = mockPilots.get(pilot.id)!;
    expect(updated.career!.xp).toBe(grant);
    // totalXpEarned MUST remain at the original starting value — flaws
    // grant spendable XP but aren't lifetime-earned XP.
    expect(updated.career!.totalXpEarned).toBe(0);
  });

  it('rejects flaw purchase outside the creation flow', () => {
    const flaw = getFlaw();
    const pilot = makePilot(0);
    const service = new PilotService();

    const result = service.purchaseSPA(pilot.id, flaw!.id);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(PilotErrorCode.ValidationError);
    expect(result.error).toMatch(/creation/i);
  });

  it('rejects origin-only entries when not in the creation flow', () => {
    const origin = getOriginOnly();
    expect(origin).toBeDefined();
    const pilot = makePilot(500);
    const service = new PilotService();

    const result = service.purchaseSPA(pilot.id, origin!.id);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(PilotErrorCode.ValidationError);
    expect(result.error).toMatch(/creation/i);
  });

  it('accepts origin-only entries inside the creation flow', () => {
    const origin = getOriginOnly();
    const pilot = makePilot(500);
    const service = new PilotService();

    const result = service.purchaseSPA(pilot.id, origin!.id, {
      isCreationFlow: true,
    });

    expect(result.success).toBe(true);
    expect(
      mockPilots
        .get(pilot.id)!
        .abilities.some((a) => a.abilityId === origin!.id),
    ).toBe(true);
  });

  it('persists the designation payload alongside the ability', () => {
    const spa = getCheapPurchasable();
    const pilot = makePilot(500);
    const service = new PilotService();
    const designation: IPilotAbilityDesignation = {
      kind: 'weapon_type',
      value: 'PPC',
    };

    const result = service.purchaseSPA(pilot.id, spa.id, { designation });

    expect(result.success).toBe(true);
    const ref = mockPilots
      .get(pilot.id)!
      .abilities.find((a) => a.abilityId === spa.id);
    expect(ref?.designation).toEqual(designation);
  });
});

// =============================================================================
// removeSPA
// =============================================================================

describe('PilotService.removeSPA', () => {
  it('rejects removal outside the creation flow', () => {
    const spa = getCheapPurchasable();
    const cost = spa.xpCost!;
    const pilot = makePilot(cost);
    const service = new PilotService();

    service.purchaseSPA(pilot.id, spa.id);
    const result = service.removeSPA(pilot.id, spa.id);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(PilotErrorCode.ValidationError);
    // The ability must remain on the pilot — removal was rejected.
    expect(
      mockPilots.get(pilot.id)!.abilities.some((a) => a.abilityId === spa.id),
    ).toBe(true);
  });

  it('refunds the recorded XP when removing inside the creation flow', () => {
    const spa = getCheapPurchasable();
    const cost = spa.xpCost!;
    const pilot = makePilot(cost + 100);
    const service = new PilotService();

    service.purchaseSPA(pilot.id, spa.id);
    expect(mockPilots.get(pilot.id)!.career!.xp).toBe(100);

    const result = service.removeSPA(pilot.id, spa.id, {
      isCreationFlow: true,
    });

    expect(result.success).toBe(true);
    // XP should be back to (initial - cost) + cost = initial.
    expect(mockPilots.get(pilot.id)!.career!.xp).toBe(cost + 100);
    expect(mockPilots.get(pilot.id)!.abilities).toHaveLength(0);
  });

  it('claws back credit when removing a flaw inside the creation flow', () => {
    const flaw = getFlaw();
    const grant = Math.abs(flaw!.xpCost!);
    const pilot = makePilot(0);
    const service = new PilotService();

    service.purchaseSPA(pilot.id, flaw!.id, { isCreationFlow: true });
    expect(mockPilots.get(pilot.id)!.career!.xp).toBe(grant);

    const result = service.removeSPA(pilot.id, flaw!.id, {
      isCreationFlow: true,
    });

    expect(result.success).toBe(true);
    expect(mockPilots.get(pilot.id)!.career!.xp).toBe(0);
  });
});
