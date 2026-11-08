import {
  advanceEmpShutdownTurns,
  canAttemptHeatStartup,
} from '../shutdownStartup';

describe('heat startup eligibility characterization', () => {
  it.each([0, 13, 14, 29])('permits a shut-down unit at heat %s', (heat) => {
    expect(canAttemptHeatStartup({ shutdown: true }, heat)).toBe(true);
  });

  it.each([29.5, 30, 50])('blocks startup at heat %s', (heat) => {
    expect(canAttemptHeatStartup({ shutdown: true }, heat)).toBe(false);
  });

  it('does not attempt startup for an operating unit', () => {
    expect(canAttemptHeatStartup({ shutdown: false }, 0)).toBe(false);
  });
});

describe('EMP shutdown countdown characterization', () => {
  it.each([
    [undefined, 0],
    [0, 0],
    [-2, 0],
    [1, 0],
    [2, 1],
    [6, 5],
    [2.9, 1],
  ])('advances %s to %s', (remaining, expected) => {
    expect(advanceEmpShutdownTurns(remaining)).toBe(expected);
  });
});

describe('EMP startup gate', () => {
  it.each([1, 6])(
    'blocks startup with %s EMP rounds left',
    (empShutdownTurns) => {
      expect(
        canAttemptHeatStartup({ shutdown: true, empShutdownTurns }, 0),
      ).toBe(false);
    },
  );
});
