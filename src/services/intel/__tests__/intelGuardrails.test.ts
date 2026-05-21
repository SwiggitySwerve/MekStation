/**
 * Tests for assertNoLeakedSecrets — the defense-in-depth secret-leak detector
 * called by useUnitInspectorProjection before returning opponent projections.
 *
 * Covers the spec's "exact hidden fields SHALL not be recoverable" requirement
 * (add-configurable-opponent-intel-ui spec §3.1):
 *   - 'hidden' / 'unknown' MUST be 'redacted' kind
 *   - 'silhouette' MUST have null name + chassis
 *   - 'gm' MUST be 'gm' kind
 *   - 'rough' / 'last-known' MUST have null heat/armor/structure
 *   - 'exact' may have all fields
 *   - 'friendly' is unconditionally allowed
 */

import type {
  IFriendlyInspectorView,
  IGmInspectorView,
  IRedactedInspectorView,
  ITargetInspectorView,
} from '@/types/gameplay/TacticalInspectorInterfaces';

import { assertNoLeakedSecrets } from '../intelGuardrails';

// =============================================================================
// Builders for each projection kind
// =============================================================================

function buildRedacted(): IRedactedInspectorView {
  return {
    kind: 'redacted',
    unitId: 'u1',
    contactLabel: 'Unknown Contact',
  };
}

function buildTarget(
  overrides: Partial<ITargetInspectorView> = {},
): ITargetInspectorView {
  return {
    kind: 'target',
    unitId: 'u1',
    name: 'Atlas',
    chassis: 'AS7-D',
    chassisClass: null,
    isExact: true,
    heat: 8,
    damageBand: 'lightly-damaged',
    totalArmorRemaining: 200,
    totalStructureRemaining: 100,
    prone: false,
    shutdown: false,
    destroyed: false,
    intelConfidence: {
      confidence: 'confirmed',
      isOutdated: false,
      lastSeenTurn: 1,
      tier: 'exact',
    },
    ...overrides,
  };
}

function buildSilhouette(
  overrides: Partial<ITargetInspectorView> = {},
): ITargetInspectorView {
  return buildTarget({
    name: null,
    chassis: null,
    chassisClass: 'Assault',
    isExact: false,
    heat: null,
    totalArmorRemaining: null,
    totalStructureRemaining: null,
    shutdown: null,
    intelConfidence: {
      confidence: 'estimated',
      isOutdated: false,
      lastSeenTurn: null,
      tier: 'silhouette',
    },
    ...overrides,
  });
}

function buildGm(): IGmInspectorView {
  return {
    kind: 'gm',
    unitId: 'u1',
    name: 'Atlas',
    chassis: 'AS7-D',
    pilotName: 'Natasha Kerensky',
    gunnery: 2,
    piloting: 3,
    pilotWounds: 0,
    pilotConscious: true,
    heat: 8,
    totalArmorRemaining: 200,
    totalStructureRemaining: 100,
    prone: false,
    shutdown: false,
    destroyed: false,
    damageBand: 'lightly-damaged',
    secretNotes: [],
    intelConfidence: {
      confidence: 'confirmed',
      isOutdated: false,
      lastSeenTurn: 1,
      tier: 'gm',
    },
  };
}

