/**
 * Posture Palette source tests (change `tactical-movement-intent-composer`,
 * phase 4, tactical-movement-intent capability, task 4.2). Proves posture
 * legality gating (illegal-for-state not offered), rules-derived MP costs, and
 * Live-Intersection affordability disabling — against the REAL posture-command
 * availability predicates and the movement-system cost helpers (no mocks).
 *
 * Spec scenario "Illegal and unaffordable posture actions are gated":
 *  - a STANDING unit is not offered Stand Up / Careful Stand;
 *  - a legal posture costing more than the remaining budget is disabled.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import {
  GamePhase,
  type IMovementCapability,
  type ITacticalCommandContext,
} from '@/types/gameplay';

import { buildPosturePaletteEntries } from '../posturePaletteSource';

const capability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
  movementMode: 'walk',
  movementHeatProfile: 'mek',
};

function makeContext(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    activeUnitProne: false,
    activeUnitHullDown: false,
    activeUnitHeat: 0,
    movementCapability: capability,
    ...overrides,
  };
}

describe('buildPosturePaletteEntries', () => {
  it('does not offer Stand Up / Careful Stand for a standing unit', () => {
    const entries = buildPosturePaletteEntries({
      capability,
      commandContext: makeContext({ activeUnitProne: false }),
      bestRemainingMp: 6,
    });
    const actions = entries.map((entry) => entry.action);
    expect(actions).not.toContain('STAND_UP');
    expect(actions).not.toContain('CAREFUL_STAND');
  });

  it('offers Stand Up and Careful Stand for a prone unit with rules-derived costs', () => {
    const entries = buildPosturePaletteEntries({
      capability,
      commandContext: makeContext({ activeUnitProne: true }),
      bestRemainingMp: 6,
    });
    const standUp = entries.find((entry) => entry.action === 'STAND_UP');
    const carefulStand = entries.find(
      (entry) => entry.action === 'CAREFUL_STAND',
    );
    expect(standUp).toBeDefined();
    // getStandingCost(normal) with runMP 6 -> 2 MP.
    expect(standUp?.mpCost).toBe(2);
    expect(standUp?.offered).toBe(true);
    expect(standUp?.disabled).toBe(false);
    // getStandingCost(careful) with walkMP 4 (>2) -> whole walk allowance (4).
    expect(carefulStand?.mpCost).toBe(4);
  });

  it('disables a legal posture whose cost exceeds the remaining budget', () => {
    // Prone unit, Careful Stand costs 4 MP, but only 1 MP remains anywhere.
    const entries = buildPosturePaletteEntries({
      capability,
      commandContext: makeContext({ activeUnitProne: true }),
      bestRemainingMp: 1,
    });
    const carefulStand = entries.find(
      (entry) => entry.action === 'CAREFUL_STAND',
    );
    expect(carefulStand?.offered).toBe(true);
    expect(carefulStand?.disabled).toBe(true);
    expect(carefulStand?.disabledReason).toMatch(/Needs 4 MP/);
  });

  it('offers Evade as a posture with zero path MP when legal', () => {
    const entries = buildPosturePaletteEntries({
      capability,
      commandContext: makeContext({ activeUnitProne: false }),
      bestRemainingMp: 0,
    });
    const evade = entries.find((entry) => entry.action === 'EVADE');
    expect(evade).toBeDefined();
    expect(evade?.mpCost).toBe(0);
    // 0-cost Evade is affordable even at 0 remaining MP.
    expect(evade?.disabled).toBe(false);
    expect(evade?.hotkey).toBe('E');
  });

  it('does not offer any posture when it is not the active unit turn', () => {
    const entries = buildPosturePaletteEntries({
      capability,
      commandContext: makeContext({ canAct: false, activeUnitProne: true }),
      bestRemainingMp: 6,
    });
    // Every posture is illegal (not your turn) -> nothing offered.
    expect(entries).toHaveLength(0);
  });
});
