/**
 * Vehicle heat-model tests.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/tasks.md §10
 */

import { EngineType } from '@/types/construction/EngineType';

import { getVehicleHeatModel } from '../vehicleHeatModel';

describe('vehicleHeatModel', () => {
  it('ICE → no heat track', () => {
    const m = getVehicleHeatModel(EngineType.ICE);
    expect(m.hasHeatTrack).toBe(false);
    expect(m.shutdownCap).toBeUndefined();
  });

  it('Fuel Cell → no heat track', () => {
    const m = getVehicleHeatModel(EngineType.FUEL_CELL);
    expect(m.hasHeatTrack).toBe(false);
  });

  it('Standard fusion → heat track with shutdown cap 6', () => {
    const m = getVehicleHeatModel(EngineType.STANDARD);
    expect(m.hasHeatTrack).toBe(true);
    expect(m.shutdownCap).toBe(6);
  });

  it('XL fusion (IS/Clan) → heat track with cap 6', () => {
    expect(getVehicleHeatModel(EngineType.XL_IS).hasHeatTrack).toBe(true);
    expect(getVehicleHeatModel(EngineType.XL_CLAN).shutdownCap).toBe(6);
  });

  it('Light / XXL / Compact / Fission → heat track with cap 6', () => {
    expect(getVehicleHeatModel(EngineType.LIGHT).hasHeatTrack).toBe(true);
    expect(getVehicleHeatModel(EngineType.XXL).shutdownCap).toBe(6);
    expect(getVehicleHeatModel(EngineType.COMPACT).hasHeatTrack).toBe(true);
    expect(getVehicleHeatModel(EngineType.FISSION).shutdownCap).toBe(6);
  });

  it('unknown engine type → no heat track by default', () => {
    const m = getVehicleHeatModel('UNKNOWN_ENGINE' as unknown as EngineType);
    expect(m.hasHeatTrack).toBe(false);
  });
});
