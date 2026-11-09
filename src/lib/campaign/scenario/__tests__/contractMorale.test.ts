/**
 * Contract (enemy) morale: the pinned MekHQ rules as pure functions.
 *
 * Every expectation is transcribed from MekHQ e7adc2c `MHQMorale.java` (line
 * numbers in `../contractMorale.ts`). The Java methods need a live `Campaign`
 * and `AbstractContract`, so they cannot be run as an oracle here; the tables
 * are instead checked against the pin's own source text by the M1 evidence
 * script (`w4-k2/m1/pin-table-check.ts`).
 *
 * @spec openspec/changes/add-contract-morale-rules/specs/mission-contracts/spec.md
 */
import { AtBMoraleLevel } from '@/types/campaign/scenario/scenarioTypes';

import {
  DEFAULT_MORALE_MODIFIERS,
  getMoraleOutcome,
  getPerformanceModifier,
  getPerformanceOutcome,
  getReliability,
  getReliabilityModifier,
  minusOneMonth,
  performMoraleCheck,
  RALLYING_TARGET_NUMBER,
  WAVERING_TARGET_NUMBER,
  type IMoraleScenario,
  type IMoraleScenarioStatus,
} from '../contractMorale';
import * as moraleModule from '../morale';

const L = AtBMoraleLevel;

const NO_FLAGS: IMoraleScenarioStatus = {
  decisiveDefeat: false,
  refusedEngagement: false,
  decisiveVictory: false,
  pyrrhicVictory: false,
  fleetInBeing: false,
  overallVictory: false,
  overallDefeat: false,
};
const VICTORY: IMoraleScenarioStatus = { ...NO_FLAGS, overallVictory: true };
const DEFEAT: IMoraleScenarioStatus = { ...NO_FLAGS, overallDefeat: true };
const DECISIVE_VICTORY: IMoraleScenarioStatus = {
  ...NO_FLAGS,
  decisiveVictory: true,
  overallVictory: true,
};
const DECISIVE_DEFEAT: IMoraleScenarioStatus = {
  ...NO_FLAGS,
  decisiveDefeat: true,
  overallDefeat: true,
};
const on = (
  date: string | null,
  status: IMoraleScenarioStatus,
): IMoraleScenario => ({
  date,
  status,
});

describe('getMoraleOutcome (MHQMorale.java:263-299)', () => {
  // [current level, level after RALLYING, level after WAVERING]
  const table: ReadonlyArray<
    readonly [AtBMoraleLevel, AtBMoraleLevel, AtBMoraleLevel]
  > = [
    [L.ROUTED, L.CRITICAL, L.ROUTED],
    [L.CRITICAL, L.WEAKENED, L.ROUTED],
    [L.WEAKENED, L.STALEMATE, L.CRITICAL],
    [L.STALEMATE, L.ADVANCING, L.WEAKENED],
    [L.ADVANCING, L.DOMINATING, L.STALEMATE],
    [L.DOMINATING, L.OVERWHELMING, L.ADVANCING],
    [L.OVERWHELMING, L.OVERWHELMING, L.DOMINATING],
  ];

  it.each(table)(
    '%s: rallies to %s and wavers to %s',
    (level, rally, waver) => {
      expect(getMoraleOutcome(level, 6)).toEqual({
        outcome: 'RALLYING',
        level: rally,
      });
      expect(getMoraleOutcome(level, 8)).toEqual({
        outcome: 'WAVERING',
        level: waver,
      });
      expect(getMoraleOutcome(level, 7)).toEqual({
        outcome: 'UNCHANGED',
        level,
      });
    },
  );

  it('covers every level in the enum', () => {
    expect(table.map(([level]) => level).sort()).toEqual(
      Object.values(L).sort(),
    );
  });

  it('uses the pinned thresholds: <= 6 rallies, 7 holds, >= 8 wavers', () => {
    expect(RALLYING_TARGET_NUMBER).toBe(6);
    expect(WAVERING_TARGET_NUMBER).toBe(8);
    expect(getMoraleOutcome(L.STALEMATE, 5).outcome).toBe('RALLYING');
    expect(getMoraleOutcome(L.STALEMATE, -4).outcome).toBe('RALLYING');
    expect(getMoraleOutcome(L.STALEMATE, 9).outcome).toBe('WAVERING');
    expect(getMoraleOutcome(L.STALEMATE, 20).outcome).toBe('WAVERING');
  });
});

