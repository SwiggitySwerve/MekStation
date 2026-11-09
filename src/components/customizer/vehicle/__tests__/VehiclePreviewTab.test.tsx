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

import { act, render, renderHook } from '@testing-library/react';
import React from 'react';

import { PreviewTabForType } from '@/components/customizer/tabs/PreviewTabForType';
import { extractVehicleData } from '@/services/printing/recordsheet/dataExtractors.vehicle';
import {
  dispatchTargetFromUnit,
  getRecordSheetDispatchKind,
} from '@/services/printing/recordsheet/dispatchTarget';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import {
  createNewVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { buildVehicleUnitObject } from '../buildVehicleUnitObject';
import { useVehicleRecordSheetUnit } from '../useVehicleRecordSheetUnit';
import { VehiclePreviewTab } from '../VehiclePreviewTab';

function makeVehicleStore() {
  return createNewVehicleStore({
    name: 'Test Tank',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
}

describe('useVehicleRecordSheetUnit', () => {
  const turret = {
    type: TurretType.SINGLE,

    rotationArc: 360,
  };

  it('preserves unequal primary and secondary armor as distinct installed locations', () => {
    const store = makeVehicleStore();
    store.setState({
      turret: { ...turret, type: TurretType.DUAL },
      secondaryTurret: turret,
      armorAllocation: {
        ...store.getState().armorAllocation,
        Turret: 7,
        'Turret 2': 19,
      },
    });
    const unit = buildVehicleUnitObject(store.getState());
    expect(unit.turretConfig).toBe('Dual');
    expect(unit.armorAllocation?.Turret.current).toBe(7);
    expect(unit.armorAllocation?.['Turret 2'].current).toBe(19);
    expect(
      extractVehicleData(unit).armorLocations.filter((a) =>
        a.location.startsWith('Turret'),
      ),
    ).toEqual([
      { location: 'Turret', current: 7, maximum: undefined, bar: undefined },
      { location: 'Turret 2', current: 19, maximum: undefined, bar: undefined },
    ]);
  });

  it('does not let a secondary zero overwrite a single primary turret', () => {
    const store = makeVehicleStore();
    store.setState({
      turret,
      armorAllocation: { ...store.getState().armorAllocation, Turret: 12 },
    });
    const unit = buildVehicleUnitObject(store.getState());
    expect(unit.armorAllocation?.Turret.current).toBe(12);
    expect(extractVehicleData(unit)).toMatchObject({
      turretConfig: 'Single',
      armorLocations: expect.arrayContaining([
        expect.objectContaining({ location: 'Turret', current: 12 }),
      ]),
    });
  });

  it('uses installed configurations even at zero armor and excludes stale absent armor', () => {
    const store = makeVehicleStore();
    expect(buildVehicleUnitObject(store.getState()).turretConfig).toBe('None');
    store.setState({
      turret,
      armorAllocation: { ...store.getState().armorAllocation, 'Turret 2': 99 },
    });
    const data = extractVehicleData(buildVehicleUnitObject(store.getState()));
    expect(data.turretConfig).toBe('Single');
    expect(data.armorLocations).toContainEqual({
      location: 'Turret',
      current: 0,
      maximum: undefined,
      bar: undefined,
    });
    expect(data.armorLocations.some((a) => a.location === 'Turret 2')).toBe(
      false,
    );
  });

  it('reacts when only a turret configuration changes, then reflects removal', () => {
    const store = makeVehicleStore();
    store.setState({ turret });
    const { result } = renderHook(() => useVehicleRecordSheetUnit(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <VehicleStoreContext.Provider value={store}>
          {children}
        </VehicleStoreContext.Provider>
      ),
    });
    expect(result.current.turretConfig).toBe('Single');
    const before = result.current;
    act(() => store.setState({ secondaryTurret: turret }));
    expect(result.current).not.toBe(before);
    expect(result.current.turretConfig).toBe('Dual');
    act(() => store.getState().setTurretType(TurretType.NONE));
    expect(extractVehicleData(result.current).turretConfig).toBe('None');
    expect(
      extractVehicleData(result.current).armorLocations.some((a) =>
        a.location.startsWith('Turret'),
      ),
    ).toBe(false);
  });

  it('projects actual installed configurations without inventing a missing turret', () => {
    const store = makeVehicleStore();
    store.setState({
      turret: { ...turret, type: TurretType.DUAL },
      secondaryTurret: null,
    });
    expect(buildVehicleUnitObject(store.getState()).turretConfig).toBe(
      'Single',
    );
    store.setState({ turret: null, secondaryTurret: turret });
    expect(buildVehicleUnitObject(store.getState()).turretConfig).toBe('None');
  });

  it('updates the projection for changed store fields and preserves it for unrelated state', () => {
    const store = makeVehicleStore();
    const { result, rerender } = renderHook(() => useVehicleRecordSheetUnit(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <VehicleStoreContext.Provider value={store}>
          {children}
        </VehicleStoreContext.Provider>
      ),
    });
    const initialUnit = result.current;

    act(() => store.setState({ isModified: !store.getState().isModified }));
    rerender();
    expect(result.current).toBe(initialUnit);

    act(() =>
      store.setState({
        name: 'Updated Tank',
        cruiseMP: 7,
        armorAllocation: {
          ...store.getState().armorAllocation,
          [VehicleLocation.FRONT]: 42,
        },
      }),
    );

    expect(result.current).not.toBe(initialUnit);
    expect(result.current).toMatchObject({
      name: 'Updated Tank',
      cruiseMP: 7,
      armorAllocation: { Front: { current: 42 } },
    });
    expect(getRecordSheetDispatchKind(result.current)).toBe('vehicle');
  });
});

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
      turret: s.turret,
      secondaryTurret: s.secondaryTurret,
    });

    expect(getRecordSheetDispatchKind(unitObject)).toBe('vehicle');
    expect(dispatchTargetFromUnit(unitObject).kind).toBe('vehicle');
    expect(() => getRecordSheetService().extractData(unitObject)).not.toThrow();
  });
});
