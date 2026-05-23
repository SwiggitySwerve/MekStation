/**
 * Forward Observer SPA — indirect fire penalty cancellation tests.
 *
 * Covers the §2 Forward Observer SPA scenarios from the
 * add-indirect-fire-and-spotter-network change:
 *   - Walking spotter WITHOUT FO SPA → toHitPenalty=2 (base+1 + walked+1)
 *   - Walking spotter WITH FO SPA    → toHitPenalty=1 (base+1; walked add cancelled)
 *   - Stationary spotter WITH FO SPA → toHitPenalty=1 (FO is a no-op for stationary)
 *
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md#forward-observer-spa
 */

import { MovementType } from '@/types/gameplay';
import { IHex, IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import {
  IIndirectFireRequest,
  ISpotterCandidate,
  resolveIndirectFire,
} from '../indirectFire';

// =============================================================================
// Fixtures
// =============================================================================

function makeHex(q: number, r: number, terrain = 'clear', elevation = 0): IHex {
  return { coord: { q, r }, occupantId: null, terrain, elevation };
}

function makeClearGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -5; q <= 10; q++) {
    for (let r = -5; r <= 10; r++) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  return { config: { radius: 10 }, hexes };
}

function makeSpotter(
  overrides: Partial<ISpotterCandidate> = {},
): ISpotterCandidate {
  return {
    entityId: 'spotter-1',
    teamId: 'team-A',
    position: { q: 2, r: 0 },
    movementType: MovementType.Stationary,
    isOperational: true,
    ...overrides,
  };
}

function makeRequest(spotter: ISpotterCandidate): IIndirectFireRequest {
  return {
    attackerEntityId: 'attacker-1',
    attackerTeamId: 'team-A',
    attackerPosition: { q: 0, r: 0 },
    targetPosition: { q: 5, r: 0 },
    weaponId: 'lrm-15',
    // Attacker has no LOS — indirect fire path exercises penalty arithmetic.
    attackerHasLOS: false,
    spotterCandidates: [spotter],
    grid: makeClearGrid(),
  };
}

// =============================================================================
// Forward Observer SPA — penalty cancellation
// =============================================================================

describe('Forward Observer SPA (indirectFire helper)', () => {
  // §2 Scenario: FO spotter walked — no penalty add
  it('walking spotter WITHOUT FO SPA incurs base+1 + walked+1 = toHitPenalty 2', () => {
    const spotter = makeSpotter({ movementType: MovementType.Walk });
    const result = resolveIndirectFire(makeRequest(spotter));

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.spotterWalked).toBe(true);
    expect(result.toHitPenalty).toBe(2);
    expect(result.forwardObserverApplied).toBe(false);
  });

  it('walking spotter WITH FO SPA cancels walked add — toHitPenalty is 1 (base only)', () => {
    const spotter = makeSpotter({
      movementType: MovementType.Walk,
      pilotSpas: ['forward_observer'],
    });
    const result = resolveIndirectFire(makeRequest(spotter));

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    // spotterWalked still true — FO cancels the penalty add but the fact stays
    expect(result.spotterWalked).toBe(true);
    expect(result.toHitPenalty).toBe(1);
    expect(result.forwardObserverApplied).toBe(true);
  });

  // §2 Scenario: FO is a no-op when spotter is stationary
  it('stationary spotter WITH FO SPA — FO is a no-op, toHitPenalty still 1 (base only)', () => {
    const spotter = makeSpotter({
      movementType: MovementType.Stationary,
      pilotSpas: ['forward_observer'],
    });
    const result = resolveIndirectFire(makeRequest(spotter));

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.spotterWalked).toBe(false);
    expect(result.toHitPenalty).toBe(1);
    expect(result.forwardObserverApplied).toBe(false);
  });

  // FO does NOT override run/jump ineligibility — spot-check
  it('running spotter WITH FO SPA remains ineligible — attack rejected (no valid spotter)', () => {
    const spotter = makeSpotter({
      movementType: MovementType.Run,
      pilotSpas: ['forward_observer'],
    });
    const result = resolveIndirectFire(makeRequest(spotter));

    // Running spotter is screened by isEligibleSpotter before FO logic runs.
    expect(result.permitted).toBe(false);
  });

  // pilotSpas undefined (legacy call site) — no regression
  it('spotter with pilotSpas undefined behaves as no-FO (backward compat)', () => {
    const spotter = makeSpotter({
      movementType: MovementType.Walk,
      pilotSpas: undefined,
    });
    const result = resolveIndirectFire(makeRequest(spotter));

    expect(result.permitted).toBe(true);
    expect(result.toHitPenalty).toBe(2);
    expect(result.forwardObserverApplied).toBe(false);
  });

  it('Oblique Attacker on the firing pilot reduces the indirect-fire penalty by 1', () => {
    const spotter = makeSpotter({ movementType: MovementType.Stationary });
    const result = resolveIndirectFire({
      ...makeRequest(spotter),
      attackerPilotSpas: ['oblique-attacker'],
    });

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.toHitPenalty).toBe(0);
    expect(result.obliqueAttackerApplied).toBe(true);
  });

  it('Oblique Attacker stacks with walked-spotter penalty arithmetic', () => {
    const spotter = makeSpotter({ movementType: MovementType.Walk });
    const result = resolveIndirectFire({
      ...makeRequest(spotter),
      attackerPilotSpas: ['oblique_attacker'],
    });

    expect(result.permitted).toBe(true);
    expect(result.spotterWalked).toBe(true);
    expect(result.toHitPenalty).toBe(1);
    expect(result.obliqueAttackerApplied).toBe(true);
  });
});