describe('getReliabilityModifier (MHQMorale.java:418-428)', () => {
  // SkillLevel.getAdjustedValue() = experienceLevel - 1: ULTRA_GREEN 0 ... LEGENDARY 6
  it.each([
    [0, 1],
    [1, 1], // GREEN
    [2, 0], // REGULAR
    [3, 0], // VETERAN
    [4, -1], // ELITE
    [5, -1],
    [6, -1],
  ])('adjusted skill %i gives %i', (skill, expected) => {
    expect(getReliabilityModifier(skill)).toBe(expected);
  });
});

describe('getReliability (MHQMorale.java:367-393)', () => {
  const none = {
    isClan: false,
    isRebel: false,
    isMinorPower: false,
    isMercenary: false,
    isPirate: false,
  };

  it('is the skill modifier alone for an ordinary power', () => {
    expect(getReliability(2, none)).toBe(0);
    expect(getReliability(1, none)).toBe(1);
    expect(getReliability(4, none)).toBe(-1);
  });

  it.each(['isRebel', 'isMinorPower', 'isMercenary', 'isPirate'] as const)(
    '%s adds +1 (good for the player)',
    (trait) => {
      expect(getReliability(2, { ...none, [trait]: true })).toBe(1);
      expect(getReliability(4, { ...none, [trait]: true })).toBe(0);
    },
  );

  it('a Clan gets +1 effective skill (capped at LEGENDARY) and then -1', () => {
    const clan = { ...none, isClan: true };
    expect(getReliability(2, clan)).toBe(-1); // skill 3 -> 0, then -1
    expect(getReliability(3, clan)).toBe(-2); // skill 4 -> -1, then -1
    expect(getReliability(0, clan)).toBe(0); // skill 1 -> +1, then -1
    expect(getReliability(6, clan)).toBe(-2); // capped at 6 -> -1, then -1
  });

  it('applies the other traits before the Clan penalty (else-if), keeping the Clan skill boost', () => {
    // MHQMorale.java:383-390: rebel/minor/merc/pirate take the ++ branch and skip the Clan --.
    expect(getReliability(2, { ...none, isClan: true, isPirate: true })).toBe(
      1,
    );
  });
});

describe('minusOneMonth (java.time LocalDate.minusMonths(1))', () => {
  it.each([
    ['2025-03-31', '2025-02-28'],
    ['2024-03-31', '2024-02-29'],
    ['2025-01-15', '2024-12-15'],
    ['2025-05-31', '2025-04-30'],
    ['2025-03-15', '2025-02-15'],
    ['3025-01-01', '3024-12-01'],
  ])('%s -> %s', (from, expected) => {
    expect(minusOneMonth(from)).toBe(expected);
  });
});

