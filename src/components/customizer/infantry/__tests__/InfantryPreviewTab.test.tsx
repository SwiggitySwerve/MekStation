/**
 * InfantryPreviewTab — regression gate (Task 4.1) + builder wiring (Task 4.2).
 *
 * Asserts mounting the Preview tab inside the INFANTRY store context does NOT
 * throw the shipped "useUnitStore must be used within a UnitStoreProvider"
 * crash, and that the infantry unit-object dispatches to the 'infantry'
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
  createNewInfantryStore,
  InfantryStoreContext,
} from '@/stores/useInfantryStore';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { buildInfantryUnitObject } from '../buildInfantryUnitObject';
import { InfantryPreviewTab } from '../InfantryPreviewTab';

function makeInfantryStore() {
  return createNewInfantryStore({ chassis: 'Test Platoon' });
}

describe('InfantryPreviewTab — non-mech crash regression gate', () => {
  it('mounts inside the infantry store context without throwing', () => {
    const store = makeInfantryStore();
    expect(() =>
      render(
        <InfantryStoreContext.Provider value={store}>
          <InfantryPreviewTab />
        </InfantryStoreContext.Provider>,
      ),
    ).not.toThrow();
  });

  it('PreviewTabForType routes INFANTRY to the infantry preview without throwing', () => {
    const store = makeInfantryStore();
    expect(() =>
      render(
        <InfantryStoreContext.Provider value={store}>
          <PreviewTabForType unitType={UnitType.INFANTRY} />
        </InfantryStoreContext.Provider>,
      ),
    ).not.toThrow();
  });
});

describe('buildInfantryUnitObject — record-sheet dispatch wiring', () => {
  it('builds an object that dispatches to the infantry kind', () => {
    const store = makeInfantryStore();
    const s = store.getState();
    const unitObject = buildInfantryUnitObject({
      id: s.id,
      name: s.name,
      chassis: s.chassis,
      model: s.model,
      techBase: s.techBase,
      rulesLevel: s.rulesLevel,
      year: s.year,
      platoonComposition: s.platoonComposition,
      infantryMotive: s.infantryMotive,
      armorKit: s.armorKit,
      primaryWeapon: s.primaryWeapon,
      primaryWeaponId: s.primaryWeaponId,
      secondaryWeapon: s.secondaryWeapon,
      secondaryWeaponId: s.secondaryWeaponId,
      secondaryWeaponCount: s.secondaryWeaponCount,
      fieldGuns: s.fieldGuns,
      specialization: s.specialization,
      hasAntiMechTraining: s.hasAntiMechTraining,
    });

    expect(getRecordSheetDispatchKind(unitObject)).toBe('infantry');
    expect(dispatchTargetFromUnit(unitObject).kind).toBe('infantry');
    expect(() => getRecordSheetService().extractData(unitObject)).not.toThrow();
  });
});
