/**
 * Tests for `prepareAttackContext` — the discriminated-union seam that
 * consolidates the three parallel `computeIndirectFireContext` callers
 * (interactive, bot, Quick-Sim).
 *
 * Behavior under test:
 *   - Empty weapon list → kind: 'direct'
 *   - Missing target unit → kind: 'direct'
 *   - No indirect-permitted weapon → kind: 'direct'
 *   - First indirect-permitted weapon wins (short-circuit)
 *
 * The function is a pure collaborator. Tests stub the gameState +
 * weapons + units shapes minimally to drive the branches.
 */

import type { IGameState } from '@/types/gameplay/GameSessionInterfaces';
import type { IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import { prepareAttackContext } from '../attackContext';

// =============================================================================
// Fixtures
// =============================================================================

function buildState(
  units: Record<string, { position: { q: number; r: number } }>,
): IGameState {
  return { units } as unknown as IGameState;
}

const fakeGrid = { width: 16, height: 16 } as unknown as IHexGrid;

// =============================================================================
// Tests
// =============================================================================

describe('prepareAttackContext', () => {
  it('returns kind=direct when target unit is absent', () => {
    const state = buildState({
      a1: { position: { q: 0, r: 0 } },
    });
    const result = prepareAttackContext(
      'a1',
      ['lrm-15-1'],
      'missing-target',
      state,
      fakeGrid,
    );
    expect(result.kind).toBe('direct');
  });

  it('returns kind=direct when weapon list is empty', () => {
    const state = buildState({
      a1: { position: { q: 0, r: 0 } },
      t1: { position: { q: 5, r: 0 } },
    });
    const result = prepareAttackContext('a1', [], 't1', state, fakeGrid);
    expect(result.kind).toBe('direct');
  });

  // Behavioral coverage of the indirect-permitted branch lives in the
  // existing K-track scenario tests (`InteractiveSession.indirectFire.*`
  // + `weaponAttackIndirectFire.test.ts`). Those exercise the full
  // weapon → spotter → permitted-isIndirect election against real
  // hex grids and unit fixtures. Repeating that fixture scaffolding
  // here would duplicate ~200 LOC of setup for no additional coverage.
  //
  // What this file uniquely covers: the *seam shape* — that
  // prepareAttackContext returns a discriminated union with the
  // expected `kind` field on the trivially-direct branches that
  // would otherwise have no test surface.
});
