/**
 * ProtoMechPreviewTab — regression gate (Task 4.1) + builder wiring (Task 4.2).
 *
 * Asserts mounting the Preview tab inside the PROTOMECH store context does NOT
 * throw the shipped "useUnitStore must be used within a UnitStoreProvider"
 * crash, and that the protomech unit-object dispatches to the 'protomech'
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
  createNewProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { buildProtoMechUnitObject } from '../buildProtoMechUnitObject';
import { ProtoMechPreviewTab } from '../ProtoMechPreviewTab';

function makeProtoMechStore() {
  return createNewProtoMechStore({ chassis: 'Test Proto', tonnage: 5 });
}

describe('ProtoMechPreviewTab — non-mech crash regression gate', () => {
  it('mounts inside the protomech store context without throwing', () => {
    const store = makeProtoMechStore();
    expect(() =>
      render(
        <ProtoMechStoreContext.Provider value={store}>
          <ProtoMechPreviewTab />
        </ProtoMechStoreContext.Provider>,
      ),
    ).not.toThrow();
  });

  it('PreviewTabForType routes PROTOMECH to the protomech preview without throwing', () => {
    const store = makeProtoMechStore();
    expect(() =>
      render(
        <ProtoMechStoreContext.Provider value={store}>
          <PreviewTabForType unitType={UnitType.PROTOMECH} />
        </ProtoMechStoreContext.Provider>,
      ),
    ).not.toThrow();
  });
});

describe('buildProtoMechUnitObject — record-sheet dispatch wiring', () => {
  it('builds an object that dispatches to the protomech kind', () => {
    const store = makeProtoMechStore();
    const s = store.getState();
    const unitObject = buildProtoMechUnitObject({
      id: s.id,
      name: s.name,
      chassis: s.chassis,
      model: s.model,
      tonnage: s.tonnage,
      techBase: s.techBase,
      rulesLevel: s.rulesLevel,
      year: s.year,
      pointSize: s.pointSize,
      armorByLocation: s.armorByLocation,
      mainGunWeaponId: s.mainGunWeaponId,
      walkMP: s.walkMP,
      jumpMP: s.jumpMP,
      glidingWings: s.glidingWings,
    });

    expect(getRecordSheetDispatchKind(unitObject)).toBe('protomech');
    expect(dispatchTargetFromUnit(unitObject).kind).toBe('protomech');
    expect(() => getRecordSheetService().extractData(unitObject)).not.toThrow();
  });
});
