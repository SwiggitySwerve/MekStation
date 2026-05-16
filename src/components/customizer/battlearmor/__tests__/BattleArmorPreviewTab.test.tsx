/**
 * BattleArmorPreviewTab — regression gate (Task 4.1) + builder wiring (Task 4.2).
 *
 * Asserts mounting the Preview tab inside the BATTLE_ARMOR store context does
 * NOT throw the shipped "useUnitStore must be used within a UnitStoreProvider"
 * crash, and that the battle armor unit-object dispatches to the 'battlearmor'
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
  createNewBattleArmorStore,
  BattleArmorStoreContext,
} from '@/stores/useBattleArmorStore';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { BattleArmorPreviewTab } from '../BattleArmorPreviewTab';
import { buildBattleArmorUnitObject } from '../buildBattleArmorUnitObject';

function makeBattleArmorStore() {
  return createNewBattleArmorStore({ chassis: 'Test BA', squadSize: 4 });
}

describe('BattleArmorPreviewTab — non-mech crash regression gate', () => {
  it('mounts inside the battle armor store context without throwing', () => {
    const store = makeBattleArmorStore();
    expect(() =>
      render(
        <BattleArmorStoreContext.Provider value={store}>
          <BattleArmorPreviewTab />
        </BattleArmorStoreContext.Provider>,
      ),
    ).not.toThrow();
  });

  it('PreviewTabForType routes BATTLE_ARMOR to the battle armor preview without throwing', () => {
    const store = makeBattleArmorStore();
    expect(() =>
      render(
        <BattleArmorStoreContext.Provider value={store}>
          <PreviewTabForType unitType={UnitType.BATTLE_ARMOR} />
        </BattleArmorStoreContext.Provider>,
      ),
    ).not.toThrow();
  });
});

describe('buildBattleArmorUnitObject — record-sheet dispatch wiring', () => {
  it('builds an object that dispatches to the battlearmor kind', () => {
    const store = makeBattleArmorStore();
    const s = store.getState();
    const unitObject = buildBattleArmorUnitObject({
      id: s.id,
      name: s.name,
      chassis: s.chassis,
      model: s.model,
      techBase: s.techBase,
      rulesLevel: s.rulesLevel,
      year: s.year,
      squadSize: s.squadSize,
      armorPerTrooper: s.armorPerTrooper,
      leftManipulator: s.leftManipulator,
      rightManipulator: s.rightManipulator,
      groundMP: s.groundMP,
      jumpMP: s.jumpMP,
      umuMP: s.umuMP,
    });

    expect(getRecordSheetDispatchKind(unitObject)).toBe('battlearmor');
    expect(dispatchTargetFromUnit(unitObject).kind).toBe('battlearmor');
    expect(() => getRecordSheetService().extractData(unitObject)).not.toThrow();
  });
});
