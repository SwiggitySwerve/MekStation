/**
 * EncounterService.hydrateEncounter — Orphaned-Reference Repair Tests
 *
 * Pin the contract from the
 * `repair-broken-encounter-drafts → Hydration-Boundary Orphaned-Reference Replacement`
 * requirement:
 *   - Valid stored forceId resolves to IForceReference; no warn fires.
 *   - Stored forceId pointing at a deleted force returns null + warns once
 *     per `${encounterId}:${forceId}:${side}` key.
 *   - Repeated reads of the same orphan stay quiet (dedup).
 *   - `resetEncounterService()` clears the dedup so a fresh test boundary
 *     re-warns on the same orphan.
 *   - Both player + opponent missing → both nulls, two warn calls (one
 *     per side, distinct keys).
 *
 * Uses jest module mocks so the hydration logic runs against an in-memory
 * encounter row + a stub force repo that returns null for the deleted ids.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 */

import {
  EncounterStatus,
  type IEncounter,
  TerrainPreset,
} from '@/types/encounter';
import { type IForce, ForceType, ForceStatus } from '@/types/force';
import { logger } from '@/utils/logger';

// =============================================================================
// Mocks — must be hoisted before importing the service
// =============================================================================

const mockEncounters = new Map<string, IEncounter>();
const mockForces = new Map<string, IForce>();

jest.mock('../../forces/ForceRepository', () => ({
  getForceRepository: () => ({
    getForceById: (id: string) => mockForces.get(id) ?? null,
    getAllForces: () => Array.from(mockForces.values()),
  }),
}));

jest.mock('../EncounterRepository', () => ({
  getEncounterRepository: () => ({
    getEncounterById: (id: string) => mockEncounters.get(id) ?? null,
    getAllEncounters: () => Array.from(mockEncounters.values()),
    getEncountersByStatus: (status: EncounterStatus) =>
      Array.from(mockEncounters.values()).filter((e) => e.status === status),
    initialize: jest.fn(),
  }),
  EncounterRepository: class {},
}));

jest.mock('../../pilots/PilotService', () => ({
  getPilotService: () => ({ getPilot: () => null }),
}));

// Import AFTER mocks
import {
  getEncounterService,
  resetEncounterService,
} from '../EncounterService';

// =============================================================================
// Fixtures
// =============================================================================

function makeEncounter(overrides: Partial<IEncounter> = {}): IEncounter {
  return {
    id: 'encounter-fix',
    name: 'Hydration Fixture',
    status: EncounterStatus.Draft,
    template: undefined,
    playerForce: undefined,
    opponentForce: undefined,
    opForConfig: undefined,
    mapConfig: {
      radius: 6,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [],
    optionalRules: [],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeForce(id: string, name: string): IForce {
  return {
    id,
    name,
    forceType: ForceType.Lance,
    status: ForceStatus.Active,
    childIds: [],
    assignments: [],
    stats: {
      totalBV: 4500,
      totalTonnage: 200,
      assignedPilots: 4,
      assignedUnits: 4,
      emptySlots: 0,
      averageSkill: { gunnery: 4, piloting: 5 },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

// =============================================================================
// Suite
// =============================================================================

describe('EncounterService.hydrateEncounter — orphaned reference repair', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockEncounters.clear();
    mockForces.clear();
    resetEncounterService();
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('hydrates a valid forceId without warning', () => {
    mockForces.set('force-good', makeForce('force-good', 'Alpha Lance'));
    mockEncounters.set(
      'enc-1',
      makeEncounter({
        id: 'enc-1',
        playerForce: {
          forceId: 'force-good',
          forceName: '',
          totalBV: 0,
          unitCount: 0,
        },
      }),
    );

    const result = getEncounterService().getEncounter('enc-1');

    expect(result?.playerForce).toEqual({
      forceId: 'force-good',
      forceName: 'Alpha Lance',
      totalBV: 4500,
      unitCount: 4,
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('replaces an orphaned playerForce with null and warns once', () => {
    // No mockForces.set — getForceById will return null for the stored id.
    mockEncounters.set(
      'enc-orphan-p',
      makeEncounter({
        id: 'enc-orphan-p',
        playerForce: {
          forceId: 'force-deleted',
          forceName: '',
          totalBV: 0,
          unitCount: 0,
        },
      }),
    );

    const result = getEncounterService().getEncounter('enc-orphan-p');

    expect(result?.playerForce).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[encounter] orphaned force reference',
      {
        encounterId: 'enc-orphan-p',
        forceId: 'force-deleted',
        side: 'player',
      },
    );
  });

  it('dedups the warn — second read of the same orphan stays quiet', () => {
    mockEncounters.set(
      'enc-orphan-dedup',
      makeEncounter({
        id: 'enc-orphan-dedup',
        playerForce: {
          forceId: 'force-deleted',
          forceName: '',
          totalBV: 0,
          unitCount: 0,
        },
      }),
    );

    const service = getEncounterService();
    service.getEncounter('enc-orphan-dedup');
    service.getEncounter('enc-orphan-dedup');
    service.getEncounter('enc-orphan-dedup');

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('re-warns after resetEncounterService() clears the dedup Set', () => {
    mockEncounters.set(
      'enc-orphan-reset',
      makeEncounter({
        id: 'enc-orphan-reset',
        playerForce: {
          forceId: 'force-deleted',
          forceName: '',
          totalBV: 0,
          unitCount: 0,
        },
      }),
    );

    getEncounterService().getEncounter('enc-orphan-reset');
    expect(warnSpy).toHaveBeenCalledTimes(1);

    resetEncounterService();

    getEncounterService().getEncounter('enc-orphan-reset');
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('null-replaces both sides and warns once per side when both are orphans', () => {
    mockEncounters.set(
      'enc-orphan-both',
      makeEncounter({
        id: 'enc-orphan-both',
        playerForce: {
          forceId: 'force-deleted-p',
          forceName: '',
          totalBV: 0,
          unitCount: 0,
        },
        opponentForce: {
          forceId: 'force-deleted-o',
          forceName: '',
          totalBV: 0,
          unitCount: 0,
        },
      }),
    );

    const result = getEncounterService().getEncounter('enc-orphan-both');

    expect(result?.playerForce).toBeNull();
    expect(result?.opponentForce).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(2);
    // Distinct (encounterId, forceId, side) keys for the two warns
    expect(warnSpy).toHaveBeenCalledWith(
      '[encounter] orphaned force reference',
      expect.objectContaining({ side: 'player', forceId: 'force-deleted-p' }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[encounter] orphaned force reference',
      expect.objectContaining({ side: 'opponent', forceId: 'force-deleted-o' }),
    );
  });
});
