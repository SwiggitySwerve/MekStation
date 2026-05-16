/**
 * AerospacePreviewTab — regression gate (Task 4.1) + builder wiring (Task 4.2).
 *
 * Asserts mounting the Preview tab inside the AEROSPACE store context does NOT
 * throw the shipped "useUnitStore must be used within a UnitStoreProvider"
 * crash, and that the aerospace unit-object dispatches to the 'aerospace'
 * record-sheet kind.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/customizer-tabs/spec.md
 *        Requirement: Preview Tab — Scenario: Preview tab opens without crashing
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/multi-unit-tabs/spec.md
 *        Requirement: Per-Type Preview Wiring
 */

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
  createNewAerospaceStore,
  AerospaceStoreContext,
} from '@/stores/useAerospaceStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { AerospacePreviewTab } from '../AerospacePreviewTab';
import { buildAerospaceUnitObject } from '../buildAerospaceUnitObject';

function makeAerospaceStore() {
  return createNewAerospaceStore({
    name: 'Test Fighter',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
}

describe('AerospacePreviewTab — non-mech crash regression gate', () => {
  it('mounts inside the aerospace store context without throwing', () => {
    const store = makeAerospaceStore();
    expect(() =>
      render(
        <AerospaceStoreContext.Provider value={store}>
          <AerospacePreviewTab />
        </AerospaceStoreContext.Provider>,
      ),
    ).not.toThrow();
  });

  it('PreviewTabForType routes AEROSPACE to the aerospace preview without throwing', () => {
    const store = makeAerospaceStore();
    expect(() =>
      render(
        <AerospaceStoreContext.Provider value={store}>
          <PreviewTabForType unitType={UnitType.AEROSPACE} />
        </AerospaceStoreContext.Provider>,
      ),
    ).not.toThrow();
  });
});

describe('buildAerospaceUnitObject — record-sheet dispatch wiring', () => {
  it('builds an object that dispatches to the aerospace kind', () => {
    const store = makeAerospaceStore();
    const s = store.getState();
    const unitObject = buildAerospaceUnitObject({
      id: s.id,
      name: s.name,
      chassis: s.chassis,
      model: s.model,
      tonnage: s.tonnage,
      techBase: s.techBase,
      rulesLevel: s.rulesLevel,
      year: s.year,
      unitType: s.unitType,
      structuralIntegrity: s.structuralIntegrity,
      fuelPoints: s.fuelPoints,
      safeThrust: s.safeThrust,
      maxThrust: s.maxThrust,
      heatSinks: s.heatSinks,
      doubleHeatSinks: s.doubleHeatSinks,
      armorType: s.armorType,
      armorAllocation: s.armorAllocation,
      hasBombBay: s.hasBombBay,
      bombCapacity: s.bombCapacity,
      equipment: s.equipment,
    });

    expect(getRecordSheetDispatchKind(unitObject)).toBe('aerospace');
    expect(dispatchTargetFromUnit(unitObject).kind).toBe('aerospace');
    expect(() => getRecordSheetService().extractData(unitObject)).not.toThrow();
  });
});