describe('getPerformanceModifier (MHQMorale.java:448-528)', () => {
  const m = DEFAULT_MORALE_MODIFIERS;
  const today = '2025-03-31'; // window starts 2025-02-28

  it('uses the pinned campaign-option defaults (CampaignOption.java:1091-1098)', () => {
    expect(m).toEqual({
      decisiveVictory: 2,
      victory: 1,
      defeat: -2,
      decisiveDefeat: -3,
    });
  });

  it('is 0 with no scenarios and on a tie', () => {
    expect(getPerformanceModifier(today, [], m)).toBe(0);
    expect(
      getPerformanceModifier(
        today,
        [on('2025-03-01', VICTORY), on('2025-03-02', DEFEAT)],
        m,
      ),
    ).toBe(0);
  });

  it('counts victories against defeats: decisive at 2:1 or better, plain otherwise', () => {
    const v = (n: number) =>
      Array.from({ length: n }, () => on('2025-03-10', VICTORY));
    const d = (n: number) =>
      Array.from({ length: n }, () => on('2025-03-10', DEFEAT));
    expect(getPerformanceModifier(today, v(1), m)).toBe(2); // 1 >= 0*2
    expect(getPerformanceModifier(today, [...v(2), ...d(1)], m)).toBe(2); // 2 >= 2
    expect(getPerformanceModifier(today, [...v(3), ...d(2)], m)).toBe(1); // 3 < 4
    expect(getPerformanceModifier(today, d(1), m)).toBe(-3);
    expect(getPerformanceModifier(today, [...d(2), ...v(1)], m)).toBe(-3); // 2 >= 2
    expect(getPerformanceModifier(today, [...d(3), ...v(2)], m)).toBe(-2); // 3 < 4
  });

  it('counts a decisive victory as 2 victories and a decisive defeat as 2 defeats', () => {
    expect(
      getPerformanceModifier(
        today,
        [on('2025-03-10', DECISIVE_VICTORY), on('2025-03-11', DEFEAT)],
        m,
      ),
    ).toBe(2); // v2 d1 -> 2 >= 2
    expect(
      getPerformanceModifier(
        today,
        [
          on('2025-03-10', DECISIVE_DEFEAT),
          on('2025-03-11', VICTORY),
          on('2025-03-12', VICTORY),
        ],
        m,
      ),
    ).toBe(0); // d2 v2
  });

  it('counts a refused engagement as 2 defeats and fleet-in-being as 1 defeat', () => {
    const refused = { ...NO_FLAGS, refusedEngagement: true };
    const fleet = { ...NO_FLAGS, fleetInBeing: true };
    expect(getPerformanceModifier(today, [on('2025-03-10', refused)], m)).toBe(
      -3,
    );
    expect(
      getPerformanceModifier(
        today,
        [on('2025-03-10', fleet), on('2025-03-11', VICTORY)],
        m,
      ),
    ).toBe(0); // d1 v1
  });

  it('counts a Pyrrhic victory as one victory and one defeat', () => {
    const pyrrhic = { ...NO_FLAGS, pyrrhicVictory: true, overallVictory: true };
    expect(getPerformanceModifier(today, [on('2025-03-10', pyrrhic)], m)).toBe(
      0,
    );
    expect(
      getPerformanceModifier(
        today,
        [on('2025-03-10', pyrrhic), on('2025-03-11', VICTORY)],
        m,
      ),
    ).toBe(2); // v2 d1
  });

  it('ignores a scenario with no date, and one that is not a result', () => {
    expect(getPerformanceModifier(today, [on(null, VICTORY)], m)).toBe(0);
    expect(getPerformanceModifier(today, [on('2025-03-10', NO_FLAGS)], m)).toBe(
      0,
    );
  });

  it('keeps a scenario on the window start day and drops one a day earlier', () => {
    expect(getPerformanceModifier(today, [on('2025-02-28', VICTORY)], m)).toBe(
      2,
    );
    expect(getPerformanceModifier(today, [on('2025-02-27', VICTORY)], m)).toBe(
      0,
    );
  });

  it('does not bound the window above: a later-dated scenario still counts (pin behaviour)', () => {
    expect(getPerformanceModifier(today, [on('2025-04-20', VICTORY)], m)).toBe(
      2,
    );
  });

  it('honours configured modifiers', () => {
    const custom = {
      decisiveVictory: 5,
      victory: 3,
      defeat: -4,
      decisiveDefeat: -6,
    };
    expect(
      getPerformanceModifier(today, [on('2025-03-10', VICTORY)], custom),
    ).toBe(5);
    expect(
      getPerformanceModifier(
        today,
        [
          on('2025-03-10', VICTORY),
          on('2025-03-11', VICTORY),
          on('2025-03-12', VICTORY),
          on('2025-03-13', DEFEAT),
          on('2025-03-14', DEFEAT),
        ],
        custom,
      ),
    ).toBe(3);
  });
});

