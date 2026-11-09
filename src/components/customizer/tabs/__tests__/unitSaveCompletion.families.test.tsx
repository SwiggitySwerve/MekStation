import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';

import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import {
  getEditorDraftFingerprint,
  getEditorLibraryFingerprint,
} from '@/stores/unitSaveStateAdapters';
import { VehicleLocation } from '@/types/construction/UnitLocation';

import { getCustomizerDraftStorageKey } from '../../shared/customizerDraftStorage';
import { UnitSaveDetails } from '../../shared/UnitSaveSummary';
import {
  serializeCustomLibraryState,
  useDialogHandlers,
} from '../useMultiUnitTabsController.dialogs';
import {
  clearSaveFamilies,
  SAVE_TEST_ID,
  saveFamilies,
} from './saveStateFamilies.test-support';

const showToast = jest.fn();
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast }),
}));
jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: { create: jest.fn(), save: jest.fn() },
}));
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  clearSaveFamilies();
});
afterEach(() => {
  jest.restoreAllMocks();
  clearSaveFamilies();
});

describe.each(saveFamilies)(
  '$family save completion',
  ({ setup, unitType }) => {
    function start(closeAfterSave = true) {
      const session = setup();
      session.store.setState({ isModified: true });
      const close = jest.fn();
      const rename = jest.fn();
      const tab = {
        id: SAVE_TEST_ID,
        unitType,
        name: 'Before',
        tonnage: 50,
        techBase: session.store.getState().techBase,
      };
      let open = true;
      const { result } = renderHook(() =>
        useDialogHandlers(close, rename, () => (open ? tab : undefined)),
      );
      act(() => {
        if (closeAfterSave)
          result.current.openCloseDialog(SAVE_TEST_ID, 'Before');
        else result.current.openSaveDialog(SAVE_TEST_ID);
      });
      if (closeAfterSave) act(() => result.current.handleCloseDialogSave());
      let finish!: (
        value: Awaited<ReturnType<typeof customUnitApiService.create>>,
      ) => void;
      jest.mocked(customUnitApiService.create).mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      let pending!: Promise<void>;
      act(() => {
        pending = result.current.handleSaveDialogSave('Saved', 'ONE');
      });
      return {
        ...session,
        close,
        rename,
        result,
        removeTab: () => {
          open = false;
        },
        finish: async (
          value = { success: true, id: 'library-unit', version: 3 },
        ) => {
          await act(async () => {
            finish(value);
            await pending;
          });
        },
      };
    }

    it.each(['no-op', 'timestamp'] as const)(
      'records the receipt and completes save-and-close after a deferred %s update',
      async (change) => {
        const session = start();
        // The facade serializer stays available to MultiUnitTabs and native readiness checks.
        expect(
          serializeCustomLibraryState(session.store.getState()),
        ).toBeDefined();
        act(() =>
          session.store.setState(
            change === 'no-op' ? {} : { lastModifiedAt: 123 },
          ),
        );
        await session.finish();
        const state = session.store.getState();
        expect(state).toMatchObject({
          chassis: 'Saved',
          model: 'ONE',
          name: 'Saved ONE',
          isModified: false,
          librarySave: { id: 'library-unit', version: 3 },
        });
        expect(state.librarySave?.draftFingerprint).toBe(
          getEditorDraftFingerprint(session.editor()),
        );
        expect(state.librarySave?.fingerprint).toBe(
          getEditorLibraryFingerprint(session.editor()),
        );
        expect(session.rename).toHaveBeenCalledWith(SAVE_TEST_ID, 'Saved ONE');
        expect(session.close).toHaveBeenCalledWith(SAVE_TEST_ID);
      },
    );

    it('retains real nested edits and the submitted receipt without renaming or closing', async () => {
      const session = start();
      act(session.editNested);
      const edited = getEditorDraftFingerprint(session.editor());
      await session.finish();
      expect(getEditorDraftFingerprint(session.editor())).toBe(edited);
      expect(session.store.getState().isModified).toBe(true);
      expect(session.store.getState().librarySave).toMatchObject({
        id: 'library-unit',
        version: 3,
      });
      expect(session.store.getState().librarySave?.draftFingerprint).not.toBe(
        edited,
      );
      expect(session.rename).not.toHaveBeenCalled();
      expect(session.close).not.toHaveBeenCalled();
    });

    it.each(['rename', 'toast'] as const)(
      'rechecks saved content before closing when the %s callback edits the draft',
      async (callback) => {
        const session = start();
        const onComplete = callback === 'rename' ? session.rename : showToast;
        onComplete.mockImplementationOnce(() => {
          session.editNested();
          session.store.setState({ isModified: true });
        });
        await session.finish();
        expect(session.store.getState().isModified).toBe(true);
        expect(session.store.getState().librarySave).toMatchObject({
          id: 'library-unit',
          version: 3,
        });
        expect(session.close).not.toHaveBeenCalled();
      },
    );

    if (unitType === saveFamilies[1].unitType) {
      it('pins submitted content even if a nested object changes in place while the API is pending', async () => {
        const session = start();
        const editor = session.editor();
        if (editor.store !== 'vehicle') throw new Error('Expected a vehicle');
        editor.state.armorAllocation[VehicleLocation.FRONT] = 2;
        await session.finish();
        expect(customUnitApiService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            armor: expect.objectContaining({
              byLocation: expect.objectContaining({ FRONT: 0 }),
            }),
          }),
          'Saved',
          'ONE',
        );
        expect(session.store.getState().isModified).toBe(true);
        expect(session.store.getState().librarySave?.draftFingerprint).not.toBe(
          getEditorDraftFingerprint(session.editor()),
        );
        expect(session.close).not.toHaveBeenCalled();
        expect(session.rename).not.toHaveBeenCalled();
      });
    }

    it('does not write to a replaced store or complete its close', async () => {
      const session = start();
      const original = session.store.getState();
      const replacement = setup();
      const before = replacement.store.getState();
      await session.finish();
      expect(session.store.getState()).toBe(original);
      expect(replacement.store.getState()).toBe(before);
      expect(session.rename).not.toHaveBeenCalled();
      expect(session.close).not.toHaveBeenCalled();
    });

    it('does not write completion metadata after its tab disappears', async () => {
      const session = start();
      const before = session.store.getState();
      session.removeTab();
      await session.finish();
      expect(session.store.getState()).toBe(before);
      expect(session.rename).not.toHaveBeenCalled();
      expect(session.close).not.toHaveBeenCalled();
    });

    it('keeps a failed browser draft visible after library success and Retry writes without another API call', async () => {
      const session = start();
      render(<UnitSaveDetails unitId={SAVE_TEST_ID} unitType={unitType} />);
      const failure = jest
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Full');
        });
      await session.finish();
      expect(session.close).not.toHaveBeenCalled();
      expect(session.store.getState().librarySave).toMatchObject({
        id: 'library-unit',
        version: 3,
      });
      expect(
        screen.getByRole('button', { name: 'Retry Browser Draft' }),
      ).toBeVisible();
      failure.mockRestore();
      fireEvent.click(
        screen.getByRole('button', { name: 'Retry Browser Draft' }),
      );
      expect(screen.getByTestId('unit-save-details')).toHaveTextContent(
        'In Library v3',
      );
      expect(
        screen.queryByRole('button', { name: 'Retry Browser Draft' }),
      ).not.toBeInTheDocument();
      const stored = JSON.parse(
        localStorage.getItem(
          getCustomizerDraftStorageKey({ unitId: SAVE_TEST_ID, unitType }),
        ) ?? '{}',
      );
      expect(stored.state.librarySave).toMatchObject({
        id: 'library-unit',
        version: 3,
      });
      expect(customUnitApiService.create).toHaveBeenCalledTimes(1);
    });
  },
);

