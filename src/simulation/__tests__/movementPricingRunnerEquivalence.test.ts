import { v4 as uuid } from 'uuid';

import type { ISimulationRunResult } from '../runner/types';

import { MoveAI } from '../ai/MoveAI';
import { SimulationRunner } from '../runner/SimulationRunner';
import { referenceMoveCandidates } from './movementPricingReference.test-helpers';

// Control only the unseeded envelope UUID source. Resetting its call count
// before each run keeps IDs comparable and still detects extra/reordered IDs.
jest.mock('uuid', () => {
  const v4 = jest.fn<string, []>();
  v4.mockImplementation(
    () =>
      `00000000-0000-4000-8000-${v4.mock.calls.length.toString(16).padStart(12, '0')}`,
  );
  return { v4 };
});

/**
 * Only these explicitly enumerated diagnostics may vary. Spread every other
 * result/envelope field, retaining IDs, payloads, side, sequence, anomalies,
 * violations, terminal state and any new fields. No recursive key stripping.
 */
function normalizeDiagnostics(
  result: ISimulationRunResult,
): ISimulationRunResult {
  expect(Number.isFinite(result.durationMs)).toBe(true);
  return {
    ...result,
    durationMs: 0,
    events: result.events.map((event) => {
      expect(Number.isFinite(Date.parse(event.timestamp))).toBe(true);
      return { ...event, timestamp: '2000-01-01T00:00:00.000Z' };
    }),
    anomalies: result.anomalies.map((anomaly) => {
      expect(Number.isFinite(anomaly.timestamp)).toBe(true);
      return { ...anomaly, timestamp: 0 };
    }),
    keyMoments: result.keyMoments.map((moment) => {
      expect(Number.isFinite(moment.timestamp)).toBe(true);
      return { ...moment, timestamp: 0 };
    }),
  };
}

describe('runner events and outcomes match the old candidate implementation', () => {
  it.each([
    {
      seed: 1,
      turnLimit: 10,
      mapRadius: 3,
      unitCount: { player: 2, opponent: 2 },
    },
    {
      seed: 42,
      turnLimit: 10,
      mapRadius: 5,
      unitCount: { player: 2, opponent: 2 },
    },
    {
      seed: 77777,
      turnLimit: 10,
      mapRadius: 4,
      unitCount: { player: 2, opponent: 2 },
    },
    {
      seed: 98765,
      turnLimit: 100,
      mapRadius: 5,
      unitCount: { player: 1, opponent: 1 },
    },
  ])('seed $seed', (config) => {
    jest.mocked(uuid).mockClear();
    const current = new SimulationRunner(config.seed, undefined, {
      longGameTurns: 1,
    }).run(config);
    const legacy = jest
      .spyOn(MoveAI.prototype, 'getValidMoves')
      .mockImplementation(referenceMoveCandidates);
    try {
      jest.mocked(uuid).mockClear();
      const reference = new SimulationRunner(config.seed, undefined, {
        longGameTurns: 1,
      }).run(config);
      expect(legacy).toHaveBeenCalled();
      expect(normalizeDiagnostics(current)).toStrictEqual(
        normalizeDiagnostics(reference),
      );
    } finally {
      legacy.mockRestore();
    }
  });
});
