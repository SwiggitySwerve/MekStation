/**
 * InfantryPreviewTab — regression gate (Task 4.1) + builder wiring (Task 4.2).
 *
 * Asserts mounting the Preview tab inside the INFANTRY store context does NOT
 * throw the shipped "useUnitStore must be used within a UnitStoreProvider"
 * crash, and that the infantry unit-object dispatches to the 'infantry'
 * record-sheet kind.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 *        Requirement: Preview Tab — Scenario: Preview tab opens without crashing
 * @spec openspec/specs/multi-unit-tabs/spec.md
 *        Requirement: Per-Type Preview Wiring
 */

jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  })),
}));

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { PaperSize } from '@/types/printing';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { buildInfantryUnitObject } from '../buildInfantryUnitObject';
import { InfantryPreviewTab } from '../InfantryPreviewTab';
import { InfantryRecordSheetPreview } from '../InfantryRecordSheetPreview';

function makeInfantryStore() {
  return createNewInfantryStore({ chassis: 'Test Platoon' });
}

type PendingInfantryRender = {
  canvas: HTMLCanvasElement;
  sequence: number;
  resolve: () => void;
};

const pendingInfantryRenders: PendingInfantryRender[] = [];

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

  it('exposes the shared record-sheet zoom controls', async () => {
    const store = makeInfantryStore();

    render(
      <InfantryStoreContext.Provider value={store}>
        <InfantryPreviewTab />
      </InfantryStoreContext.Provider>,
    );

    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Zoom out' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Zoom options' }));
    expect(
      screen.getByRole('menuitemradio', { name: 'Fit Width' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemradio', { name: 'Fit Page' }),
    ).toBeInTheDocument();
  });
});

describe('InfantryRecordSheetPreview — latest render wins', () => {
  afterEach(() => {
    pendingInfantryRenders.length = 0;
    jest.restoreAllMocks();
  });

  it('does not let an older async render overwrite the current unit', async () => {
    const service = getRecordSheetService();
    jest.spyOn(service, 'renderPreview').mockImplementation(
      async (canvas) =>
        new Promise<void>((resolve) => {
          const sequence = pendingInfantryRenders.length;
          pendingInfantryRenders.push({
            canvas,
            sequence,
            resolve: () => {
              canvas.width = sequence === 0 ? 111 : 222;
              canvas.height = 50;
              resolve();
            },
          });
        }),
    );

    const firstStore = makeInfantryStore();
    const secondStore = createNewInfantryStore({ chassis: 'Current Platoon' });
    const { rerender } = render(
      <InfantryStoreContext.Provider value={firstStore}>
        <InfantryRecordSheetPreview />
      </InfantryStoreContext.Provider>,
    );

    await waitFor(() => expect(pendingInfantryRenders).toHaveLength(1));
    rerender(
      <InfantryStoreContext.Provider value={secondStore}>
        <InfantryRecordSheetPreview />
      </InfantryStoreContext.Provider>,
    );
    await waitFor(() => expect(pendingInfantryRenders).toHaveLength(2));

    await act(async () => {
      pendingInfantryRenders[1]?.resolve();
    });
    await act(async () => {
      pendingInfantryRenders[0]?.resolve();
    });

    expect(screen.getByTestId('infantry-record-sheet-canvas')).toHaveProperty(
      'width',
      222,
    );
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

describe('InfantryPreviewTab print reservation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prints through printRecordSheet after synchronous extractData', async () => {
    const user = userEvent.setup();
    const service = getRecordSheetService();
    const originalExtractData = service.extractData.bind(service);
    const order: string[] = [];
    const extractedForPrint: unknown[] = [];

    jest.spyOn(service, 'extractData').mockImplementation((unit, abilities) => {
      const data = originalExtractData(unit, abilities);
      order.push('extractData');
      extractedForPrint.push(data);
      return data;
    });
    const printRecordSheet = jest
      .spyOn(service, 'printRecordSheet')
      .mockImplementation(async () => {
        order.push('printRecordSheet');
      });
    const renderPreview = jest
      .spyOn(service, 'renderPreview')
      .mockResolvedValue(undefined);
    const print = jest.spyOn(service, 'print').mockImplementation(() => {
      order.push('print');
    });

    const store = makeInfantryStore();
    render(
      <InfantryStoreContext.Provider value={store}>
        <InfantryPreviewTab />
      </InfantryStoreContext.Provider>,
    );

    order.length = 0;
    extractedForPrint.length = 0;
    renderPreview.mockClear();
    print.mockClear();
    printRecordSheet.mockClear();

    const createElement = jest.spyOn(document, 'createElement');
    await user.click(screen.getByRole('button', { name: 'Print' }));

    expect(order).toEqual(['extractData', 'printRecordSheet']);
    expect(printRecordSheet).toHaveBeenCalledTimes(1);
    expect(printRecordSheet).toHaveBeenCalledWith(
      extractedForPrint[0],
      PaperSize.LETTER,
    );
    expect(extractedForPrint[0]).toEqual(
      expect.objectContaining({
        unitType: 'infantry',
        specialAbilities: undefined,
      }),
    );
    expect(renderPreview).not.toHaveBeenCalled();
    expect(print).not.toHaveBeenCalled();
    expect(
      createElement.mock.calls.some((call) => String(call[0]) === 'canvas'),
    ).toBe(false);
  });
});
