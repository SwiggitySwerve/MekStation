/**
 * Prestige & Morale fixtures — shared Storybook / test data
 *
 * Sample morale-transition history and per-unit prestige records for the
 * Prestige & Morale surface (CP3 — `add-campaign-refit-and-prestige`).
 *
 * @module components/campaign/command/__fixtures__/prestigeMoraleFixtures
 */

import type {
  IMoraleTransition,
  IUnitPrestige,
} from '@/types/campaign/Prestige';

import { MoraleState } from '@/types/campaign/Prestige';

/** A short morale-transition history — two rises and a fall. */
export const SAMPLE_MORALE_TRANSITIONS: readonly IMoraleTransition[] = [
  {
    from: MoraleState.Steady,
    to: MoraleState.High,
    direction: 'up',
    reason: 'Morale rose: 2 recent victory(s), pay met',
    occurredAt: '3025-02-01T00:00:00.000Z',
  },
  {
    from: MoraleState.High,
    to: MoraleState.Steady,
    direction: 'down',
    reason: 'Morale fell: 1 recent defeat(s), pay missed',
    occurredAt: '3025-02-08T00:00:00.000Z',
  },
  {
    from: MoraleState.Steady,
    to: MoraleState.High,
    direction: 'up',
    reason: 'Morale rose: 3 recent victory(s), pay met',
    occurredAt: '3025-02-15T00:00:00.000Z',
  },
];

/** Per-unit prestige records spanning a wide score range. */
export const SAMPLE_UNIT_PRESTIGE: readonly IUnitPrestige[] = [
  {
    unitId: 'atlas-as7d',
    score: 84,
    history: [
      {
        matchId: 'match-1',
        delta: 12,
        scoreAfter: 62,
        reason: 'Victory, survived intact',
        appliedAt: '3025-02-01T00:00:00.000Z',
      },
      {
        matchId: 'match-3',
        delta: 8,
        scoreAfter: 84,
        reason: 'Victory',
        appliedAt: '3025-02-15T00:00:00.000Z',
      },
    ],
  },
  {
    unitId: 'wolverine-wvr6r',
    score: 47,
    history: [
      {
        matchId: 'match-2',
        delta: -5,
        scoreAfter: 47,
        reason: 'Defeat',
        appliedAt: '3025-02-08T00:00:00.000Z',
      },
    ],
  },
  {
    unitId: 'commando-com2d',
    score: 18,
    history: [
      {
        matchId: 'match-2',
        delta: -18,
        scoreAfter: 18,
        reason: 'Defeat, heavy damage, crew loss',
        appliedAt: '3025-02-08T00:00:00.000Z',
      },
    ],
  },
];