it.each([
  null,
  { success: 'true', id: 'saved', version: 1 },
  { success: true, id: 123, version: 1 },
  { success: true, id: 'saved', version: '1' },
  { success: false, error: 'offline' },
  { success: true },
  { success: true, id: '', version: 1 },
  { success: true, id: '   ', version: 1 },
  { success: true, id: 'saved', version: 0 },
  { success: true, id: 'saved', version: -1 },
  { success: true, id: 'saved', version: 1.5 },
  { success: true, id: 'saved', version: Number.MAX_SAFE_INTEGER + 1 },
  { success: true, id: 'saved', version: NaN },
])('does not fabricate completion for response %j', async (response) => {
  const { store } = saveFamilies[1].setup();
  store.setState({ isModified: true });
  const before = store.getState();
  const close = jest.fn();
  const rename = jest.fn();
  const { result } = renderHook(() =>
    useDialogHandlers(close, rename, () => ({
      id: SAVE_TEST_ID,
      unitType: saveFamilies[1].unitType,
      name: 'Before',
      tonnage: 50,
      techBase: before.techBase,
    })),
  );
  // Inject malformed runtime responses at the typed HTTP-service boundary.
  jest
    .mocked(customUnitApiService.create)
    .mockResolvedValue(
      response as Awaited<ReturnType<typeof customUnitApiService.create>>,
    );
  act(() => result.current.openCloseDialog(SAVE_TEST_ID, 'Before'));
  act(() => result.current.handleCloseDialogSave());
  await act(async () => {
    await result.current.handleSaveDialogSave('Saved', 'ONE');
  });
  expect(store.getState()).toBe(before);
  expect(result.current.saveDialog.isOpen).toBe(true);
  expect(close).not.toHaveBeenCalled();
  expect(rename).not.toHaveBeenCalled();
});