describe('getPerformanceOutcome (MHQMorale.java:315-328)', () => {
  const m = DEFAULT_MORALE_MODIFIERS;
  it.each([
    [2, 'DECISIVE_VICTORY'],
    [1, 'VICTORY'],
    [-3, 'DECISIVE_DEFEAT'],
    [-2, 'DEFEAT'],
    [0, 'DRAW'],
    [7, 'DRAW'],
  ])('modifier %i is %s', (modifier, expected) => {
    expect(getPerformanceOutcome(m, modifier)).toBe(expected);
  });

  it('matches by equality in the pinned order, so equal configured modifiers resolve to the first', () => {
    const equal = {
      decisiveVictory: 1,
      victory: 1,
      defeat: -1,
      decisiveDefeat: -1,
    };
    expect(getPerformanceOutcome(equal, 1)).toBe('DECISIVE_VICTORY');
    expect(getPerformanceOutcome(equal, -1)).toBe('DECISIVE_DEFEAT');
  });
});

describe('performMoraleCheck (MHQMorale.java:167-189)', () => {
  const base = {
    today: '2025-03-31',
    modifiers: DEFAULT_MORALE_MODIFIERS,
    reliability: 0,
  };

  it('adds reliability and performance to the 2d6 roll, then applies the table', () => {
    // roll 7 + reliability 0 + decisive victory 2 = 9 -> WAVERING
    const result = performMoraleCheck({
      ...base,
      level: L.STALEMATE,
      roll: 7,
      scenarios: [on('2025-03-10', VICTORY)],
    });
    expect(result).toEqual({
      level: L.WEAKENED,
      outcome: 'WAVERING',
      roll: 7,
      reliability: 0,
      performanceModifier: 2,
      performanceOutcome: 'DECISIVE_VICTORY',
      modifiedRoll: 9,
    });
  });

  it('a recent defeat lowers the total and lets the enemy rally', () => {
    // roll 7 + 0 + decisive defeat -3 = 4 -> RALLYING
    const result = performMoraleCheck({
      ...base,
      level: L.STALEMATE,
      roll: 7,
      scenarios: [on('2025-03-10', DEFEAT)],
    });
    expect(result.modifiedRoll).toBe(4);
    expect(result.outcome).toBe('RALLYING');
    expect(result.level).toBe(L.ADVANCING);
  });

  it('reliability moves the total the same way as the performance modifier', () => {
    const quiet = { ...base, level: L.STALEMATE, scenarios: [] };
    expect(
      performMoraleCheck({ ...quiet, roll: 7, reliability: -1 }).outcome,
    ).toBe('RALLYING');
    expect(
      performMoraleCheck({ ...quiet, roll: 7, reliability: 1 }).outcome,
    ).toBe('WAVERING');
    expect(
      performMoraleCheck({ ...quiet, roll: 7, reliability: 0 }).outcome,
    ).toBe('UNCHANGED');
  });

  it('is pure: the same inputs give the same result and nothing is mutated', () => {
    const scenarios = [on('2025-03-10', VICTORY)];
    const input = { ...base, level: L.ADVANCING, roll: 8, scenarios };
    const a = performMoraleCheck(input);
    const b = performMoraleCheck(input);
    expect(a).toEqual(b);
    expect(scenarios).toEqual([on('2025-03-10', VICTORY)]);
  });
});

describe('the old player-perspective updateMorale is gone', () => {
  it('is not exported from morale.ts (it moved morale the wrong way for an enemy-morale level)', () => {
    expect(
      (moraleModule as Record<string, unknown>).updateMorale,
    ).toBeUndefined();
  });
});
