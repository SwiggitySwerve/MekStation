/**
 * Vehicle engine weight lookup.
 */

import { EngineType } from '@/types/construction/EngineType';

import { computeVehicleEngineWeight } from '../engine';

describe('computeVehicleEngineWeight', () => {
  it('looks up a rating that is not a multiple of 5 at the next multiple of 5', () => {
    // 52 t at cruise 3 = 156, treated as 160
    expect(computeVehicleEngineWeight(156, EngineType.STANDARD)).toBe(
      computeVehicleEngineWeight(160, EngineType.STANDARD),
    );
    expect(computeVehicleEngineWeight(156, EngineType.STANDARD)).toBe(6);
  });

  it('looks up ratings below 10 at 10', () => {
    expect(computeVehicleEngineWeight(7, EngineType.STANDARD)).toBe(0.5);
  });

  it('leaves a rating that is already a multiple of 5 alone', () => {
    expect(computeVehicleEngineWeight(200, EngineType.STANDARD)).toBe(8.5);
  });
});
