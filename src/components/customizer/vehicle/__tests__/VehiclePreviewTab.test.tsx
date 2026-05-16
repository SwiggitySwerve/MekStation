/**
 * VehiclePreviewTab — regression gate (Task 4.1) + builder wiring (Task 4.2).
 *
 * The shipped bug: opening the Preview tab in a non-mech customizer threw
 * "useUnitStore must be used within a UnitStoreProvider". These tests assert
 * the inverse — mounting the Preview tab inside the VEHICLE store context does
 * NOT throw — and that the vehicle unit-object dispatches to the 'vehicle'
 * record-sheet kind.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/customizer-tabs/spec.md
 *        Requirement: Preview Tab — Scenario: Preview tab opens without crashing
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/multi-unit-tabs/spec.md
 *        Requirement: Per-Type Preview Wiring
 */

// PreviewTabForType transitively pulls the mech PreviewTab → jspdf (ESM-only).
// Stub jspdf so jest can resolve the import chain.
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  })),
}));

import { render } from '@testing-library/react';
import React from 'react';

import { PreviewTabForType } from '@/components/customizer/tabs/PreviewTabForType';
import {
  dispatchTargetFromUnit,
  getRecordSheetDispatchKind,
} from '@/services/printing/recordsheet/dispatchTarget';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import {
  createNewVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { buildVehicleUnitObject } from '../buildVehicleUnitObject';
import { VehiclePreviewTab } from '../VehiclePreviewTab';

function makeVehicleStore() {
  return createNewVehicleStore({
    name: 'Test Tank',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
}

describe('VehiclePreviewTab — non-mech crash regression gate', () => {
  it('mounts inside the vehicle store context without throwing', () => {
    const store = makeVehicleStore();
    expect(() =>
      render(
        <VehicleStoreContext.Provider value={store}>
          <VehiclePreviewTab />
        </VehicleStoreContext.Provider>,
      ),
    ).not.toThrow();
  });

  it('PreviewTabForType routes VEHICLE to the vehicle preview without throwing', () => {
    const store = makeVehicleStore();
    expect(() =>
      render(
        <VehicleStoreContext.Provider value={store}>
          <PreviewTabForType unitType={UnitType.VEHICLE} />
        </VehicleStoreContext.Provider>,
      ),
    ).not.toThrow();
  });
});

describe('buildVehicleUnitObject — record-sheet dispatch wiring', () => {
  it('builds an object that dispatches to the vehicle kind', () => {
    const store = makeVehicleStore();
    const s = store.getState();
    const unitObject = buildVehicleUnitObject({
      id: s.id,
      name: s.name,
      chassis: s.chassis,
      model: s.model,
      tonnage: s.tonnage,
      techBase: s.techBase,
      rulesLevel: s.rulesLevel,
      year: s.year,
      unitType: s.unitType,
      motionType: s.motionType,
      cruiseMP: s.cruiseMP,
      flankMP: s.flankMP,
      armorType: s.armorType,
      armorAllocation: s.armorAllocation,
      barRating: s.barRating,
      equipment: s.equipment,
    });

    expect(getRecordSheetDispatchKind(unitObject)).toBe('vehicle');
    expect(dispatchTargetFromUnit(unitObject).kind).toBe('vehicle');
    expect(() => getRecordSheetService().extractData(unitObject)).not.toThrow();
  });
});
