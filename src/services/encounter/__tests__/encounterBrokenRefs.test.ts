/**
 * encounterBrokenRefs — pure-helper unit tests
 *
 * Pin the truth-table for the broken-reference predicate so the list page
 * (broken-pill rendering) and the detail page (repair banner) share one
 * source of truth. These tests intentionally do NOT touch the DB or any
 * service layer — the helper is pure.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Broken-Reference Detection Helper)
 */

import {
  EncounterStatus,
  type IEncounter,
  type IForceReference,
  TerrainPreset,
} from '@/types/encounter';

import { encounterBrokenRefs } from '../encounterBrokenRefs';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Minimal IEncounter factory — overrides drive the slot under test. The
 * helper is pure so the rest of the encounter shape is irrelevant to the
 * predicate; we still provide valid defaults so `IEncounter` typechecks.
 */
function makeEncounter(overrides: Partial<IEncounter> = {}): IEncounter {
  return {
    id: 'encounter-test',
    name: 'Test',
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

const hydratedForce: IForceReference = {
  forceId: 'force-1',
  forceName: 'Alpha Lance',
  totalBV: 4500,
  unitCount: 4,
};

// =============================================================================
// Truth-table tests
// =============================================================================

describe('encounterBrokenRefs', () => {
  it('reports neither side missing when no forceIds were ever stored', () => {
    const encounter = makeEncounter();
    const result = encounterBrokenRefs(encounter, {
      playerForceId: null,
      opponentForceId: null,
    });
    expect(result).toEqual({
      playerForceMissing: false,
      opponentForceMissing: false,
    });
  });

  it('reports player NOT missing when forceId stored AND playerForce hydrated', () => {
    const encounter = makeEncounter({ playerForce: hydratedForce });
    const result = encounterBrokenRefs(encounter, {
      playerForceId: 'force-1',
      opponentForceId: null,
    });
    expect(result.playerForceMissing).toBe(false);
    expect(result.opponentForceMissing).toBe(false);
  });

  it('reports player missing when forceId stored AND playerForce === null', () => {
    const encounter = makeEncounter({ playerForce: null });
    const result = encounterBrokenRefs(encounter, {
      playerForceId: 'force-deleted',
      opponentForceId: null,
    });
    expect(result.playerForceMissing).toBe(true);
    expect(result.opponentForceMissing).toBe(false);
  });

  it('reports opponent missing when forceId stored AND opponentForce === null', () => {
    const encounter = makeEncounter({ opponentForce: null });
    const result = encounterBrokenRefs(encounter, {
      playerForceId: null,
      opponentForceId: 'force-opp-deleted',
    });
    expect(result.playerForceMissing).toBe(false);
    expect(result.opponentForceMissing).toBe(true);
  });

  it('reports BOTH missing when both forceIds stored AND both hydrated to null', () => {
    const encounter = makeEncounter({
      playerForce: null,
      opponentForce: null,
    });
    const result = encounterBrokenRefs(encounter, {
      playerForceId: 'force-deleted-p',
      opponentForceId: 'force-deleted-o',
    });
    expect(result).toEqual({
      playerForceMissing: true,
      opponentForceMissing: true,
    });
  });

  it('treats undefined playerForce as NOT missing — slot was never set', () => {
    // The predicate is: stored-id-present AND hydrated-to-null. An
    // undefined playerForce means the slot was never populated, NOT that
    // the force was deleted. Spec scenario: "broken-pill is for orphans
    // only".
    const encounter = makeEncounter({ playerForce: undefined });
    const result = encounterBrokenRefs(encounter, {
      playerForceId: null,
      opponentForceId: null,
    });
    expect(result.playerForceMissing).toBe(false);
  });
});
