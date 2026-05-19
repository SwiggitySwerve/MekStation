/**
 * Tests for the prestige scorer.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { IUnitPrestige } from '@/types/campaign/Prestige';
import type { IUnitCombatDelta } from '@/types/combat/CombatOutcome';

import {
  PRESTIGE_DEFAULT,
  PRESTIGE_MAX,
  PRESTIGE_MIN,
} from '@/types/campaign/Prestige';
import {
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionCoreTypes';

import {
  adjustPrestige,
  createDefaultUnitPrestige,
  deriveUnitPrestigeSignal,
} from '../prestigeScorer';

const APPLIED_AT = '3025-02-01T00:00:00.000Z';

function makeDelta(
  overrides: Partial<IUnitCombatDelta> = {},
): IUnitCombatDelta {
  return {
    unitId: 'unit-1',
    side: GameSide.Player,
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

describe('createDefaultUnitPrestige', () => {
  it('seeds a unit at the default score with empty history', () => {
    const prestige = createDefaultUnitPrestige('unit-1');
    expect(prestige.score).toBe(PRESTIGE_DEFAULT);
    expect(prestige.history).toEqual([]);
  });
});

describe('deriveUnitPrestigeSignal', () => {
  it('flags a destroyed unit', () => {
    const signal = deriveUnitPrestigeSignal(
      makeDelta({ destroyed: true, finalStatus: UnitFinalStatus.Destroyed }),
      false,
      'match-1',
      APPLIED_AT,
    );
    expect(signal.destroyed).toBe(true);
    expect(signal.heavyDamage).toBe(false);
  });

  it('flags heavy damage for a crippled unit', () => {
    const signal = deriveUnitPrestigeSignal(
      makeDelta({ finalStatus: UnitFinalStatus.Crippled }),
      true,
      'match-1',
      APPLIED_AT,
    );
    expect(signal.heavyDamage).toBe(true);
    expect(signal.destroyed).toBe(false);
  });

  it('flags crew loss when the pilot was killed', () => {
    const signal = deriveUnitPrestigeSignal(
      makeDelta({
        pilotState: {
          conscious: false,
          wounds: 6,
          killed: true,
          finalStatus: PilotFinalStatus.KIA,
        },
      }),
      false,
      'match-1',
      APPLIED_AT,
    );
    expect(signal.crewLost).toBe(true);
  });
});

describe('adjustPrestige', () => {
  const base: IUnitPrestige = {
    unitId: 'unit-1',
    score: 50,
    history: [],
  };

  it('raises prestige on a victory', () => {
    const signal = deriveUnitPrestigeSignal(
      makeDelta({ finalStatus: UnitFinalStatus.Damaged }),
      true,
      'match-1',
      APPLIED_AT,
    );
    const next = adjustPrestige(base, signal);
    expect(next.score).toBeGreaterThan(base.score);
    expect(next.history).toHaveLength(1);
  });

  it('lowers prestige on heavy damage', () => {
    const signal = deriveUnitPrestigeSignal(
      makeDelta({ finalStatus: UnitFinalStatus.Crippled }),
      false,
      'match-1',
      APPLIED_AT,
    );
    const next = adjustPrestige(base, signal);
    expect(next.score).toBeLessThan(base.score);
  });

  it('clamps the score at the maximum bound', () => {
    const atMax: IUnitPrestige = { ...base, score: PRESTIGE_MAX };
    const signal = deriveUnitPrestigeSignal(
      makeDelta({ finalStatus: UnitFinalStatus.Intact }),
      true,
      'match-1',
      APPLIED_AT,
    );
    const next = adjustPrestige(atMax, signal);
    expect(next.score).toBe(PRESTIGE_MAX);
  });

  it('clamps the score at the minimum bound', () => {
    const atMin: IUnitPrestige = { ...base, score: PRESTIGE_MIN };
    const signal = deriveUnitPrestigeSignal(
      makeDelta({ destroyed: true, finalStatus: UnitFinalStatus.Destroyed }),
      false,
      'match-1',
      APPLIED_AT,
    );
    const next = adjustPrestige(atMin, signal);
    expect(next.score).toBe(PRESTIGE_MIN);
  });

  it('is deterministic — the same signal yields the same result', () => {
    const signal = deriveUnitPrestigeSignal(
      makeDelta({ finalStatus: UnitFinalStatus.Damaged }),
      true,
      'match-1',
      APPLIED_AT,
    );
    expect(adjustPrestige(base, signal)).toEqual(adjustPrestige(base, signal));
  });

  it('does not mutate the input prestige record', () => {
    const signal = deriveUnitPrestigeSignal(
      makeDelta(),
      true,
      'match-1',
      APPLIED_AT,
    );
    adjustPrestige(base, signal);
    expect(base.score).toBe(50);
    expect(base.history).toEqual([]);
  });
});