function buildFriendly(): IFriendlyInspectorView {
  return {
    kind: 'friendly',
    unitId: 'u1',
    name: 'Atlas',
    chassis: 'AS7-D',
    pilotName: 'Test Pilot',
    gunnery: 4,
    piloting: 5,
    pilotWounds: 0,
    pilotConscious: true,
    heat: 8,
    totalArmorRemaining: 200,
    totalStructureRemaining: 100,
    prone: false,
    shutdown: false,
    destroyed: false,
    isWithdrawing: false,
    weapons: [],
    criticalEffects: [],
    movementThisTurn: 'walk' as never,
    hexesMoved: 3,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('assertNoLeakedSecrets', () => {
  // -------------------------------------------------------------------------
  // Friendly — always allowed
  // -------------------------------------------------------------------------
  it('always passes for friendly projection regardless of tier', () => {
    const friendly = buildFriendly();
    // Friendly side doesn't have a tier in practice — pass any.
    expect(() => assertNoLeakedSecrets(friendly, 'exact')).not.toThrow();
    expect(() => assertNoLeakedSecrets(friendly, 'hidden')).not.toThrow();
    expect(() => assertNoLeakedSecrets(friendly, 'gm')).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Hidden / unknown — must be redacted kind
  // -------------------------------------------------------------------------
  it('passes when hidden tier produces redacted projection', () => {
    expect(() =>
      assertNoLeakedSecrets(buildRedacted(), 'hidden'),
    ).not.toThrow();
  });

  it('passes when unknown tier produces redacted projection', () => {
    expect(() =>
      assertNoLeakedSecrets(buildRedacted(), 'unknown'),
    ).not.toThrow();
  });

  it('throws when hidden tier returns a target projection (name leaked)', () => {
    expect(() => assertNoLeakedSecrets(buildTarget(), 'hidden')).toThrow(
      /leaked through the intel policy gate/i,
    );
  });

  it('throws when unknown tier returns a gm projection (full leak)', () => {
    expect(() => assertNoLeakedSecrets(buildGm(), 'unknown')).toThrow(
      /leaked through the intel policy gate/i,
    );
  });

  // -------------------------------------------------------------------------
  // Silhouette — must have null name + chassis
  // -------------------------------------------------------------------------
  it('passes when silhouette projection has null name + chassis', () => {
    expect(() =>
      assertNoLeakedSecrets(buildSilhouette(), 'silhouette'),
    ).not.toThrow();
  });

  it('throws when silhouette projection has a name', () => {
    expect(() =>
      assertNoLeakedSecrets(buildSilhouette({ name: 'Atlas' }), 'silhouette'),
    ).toThrow(/non-null 'name' \("Atlas"\).*identity leaked/i);
  });

  it('throws when silhouette projection has a chassis', () => {
    expect(() =>
      assertNoLeakedSecrets(
        buildSilhouette({ chassis: 'AS7-D' }),
        'silhouette',
      ),
    ).toThrow(/non-null 'chassis' \("AS7-D"\).*chassis designator leaked/i);
  });

  it('throws when silhouette tier returns a redacted projection (wrong kind)', () => {
    expect(() => assertNoLeakedSecrets(buildRedacted(), 'silhouette')).toThrow(
      /produced projection kind 'redacted'.*Expected 'target'/i,
    );
  });

  // -------------------------------------------------------------------------
  // GM — must be gm kind
  // -------------------------------------------------------------------------
  it('passes when gm tier returns gm projection', () => {
    expect(() => assertNoLeakedSecrets(buildGm(), 'gm')).not.toThrow();
  });

  it('throws when gm tier returns target projection', () => {
    expect(() => assertNoLeakedSecrets(buildTarget(), 'gm')).toThrow(
      /produced projection kind 'target'.*Expected 'gm'/i,
    );
  });

  // -------------------------------------------------------------------------
  // Rough / last-known — exact numeric fields must be null
  // -------------------------------------------------------------------------
  it('passes when rough projection has nulled exact fields', () => {
    const rough = buildTarget({
      isExact: false,
      heat: null,
      totalArmorRemaining: null,
      totalStructureRemaining: null,
      shutdown: null,
    });
    expect(() => assertNoLeakedSecrets(rough, 'rough')).not.toThrow();
  });

  it('throws when rough projection leaks exact heat value', () => {
    expect(() =>
      assertNoLeakedSecrets(buildTarget({ isExact: false, heat: 12 }), 'rough'),
    ).toThrow(/non-null 'heat' \(12\).*leaked/i);
  });

  it('throws when last-known projection leaks exact armor value', () => {
    expect(() =>
      assertNoLeakedSecrets(
        buildTarget({
          isExact: false,
          heat: null,
          totalArmorRemaining: 200,
          totalStructureRemaining: null,
        }),
        'last-known',
      ),
    ).toThrow(/non-null 'totalArmorRemaining' \(200\).*leaked/i);
  });

  it('throws when rough projection leaks exact structure value', () => {
    expect(() =>
      assertNoLeakedSecrets(
        buildTarget({
          isExact: false,
          heat: null,
          totalArmorRemaining: null,
          totalStructureRemaining: 100,
        }),
        'rough',
      ),
    ).toThrow(/non-null 'totalStructureRemaining' \(100\).*leaked/i);
  });

  // -------------------------------------------------------------------------
  // Exact — all fields allowed
  // -------------------------------------------------------------------------
  it('passes when exact tier returns full target projection', () => {
    expect(() => assertNoLeakedSecrets(buildTarget(), 'exact')).not.toThrow();
  });
});
