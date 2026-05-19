/**
 * Tests for the post-battle prestige-update step.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { IUnitPrestige } from '@/types/campaign/Prestige';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';

import { PRESTIGE_DEFAULT } from '@/types/campaign/Prestige';
import {
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionCoreTypes';

import { applyOutcomePrestige } from '../applyOutcomePrestige';

const APPLIED_AT = '3025-02-01T00:00:00.000Z';

function makeDelta(
  unitId: string,
  side: GameSide,
  overrides: Partial<IUnitCombatDelta> = {},
): IUnitCombatDelta {
  return {
    unitId,
    side,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: {},
    internalsRemaining: {},
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
    ...overrides,
  };
}

function makeOutcome(
  winner: 'player' | 'opponent' | 'draw',
  deltas: readonly IUnitCombatDelta[],
): ICombatOutcome {
  return {
    matchId: 'match-1',
    report: { winner },
    unitDeltas: deltas,
  } as unknown as ICombatOutcome;
}

describe('applyOutcomePrestige', () => {
  it('raises prestige for a unit on the winning side', () => {
    const outcome = makeOutcome('player', [
      makeDelta('unit-1', GameSide.Player, {
        finalStatus: UnitFinalStatus.Damaged,
      }),
    ]);
    const result = applyOutcomePrestige(outcome, [], APPLIED_AT);
    const record = result.find((r) => r.unitId === 'unit-1');
    expect(record?.score).toBeGreaterThan(PRESTIGE_DEFAULT);
  });

  it('lowers prestige for a unit on the losing side', () => {
    const outcome = makeOutcome('opponent', [
      makeDelta('unit-1', GameSide.Player, {
        finalStatus: UnitFinalStatus.Crippled,
      }),
    ]);
    const result = applyOutcomePrestige(outcome, [], APPLIED_AT);
    const record = result.find((r) => r.unitId === 'unit-1');
    expect(record?.score).toBeLessThan(PRESTIGE_DEFAULT);
  });

  it('seeds a unit with no prior record at the default before adjusting', () => {
    const outcome = makeOutcome('player', [
      makeDelta('fresh-unit', GameSide.Player),
    ]);
    const result = applyOutcomePrestige(outcome, [], APPLIED_AT);
    const record = result.find((r) => r.unitId === 'fresh-unit');
    expect(record).toBeDefined();
    expect(record?.history).toHaveLength(1);
  });

  it('preserves existing history when updating an existing record', () => {
    const existing: IUnitPrestige = {
      unitId: 'unit-1',
      score: 60,
      history: [
        {
          matchId: 'match-0',
          delta: 10,
          scoreAfter: 60,
          reason: 'Victory',
          appliedAt: '3025-01-01T00:00:00.000Z',
        },
      ],
    };
    const outcome = makeOutcome('player', [
      makeDelta('unit-1', GameSide.Player),
    ]);
    const result = applyOutcomePrestige(outcome, [existing], APPLIED_AT);
    const record = result.find((r) => r.unitId === 'unit-1');
    expect(record?.history).toHaveLength(2);
  });

  it('returns the list unchanged for an outcome with no deltas', () => {
    const outcome = makeOutcome('player', []);
    const current: readonly IUnitPrestige[] = [];
    expect(applyOutcomePrestige(outcome, current, APPLIED_AT)).toBe(current);
  });

  it('treats a draw as a non-win for both sides', () => {
    const outcome = makeOutcome('draw', [makeDelta('unit-1', GameSide.Player)]);
    const result = applyOutcomePrestige(outcome, [], APPLIED_AT);
    const record = result.find((r) => r.unitId === 'unit-1');
    // A draw applies the defeat delta — score must not exceed the default.
    expect(record?.score).toBeLessThanOrEqual(PRESTIGE_DEFAULT);
  });

  it('is deterministic for the same outcome and starting list', () => {
    const outcome = makeOutcome('player', [
      makeDelta('unit-1', GameSide.Player),
    ]);
    const a = applyOutcomePrestige(outcome, [], APPLIED_AT);
    const b = applyOutcomePrestige(outcome, [], APPLIED_AT);
    expect(a).toEqual(b);
  });
});
